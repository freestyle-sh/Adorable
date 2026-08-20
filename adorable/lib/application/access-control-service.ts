import type { GitRepositorySummary } from "@/lib/ports";

export type AccessContext = {
  identityId: string;
  listGitRepositories(limit?: number): Promise<GitRepositorySummary[]>;
  hasGitRepoAccess(repoId: string): Promise<boolean>;
  grantGitRepoWrite(repoId: string): Promise<void>;
  grantVmAccess(vmId: string): Promise<void>;
};

type FreestyleIdentityPermissions = {
  permissions: {
    git: {
      list(input: { limit: number }): Promise<{
        repositories: GitRepositorySummary[];
      }>;
      grant(input: { permission: "write"; repoId: string }): Promise<unknown>;
    };
    vms: {
      grant(input: { vmId: string }): Promise<unknown>;
    };
  };
};

export const createFreestyleAccessContext = ({
  identityId,
  identity,
}: {
  identityId: string;
  identity: FreestyleIdentityPermissions;
}): AccessContext => ({
  identityId,
  async listGitRepositories(limit = 200) {
    const { repositories } = await identity.permissions.git.list({ limit });
    return repositories;
  },
  async hasGitRepoAccess(repoId: string) {
    const repositories = await this.listGitRepositories();
    return repositories.some((repo) => repo.id === repoId);
  },
  async grantGitRepoWrite(repoId: string) {
    await identity.permissions.git.grant({
      permission: "write",
      repoId,
    });
  },
  async grantVmAccess(vmId: string) {
    await identity.permissions.vms.grant({
      vmId,
    });
  },
});
