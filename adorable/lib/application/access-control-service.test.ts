import { describe, expect, it } from "vitest";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import type { GitRepositorySummary } from "@/lib/ports";

type FreestyleIdentityFake =
  Parameters<typeof createFreestyleAccessContext>[0]["identity"];

const repositories: GitRepositorySummary[] = [
  { id: "repo-1" },
  { id: "repo-2" },
];

const createIdentityFake = () => {
  const gitListCalls: Array<{ limit: number }> = [];
  const gitGrantCalls: Array<{ permission: "write"; repoId: string }> = [];
  const vmGrantCalls: Array<{ vmId: string }> = [];

  const identity = {
    permissions: {
      git: {
        async list(input) {
          gitListCalls.push(input);
          return { repositories };
        },
        async grant(input) {
          gitGrantCalls.push(input);
        },
      },
      vms: {
        async grant(input) {
          vmGrantCalls.push(input);
        },
      },
    },
  } satisfies FreestyleIdentityFake;

  return {
    identity,
    gitListCalls,
    gitGrantCalls,
    vmGrantCalls,
  };
};

describe("createFreestyleAccessContext", () => {
  it("exposes the provided identityId", () => {
    const { identity, gitListCalls, gitGrantCalls, vmGrantCalls } =
      createIdentityFake();

    const access = createFreestyleAccessContext({
      identityId: "identity-id",
      identity,
    });

    expect(access.identityId).toBe("identity-id");
    expect(gitListCalls).toEqual([]);
    expect(gitGrantCalls).toEqual([]);
    expect(vmGrantCalls).toEqual([]);
  });

  it("lists Git repositories with the default limit", async () => {
    const { identity, gitListCalls } = createIdentityFake();
    const access = createFreestyleAccessContext({
      identityId: "identity-id",
      identity,
    });

    const result = await access.listGitRepositories();

    expect(gitListCalls).toEqual([{ limit: 200 }]);
    expect(result).toBe(repositories);
  });

  it("forwards a custom repository limit", async () => {
    const { identity, gitListCalls } = createIdentityFake();
    const access = createFreestyleAccessContext({
      identityId: "identity-id",
      identity,
    });

    const result = await access.listGitRepositories(50);

    expect(gitListCalls).toEqual([{ limit: 50 }]);
    expect(result).toBe(repositories);
  });

  it("checks Git repository access using the default repository limit", async () => {
    const { identity, gitListCalls } = createIdentityFake();
    const access = createFreestyleAccessContext({
      identityId: "identity-id",
      identity,
    });

    await expect(access.hasGitRepoAccess("repo-1")).resolves.toBe(true);
    await expect(access.hasGitRepoAccess("missing")).resolves.toBe(false);

    expect(gitListCalls).toEqual([{ limit: 200 }, { limit: 200 }]);
  });

  it("grants Git write access and VM access", async () => {
    const { identity, gitGrantCalls, vmGrantCalls } = createIdentityFake();
    const access = createFreestyleAccessContext({
      identityId: "identity-id",
      identity,
    });

    await access.grantGitRepoWrite("repo-1");
    await access.grantVmAccess("vm-1");

    expect(gitGrantCalls).toEqual([
      {
        permission: "write",
        repoId: "repo-1",
      },
    ]);
    expect(vmGrantCalls).toEqual([{ vmId: "vm-1" }]);
  });
});
