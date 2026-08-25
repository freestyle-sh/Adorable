import { cookies } from "next/headers";
import { freestyle } from "./freestyle";

export const ADORABLE_IDENTITY_COOKIE = "adorable_identity_id";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * The browser's identity. An identity is what scopes a visitor to their own
 * VMs: the server grants it access per VM, and mints short-lived tokens from it
 * so the browser can open terminal WebSockets directly against a VM without
 * ever holding the account's API key.
 */
export const getOrCreateIdentitySession = async () => {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ADORABLE_IDENTITY_COOKIE)?.value;

  if (existing) {
    return {
      identityId: existing,
      identity: freestyle.identities.ref(existing),
    };
  }

  const { identityId, identity } = await freestyle.identities.create();

  cookieStore.set(ADORABLE_IDENTITY_COOKIE, identityId, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  });

  return { identityId, identity };
};

/** The VM ids this visitor may act on. */
export const listPermittedVmIds = async (): Promise<Set<string>> => {
  const { identity } = await getOrCreateIdentitySession();
  const permissions = await identity.permissions.vm.list();
  return new Set(permissions.map((permission) => permission.vmId));
};

export const grantVmAccess = async (vmIds: string[]) => {
  const { identity } = await getOrCreateIdentitySession();
  await Promise.all(
    vmIds.map((vmId) => identity.permissions.vm.grant({ vmId })),
  );
};

/** A token the browser can open PTY WebSockets with, scoped to granted VMs. */
export const mintIdentityToken = async () => {
  const { identity } = await getOrCreateIdentitySession();
  const { token } = await identity.tokens.create();
  return token;
};
