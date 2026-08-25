/** Where a project's app lives inside its VM. */
export const WORKDIR = "/workspace";

/** Where Adorable keeps its own state inside a project's dev VM. */
export const ADORABLE_DIR = "/adorable";

/** The port both the dev server and the production server listen on. */
export const VM_PORT = 3000;

/**
 * The snapshot every project VM boots from: Ubuntu with the Next.js + shadcn
 * template already cloned into {@link WORKDIR} and its node_modules installed.
 * Built by `npm run bootstrap` (scripts/bootstrap-base-snapshot.mjs).
 */
export const BASE_SNAPSHOT_SLUG = "adorable-base";

/** The template the base snapshot is built from. */
export const TEMPLATE_REPO =
  "https://github.com/freestyle-sh/freestyle-base-nextjs-shadcn";

/**
 * The domain projects are served under. Verified on the account, with a
 * wildcard CNAME to `beta-web.freestyle.sh` and `_acme-challenge` delegated to
 * `beta-dns.freestyle.sh`, which is what lets certificates be issued.
 */
export const DOMAIN_SUFFIX = "adorable.app";

/**
 * The named PTY session running a VM's app server — `npm run dev`, on the dev
 * VM and the production VM alike. Naming it makes `pty.open` get-or-create, so
 * a VM restored from the base snapshot is found already serving.
 */
export const APP_SESSION = "dev";

/** VM metadata keys, used to index projects without a database. */
export const META_KIND = "adorable";
export const META_ROLE = "adorableRole";
export const META_PROJECT = "adorableProject";
