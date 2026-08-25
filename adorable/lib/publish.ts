import { randomUUID } from "crypto";
import type { Vm } from "freestyle";
import { freestyle } from "./freestyle";
import {
  addRelease,
  readProjectMetadata,
  setProdVmId,
  updateRelease,
} from "./project-storage";
import { createProdVm, devVm, prodVm, startDevServer } from "./project-vm";
import { VM_PORT, WORKDIR } from "./vars";

const TARBALL = "/tmp/adorable-release.tgz";
const STAGING = "/tmp/adorable-incoming";

/**
 * Everything the app needs and nothing it can rebuild: source and lockfile
 * cross, installed packages and build output do not.
 */
const EXCLUDES = ["node_modules", ".next", ".git", ".env.local"]
  .map((entry) => `--exclude=./${entry}`)
  .join(" ");

/** What decides whether production has to reinstall its dependencies. */
const MANIFEST = "package.json package-lock.json";

const failed = (step: string, detail?: string | null) =>
  `${step} failed${detail?.trim() ? `: ${detail.trim().slice(-500)}` : "."}`;

/**
 * Copy one VM's app source onto the production VM and let its running dev
 * server pick the change up.
 *
 * Production runs the same `npm run dev` the base snapshot was captured with,
 * so there is no build and no restart in the common case: the files are
 * swapped in underneath the live server and it hot-reloads them. The swap uses
 * rsync rather than replacing the directory, because deleting the workdir out
 * from under the server would take its file watcher with it.
 *
 * The source is a parameter because a publish ships the dev VM and a rollback
 * ships a VM booted from an older release's snapshot.
 */
const shipToProduction = async (source: Vm, prodVmId: string) => {
  const prod = prodVm(prodVmId);

  const pack = await source.exec({
    command: `tar czf ${TARBALL} -C ${WORKDIR} ${EXCLUDES} .`,
    timeoutMs: 120_000,
  });
  if (pack.statusCode !== 0) throw new Error(failed("Packaging", pack.stderr));

  await prod.fs.writeFile(TARBALL, await source.fs.readFile(TARBALL));

  // Hash the manifest before and after, so dependencies are only reinstalled
  // when they actually changed.
  const manifestHash = async () =>
    (
      await prod.exec({
        command: `cd ${WORKDIR} && cat ${MANIFEST} 2>/dev/null | sha256sum`,
        timeoutMs: 60_000,
      })
    ).stdout?.trim() ?? "";

  const before = await manifestHash();

  const swap = await prod.exec({
    command:
      `rm -rf ${STAGING} && mkdir -p ${STAGING} && tar xzf ${TARBALL} -C ${STAGING} && ` +
      `rsync -a --delete --exclude=node_modules --exclude=.next ${STAGING}/ ${WORKDIR}/ && ` +
      `rm -rf ${STAGING}`,
    timeoutMs: 120_000,
  });
  if (swap.statusCode !== 0) throw new Error(failed("Unpacking", swap.stderr));

  if ((await manifestHash()) !== before) {
    const install = await prod.exec({
      command: `cd ${WORKDIR} && npm install --no-audit --no-fund`,
      timeoutMs: 300_000,
    });
    if (install.statusCode !== 0) {
      throw new Error(failed("Install", install.stderr || install.stdout));
    }
  }

  // Normally already running, straight from the base snapshot.
  await startDevServer(prod);

  // Not live until it actually serves the new code.
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { stdout } = await prod.exec({
      command: `curl -s -o /dev/null -w '%{http_code}' http://localhost:${VM_PORT}`,
      timeoutMs: 60_000,
    });
    if (stdout?.trim() === "200") return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(failed("Production server never returned 200"));
};

/**
 * Run a release to completion in the background and record how it ended. The
 * build takes minutes, so nothing waits on this: the release is already stored
 * as `publishing` and the client polls the project for the outcome.
 */
const settleRelease = (
  projectId: string,
  releaseId: string,
  work: Promise<void>,
) => {
  void work
    .then(() => updateRelease(projectId, releaseId, { state: "live" }))
    .catch(async (error: unknown) => {
      console.error("Release failed:", error);
      await updateRelease(projectId, releaseId, {
        state: "failed",
        error: error instanceof Error ? error.message : "Publish failed.",
      });
    });
};

/**
 * The project's production VM, created on demand. A project only gets one once
 * it is actually published, so the first publish is what brings it into being
 * and puts the production domain in front of it.
 */
const resolveProdVmId = async (
  projectId: string,
  metadata: { prodVmId: string | null; name: string; productionDomain: string },
) => {
  if (metadata.prodVmId) return metadata.prodVmId;

  const prodVmId = await createProdVm(
    projectId,
    metadata.name,
    metadata.productionDomain,
  );
  await setProdVmId(projectId, prodVmId);
  return prodVmId;
};

/** Build the dev VM's current code onto production, as a new release. */
export const publishProject = async (projectId: string, message: string) => {
  const metadata = await readProjectMetadata(projectId);
  const dev = devVm(projectId);
  const releaseId = randomUUID();

  // Snapshot first: this is what a later rollback restores from.
  const { snapshotId } = await dev.snapshot({
    displayName: `${metadata.name}: ${message}`.slice(0, 200),
  });

  await addRelease(projectId, {
    id: releaseId,
    message,
    createdAt: new Date().toISOString(),
    snapshotId,
    state: "publishing",
    error: null,
  });

  settleRelease(
    projectId,
    releaseId,
    resolveProdVmId(projectId, metadata).then((prodVmId) =>
      shipToProduction(dev, prodVmId),
    ),
  );

  return releaseId;
};

/**
 * Put production back on an earlier release. The release's snapshot holds the
 * exact dev tree it was cut from, so an ephemeral VM booted from that snapshot
 * is the source — it exists only for the copy and deletes itself on stop,
 * leaving the project's own two VMs untouched.
 */
export const rollbackToRelease = async (
  projectId: string,
  releaseId: string,
) => {
  const metadata = await readProjectMetadata(projectId);
  const release = metadata.releases.find((entry) => entry.id === releaseId);
  if (!release) throw new Error("Release not found.");

  await updateRelease(projectId, releaseId, {
    state: "publishing",
    error: null,
  });

  const restore = async () => {
    const prodVmId = await resolveProdVmId(projectId, metadata);
    const { vm: source, vmId } = await freestyle.vms.create({
      snapshotId: release.snapshotId,
      displayName: `${metadata.name} rollback source`,
      persistence: { type: "ephemeral" },
      ttlSeconds: 1800,
      firewall: { rules: [] },
    });

    try {
      await shipToProduction(source, prodVmId);
    } finally {
      await freestyle.vms.delete(vmId).catch(() => {});
    }
  };

  settleRelease(projectId, releaseId, restore());
};
