import { describe, expect, it } from "vitest";
import {
  getOrCreateUserFreestyleIdentityWithDependencies,
  type UserFreestyleIdentityDependencies,
  type UserInfrastructureIdentityRecord,
} from "@/lib/product-auth/user-freestyle-identity";

const user = { id: "user-id", email: "user@example.com" };

const createDeps = ({
  existing,
  persistStatus = "created",
}: {
  existing: UserInfrastructureIdentityRecord | null;
  persistStatus?: "created" | "conflict";
}) => {
  const calls = {
    findExistingIdentity: [] as string[],
    createFreestyleIdentity: 0,
    getFreestyleIdentity: [] as string[],
    persistIdentity: [] as Array<{
      userId: string;
      freestyleIdentityId: string;
    }>,
    touchIdentity: [] as string[],
  };
  let current = existing;

  const deps = {
    async findExistingIdentity(userId) {
      calls.findExistingIdentity.push(userId);
      return current;
    },
    async createFreestyleIdentity() {
      calls.createFreestyleIdentity += 1;
      return {
        identityId: "created-identity-id",
        identity: { id: "created-identity" },
      };
    },
    getFreestyleIdentity(identityId) {
      calls.getFreestyleIdentity.push(identityId);
      return { id: identityId };
    },
    async persistIdentity(input) {
      calls.persistIdentity.push(input);
      if (persistStatus === "created") {
        current = {
          userId: input.userId,
          freestyleIdentityId: input.freestyleIdentityId,
        };
        return {
          status: "created",
          record: current,
        };
      }

      current = {
        userId: input.userId,
        freestyleIdentityId: "existing-after-conflict",
      };
      return { status: "conflict" };
    },
    async touchIdentity(userId) {
      calls.touchIdentity.push(userId);
    },
  } satisfies UserFreestyleIdentityDependencies<{ id: string }>;

  return { deps, calls };
};

describe("getOrCreateUserFreestyleIdentityWithDependencies", () => {
  it("reuses an existing Freestyle identity for the user", async () => {
    const { deps, calls } = createDeps({
      existing: {
        userId: "user-id",
        freestyleIdentityId: "existing-identity-id",
      },
    });

    const result = await getOrCreateUserFreestyleIdentityWithDependencies(
      user,
      deps,
    );

    expect(result).toEqual({
      identityId: "existing-identity-id",
      identity: { id: "existing-identity-id" },
    });
    expect(calls.createFreestyleIdentity).toBe(0);
    expect(calls.persistIdentity).toEqual([]);
    expect(calls.touchIdentity).toEqual(["user-id"]);
  });

  it("creates and persists a Freestyle identity when none exists", async () => {
    const { deps, calls } = createDeps({ existing: null });

    const result = await getOrCreateUserFreestyleIdentityWithDependencies(
      user,
      deps,
    );

    expect(result).toEqual({
      identityId: "created-identity-id",
      identity: { id: "created-identity" },
    });
    expect(calls.createFreestyleIdentity).toBe(1);
    expect(calls.persistIdentity).toEqual([
      {
        userId: "user-id",
        freestyleIdentityId: "created-identity-id",
      },
    ]);
  });

  it("resolves the existing row when a concurrent request wins insertion", async () => {
    const { deps, calls } = createDeps({
      existing: null,
      persistStatus: "conflict",
    });

    const result = await getOrCreateUserFreestyleIdentityWithDependencies(
      user,
      deps,
    );

    expect(result).toEqual({
      identityId: "existing-after-conflict",
      identity: { id: "existing-after-conflict" },
    });
    expect(calls.createFreestyleIdentity).toBe(1);
    expect(calls.findExistingIdentity).toEqual(["user-id", "user-id"]);
    expect(calls.touchIdentity).toEqual(["user-id"]);
  });
});
