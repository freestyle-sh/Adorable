import { randomUUID } from "crypto";
import type { FirewallSpec, Vm } from "freestyle";
import { freestyle } from "./freestyle";
import { closeNamedSession, ensureNamedSession } from "./pty-sessions";
import {
  ADORABLE_DIR,
  BASE_SNAPSHOT_SLUG,
  DEV_SESSION,
  DOMAIN_SUFFIX,
  META_KIND,
  META_PROJECT,
  META_ROLE,
  PROD_SESSION,
  VM_PORT,
  WORKDIR,
} from "./vars";

/**
 * Every project VM may reach the Internet — npm, git, whatever the app calls.
 * Inbound needs no rule: traffic arriving through a mapped domain is delivered
 * by the platform itself, ahead of the firewall.
 */
const PROJECT_FIREWALL: FirewallSpec = {
  rules: [{ action: "allow", source: {}, destination: { public: true } }],
};

/** A project id is its dev VM's id, so a handle never needs a lookup. */
export const devVm = (projectId: string): Vm => freestyle.vms.ref(projectId);
export const prodVm = (prodVmId: string): Vm => freestyle.vms.ref(prodVmId);

/**
 * Point a domain at a VM's port. This is the only way a VM is reachable from
 * the outside in v5 — `domains` on a VM and serverless deployments are both
 * gone.
 */
export const mapDomain = async (
  domain: string,
  vmId: string,
  port: number = VM_PORT,
) => {
  await freestyle.tls.rules.create({
    action: "allow",
    domain,
    source: { public: true },
    destination: { vmId, port },
  });
};

/**
 * Repoint a domain at a different VM, replacing whatever rule holds it now.
 * Used when production is cut over to a freshly built VM.
 */
export const remapDomain = async (
  domain: string,
  vmId: string,
  port: number = VM_PORT,
) => {
  const { rules } = await freestyle.tls.rules.list({ limit: 200 });
  const existing = rules.filter((rule) => rule.domain === domain);
  await Promise.all(
    existing.map((rule) => freestyle.tls.rules.delete(rule.id)),
  );
  await mapDomain(domain, vmId, port);
};

/**
 * Make sure a VM's long-lived server session is running. The session is named,
 * so this is get-or-create: it does not start a second server, and
 * `replaceOnExit` brings the shell back if the command dies.
 *
 * For a dev VM this is normally a no-op — the base snapshot is captured with
 * the dev server already running and warmed, and a snapshot restores memory as
 * well as disk, so the server is serving before the create call even returns.
 */
const startServer = (vm: Vm, name: string, command: string) =>
  ensureNamedSession(vm, name, `cd ${WORKDIR} && ${command}`);

/** Stop the dev server and start a fresh one, for when its workdir changed underneath it. */
export const restartDevServer = async (vm: Vm) => {
  await closeNamedSession(vm, DEV_SESSION);
  await startDevServer(vm);
};

export const startDevServer = (vm: Vm) =>
  startServer(vm, DEV_SESSION, "npm run dev");

export const startProdServer = (vm: Vm) =>
  startServer(vm, PROD_SESSION, "npm run start");

export type CreatedProjectVms = {
  projectId: string;
  prodVmId: string;
  previewDomain: string;
  productionDomain: string;
};

/**
 * Create a project's two VMs from the base snapshot — one dev, one prod — map
 * a domain at each, and start the dev server. Both boot with the template's
 * node_modules already installed, so the dev server is up in seconds.
 */
export const createProjectVms = async (
  name: string,
  /** A public git URL to build the project from instead of the template. */
  sourceRepoUrl?: string,
): Promise<CreatedProjectVms> => {
  const handle = `adorable-${randomUUID().slice(0, 8)}`;
  const previewDomain = `${handle}.${DOMAIN_SUFFIX}`;
  const productionDomain = `${handle}-live.${DOMAIN_SUFFIX}`;

  const { vm: dev, vmId: projectId } = await freestyle.vms.create({
    snapshotId: BASE_SNAPSHOT_SLUG,
    displayName: name,
    persistence: { type: "persistent" },
    metadata: { [META_KIND]: "project", [META_ROLE]: "dev" },
    firewall: PROJECT_FIREWALL,
  });

  const { vmId: prodVmId } = await freestyle.vms.create({
    snapshotId: BASE_SNAPSHOT_SLUG,
    displayName: `${name} (production)`,
    persistence: { type: "persistent" },
    metadata: {
      [META_KIND]: "project",
      [META_ROLE]: "prod",
      [META_PROJECT]: projectId,
    },
    firewall: PROJECT_FIREWALL,
  });

  await dev.exec(`mkdir -p ${ADORABLE_DIR}/conversations`);

  if (sourceRepoUrl) {
    // The clone replaces the workdir the inherited dev server is watching, so
    // that server has to be replaced along with it.
    await importRepo(dev, sourceRepoUrl);
    await restartDevServer(dev);
  }

  await Promise.all([
    mapDomain(previewDomain, projectId),
    mapDomain(productionDomain, prodVmId),
    startDevServer(dev),
    // Production boots from the same snapshot, so it starts with a dev server
    // holding the app port. Nothing should serve there until a publish does.
    closeNamedSession(prodVm(prodVmId), DEV_SESSION),
  ]);

  return { projectId, prodVmId, previewDomain, productionDomain };
};

/**
 * Replace the template in a fresh VM with a git project's contents. The clone's
 * own history is kept: the VM is a real machine, so the project keeps working
 * as a git checkout the agent can commit to.
 */
const importRepo = async (vm: Vm, repoUrl: string) => {
  const clone = await vm.exec({
    command: `rm -rf ${WORKDIR} && git clone --depth 1 ${JSON.stringify(repoUrl)} ${WORKDIR}`,
    timeoutMs: 300_000,
  });
  if (clone.statusCode !== 0) {
    throw new Error(`Could not clone ${repoUrl}: ${clone.stderr ?? ""}`.trim());
  }

  const install = await vm.exec({
    command: `cd ${WORKDIR} && npm install --no-audit --no-fund`,
    timeoutMs: 300_000,
  });
  if (install.statusCode !== 0) {
    throw new Error(
      `Dependency install failed: ${install.stderr ?? ""}`.trim(),
    );
  }
};

/** The dev VMs of every project, newest first. */
export const listProjectVms = async () => {
  const { vms } = await freestyle.vms.list({
    metadata: `${META_KIND}:project,${META_ROLE}:dev`,
    limit: 200,
  });
  return [...vms].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** Delete a project: both VMs, and with them the rules naming either. */
export const deleteProjectVms = async (projectId: string, prodVmId: string) => {
  await Promise.all([
    freestyle.vms.delete(projectId),
    freestyle.vms.delete(prodVmId),
  ]);
};
