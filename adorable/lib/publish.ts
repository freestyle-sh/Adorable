import { randomUUID } from "crypto";
import type { Vm } from "freestyle";
import { freestyle } from "./freestyle";
import {
  addRelease,
  readProjectMetadata,
  updateRelease,
} from "./project-storage";
import { devVm, prodVm, startProdServer } from "./project-vm";
import { closeNamedSession } from "./pty-sessions";
import { PROD_SESSION, WORKDIR } from "./vars";

const TARBALL = "/tmp/adorable-release.tgz";

/**
 * Everything the production build needs and nothing it can rebuild: source and
 * lockfile cross, installed packages and build output do not.
 */
const EXCLUDES = ["node_modules", ".next", ".git", ".env.local"]
  .map((entry) => `--exclude=./${entry}`)
  .join(" ");

const failed = (step: string, detail?: string | null) =>
  `${step} failed${detail?.trim() ? `: ${detail.trim().slice(-500)}` : "."}`;

/**
 * Copy one VM's app source onto the production VM, install, build, and restart
 * the production server. The source is a parameter because a publish ships the
 * dev VM and a rollback ships a VM booted from an older release's snapshot.
 */
const shipToProduction = async (source: Vm, prodVmId: string) => {
  const prod = prodVm(prodVmId);

  const pack = await source.exec({
    command: `tar czf ${TARBALL} -C ${WORKDIR} ${EXCLUDES} .`,
    timeoutMs: 120_000,
  });
  if (pack.statusCode !== 0) throw new Error(failed("Packaging", pack.stderr));

  await prod.fs.writeFile(TARBALL, await source.fs.readFile(TARBALL));

  const unpack = await prod.exec({
    command: `rm -rf ${WORKDIR} && mkdir -p ${WORKDIR} && tar xzf ${TARBALL} -C ${WORKDIR}`,
    timeoutMs: 120_000,
  });
  if (unpack.statusCode !== 0) {
    throw new Error(failed("Unpacking", unpack.stderr));
  }

  const install = await prod.exec({
    command: `cd ${WORKDIR} && npm install --no-audit --no-fund`,
    timeoutMs: 300_000,
  });
  if (install.statusCode !== 0) {
    throw new Error(failed("Install", install.stderr || install.stdout));
  }

  const build = await prod.exec({
    command: `cd ${WORKDIR} && npm run build`,
    timeoutMs: 300_000,
  });
  if (build.statusCode !== 0) {
    throw new Error(failed("Build", build.stderr || build.stdout));
  }

  // Replace the running server so it serves the build we just made.
  await closeNamedSession(prod, PROD_SESSION);
  await startProdServer(prod);
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

  settleRelease(projectId, releaseId, shipToProduction(dev, metadata.prodVmId));

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
    const { vm: source, vmId } = await freestyle.vms.create({
      snapshotId: release.snapshotId,
      displayName: `${metadata.name} rollback source`,
      persistence: { type: "ephemeral" },
      ttlSeconds: 1800,
      firewall: { rules: [] },
    });

    try {
      await shipToProduction(source, metadata.prodVmId);
    } finally {
      await freestyle.vms.delete(vmId).catch(() => {});
    }
  };

  settleRelease(projectId, releaseId, restore());
};
