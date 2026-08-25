/**
 * Build the snapshot every Adorable project boots from.
 *
 * Boots a plain Ubuntu VM, clones the Next.js + shadcn template into the
 * workdir, installs its dependencies, starts the dev server and requests the
 * pages until Next has compiled them — then snapshots all of that.
 *
 * A snapshot captures memory as well as disk, so the running, already-compiled
 * dev server comes back with the VM. A project created from this snapshot is
 * serving its preview in well under a second, rather than spending ~10s on a
 * cold boot and first compile.
 *
 * Run once per template change:  npm run bootstrap
 */
import "dotenv/config";
import { Freestyle } from "freestyle";

const WORKDIR = "/workspace";
const VM_PORT = 3000;
/** Routes requested before snapshotting, so their compile is already done. */
const WARM_PATHS = ["/"];
/** Must match APP_SESSION in lib/vars.ts. */
const APP_SESSION = "dev";
const ADORABLE_DIR = "/adorable";
const SNAPSHOT_SLUG = "adorable-base";
const TEMPLATE_REPO =
  "https://github.com/freestyle-sh/freestyle-base-nextjs-shadcn";

const apiKey = process.env.FREESTYLE_API_KEY;
if (!apiKey) {
  console.error("FREESTYLE_API_KEY is not set.");
  process.exit(1);
}

const freestyle = new Freestyle({ apiKey });
const started = Date.now();
const log = (...args) =>
  console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s]`, ...args);

const check = (label, result) => {
  if (result.statusCode !== 0) {
    throw new Error(
      `${label} failed (exit ${result.statusCode}):\n${result.stderr || result.stdout}`,
    );
  }
  return result;
};

// A slug names one snapshot, so rebuilding means retiring the previous build.
const { snapshots } = await freestyle.vms.snapshots.list({ limit: 200 });
for (const snapshot of snapshots.filter((s) => s.slug === SNAPSHOT_SLUG)) {
  await freestyle.vms.snapshots.update(snapshot.id, { slug: "" });
  log(`released slug from previous snapshot ${snapshot.id}`);
}

const { vm, vmId } = await freestyle.vms.create({
  snapshotId: "freestyle/ubuntu",
  displayName: "adorable base snapshot build",
  // The build VM is scaffolding: it deletes itself if anything here throws.
  ttlSeconds: 3600,
  firewall: {
    rules: [{ action: "allow", source: {}, destination: { public: true } }],
  },
});
log("booted build VM", vmId);

try {
  check(
    "Clone",
    await vm.exec({
      command: `rm -rf ${WORKDIR} && git clone --depth 1 ${TEMPLATE_REPO} ${WORKDIR} && rm -rf ${WORKDIR}/.git`,
      timeoutMs: 300_000,
    }),
  );
  log("cloned template");

  check(
    "Install",
    await vm.exec({
      command: `cd ${WORKDIR} && npm install --no-audit --no-fund`,
      timeoutMs: 300_000,
    }),
  );
  log("installed dependencies");

  check(
    "Prepare",
    await vm.exec({ command: `mkdir -p ${ADORABLE_DIR}/conversations` }),
  );

  // Start the dev server under the name projects address it by. The name is
  // captured in the snapshot along with the session, so a project restored
  // from it finds the server already running rather than starting a second.
  const session = await vm.pty.open({
    slug: APP_SESSION,
    exec: `cd ${WORKDIR} && npm run dev`,
    replaceOnExit: true,
    cols: 120,
    rows: 30,
  });
  session.detach();
  log(`dev server started (session "${session.slug}")`);

  // Warm it: the first request is what makes Next compile a route, and that
  // compile is most of a new project's wait. Doing it here means every project
  // inherits the result.
  for (const path of WARM_PATHS) {
    let served = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const { stdout } = await vm.exec({
        command: `curl -s -o /dev/null -w '%{http_code}' http://localhost:${VM_PORT}${path}`,
        timeoutMs: 60_000,
      });
      if (stdout?.trim() === "200") {
        served = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!served) throw new Error(`Dev server never served ${path}`);
    log(`warmed ${path}`);
  }

  const { snapshotId } = await vm.snapshot({
    slug: SNAPSHOT_SLUG,
    displayName: "Adorable base (Next.js + shadcn)",
  });
  log(`snapshot ready: ${snapshotId} (slug "${SNAPSHOT_SLUG}")`);
} finally {
  await freestyle.vms.delete(vmId).catch(() => {});
  log("deleted build VM");
}
