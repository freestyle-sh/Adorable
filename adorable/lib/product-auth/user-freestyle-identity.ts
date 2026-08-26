import { freestyle } from "freestyle-sandboxes";
import type { CurrentUser } from "@/lib/product-auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserInfrastructureIdentityRecord = {
  userId: string;
  freestyleIdentityId: string;
  createdAt?: string;
  lastValidatedAt?: string;
};

export type UserFreestyleIdentityResult<TIdentity = unknown> = {
  identityId: string;
  identity: TIdentity;
};

export type PersistUserFreestyleIdentityResult =
  | {
      status: "created";
      record: UserInfrastructureIdentityRecord;
    }
  | {
      status: "conflict";
    };

export type UserFreestyleIdentityDependencies<TIdentity = unknown> = {
  findExistingIdentity(
    userId: string,
  ): Promise<UserInfrastructureIdentityRecord | null>;
  createFreestyleIdentity(): Promise<UserFreestyleIdentityResult<TIdentity>>;
  getFreestyleIdentity(identityId: string): TIdentity;
  persistIdentity(input: {
    userId: string;
    freestyleIdentityId: string;
  }): Promise<PersistUserFreestyleIdentityResult>;
  touchIdentity(userId: string): Promise<void>;
};

export const getOrCreateUserFreestyleIdentityWithDependencies = async <
  TIdentity,
>(
  user: CurrentUser,
  deps: UserFreestyleIdentityDependencies<TIdentity>,
): Promise<UserFreestyleIdentityResult<TIdentity>> => {
  const existing = await deps.findExistingIdentity(user.id);

  if (existing) {
    await deps.touchIdentity(user.id);
    return {
      identityId: existing.freestyleIdentityId,
      identity: deps.getFreestyleIdentity(existing.freestyleIdentityId),
    };
  }

  const created = await deps.createFreestyleIdentity();
  const persisted = await deps.persistIdentity({
    userId: user.id,
    freestyleIdentityId: created.identityId,
  });

  if (persisted.status === "created") {
    return created;
  }

  const resolved = await deps.findExistingIdentity(user.id);
  if (!resolved) return created;

  await deps.touchIdentity(user.id);
  return {
    identityId: resolved.freestyleIdentityId,
    identity: deps.getFreestyleIdentity(resolved.freestyleIdentityId),
  };
};

export const createSupabaseUserFreestyleIdentityDependencies = async () => {
  const supabase = await createSupabaseServerClient();

  return {
    async findExistingIdentity(userId) {
      const { data, error } = await supabase
        .from("user_infrastructure_identities")
        .select(
          "user_id, freestyle_identity_id, created_at, last_validated_at",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        userId: data.user_id,
        freestyleIdentityId: data.freestyle_identity_id,
        createdAt: data.created_at,
        lastValidatedAt: data.last_validated_at,
      };
    },
    async createFreestyleIdentity() {
      const { identityId, identity } = await freestyle.identities.create({});
      return { identityId, identity };
    },
    getFreestyleIdentity(identityId) {
      return freestyle.identities.ref({ identityId });
    },
    async persistIdentity({ userId, freestyleIdentityId }) {
      const { error } = await supabase
        .from("user_infrastructure_identities")
        .insert({
          user_id: userId,
          freestyle_identity_id: freestyleIdentityId,
        });

      if (!error) {
        return {
          status: "created",
          record: {
            userId,
            freestyleIdentityId,
          },
        };
      }

      if (error.code === "23505") {
        return { status: "conflict" };
      }

      throw error;
    },
    async touchIdentity(userId) {
      const { error } = await supabase
        .from("user_infrastructure_identities")
        .update({ last_validated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;
    },
  } satisfies UserFreestyleIdentityDependencies;
};

export const getOrCreateUserFreestyleIdentity = async (user: CurrentUser) => {
  const deps = await createSupabaseUserFreestyleIdentityDependencies();
  return getOrCreateUserFreestyleIdentityWithDependencies(user, deps);
};
