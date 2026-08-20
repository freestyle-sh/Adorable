import { freestyle } from "freestyle-sandboxes";
import type {
  CreateGitCommitInput,
  CreateGithubSyncedRepositoryInput,
  CreateGitRepositoryInput,
  GitCommitSummary,
  GitProvider,
} from "@/lib/ports";

export class FreestyleGitProvider implements GitProvider {
  async createRepository(input?: CreateGitRepositoryInput) {
    const created = await freestyle.git.repos.create(input ?? {});
    return { repoId: created.repoId };
  }

  async createGithubSyncedRepository({
    name,
    githubRepoName,
  }: CreateGithubSyncedRepositoryInput) {
    const { repo, repoId } = await freestyle.git.repos.create(
      name ? { name } : {},
    );
    await repo.githubSync.enable({ githubRepoName });
    return { repoId };
  }

  async grantWriteAccess({
    identity,
    repoId,
  }: Parameters<GitProvider["grantWriteAccess"]>[0]) {
    await identity.permissions.git.grant({
      permission: "write",
      repoId,
    });
  }

  async listRepositoriesForIdentity({
    identity,
    limit = 200,
  }: Parameters<GitProvider["listRepositoriesForIdentity"]>[0]) {
    const { repositories } = await identity.permissions.git.list({ limit });
    return repositories;
  }

  async getDefaultBranch(repoId: string) {
    const repo = freestyle.git.repos.ref({ repoId });
    const { defaultBranch } = await repo.branches.getDefaultBranch();
    return defaultBranch;
  }

  async createCommit({
    repoId,
    message,
    branch,
    files,
    author,
  }: CreateGitCommitInput) {
    const repo = freestyle.git.repos.ref({ repoId });
    const targetBranch =
      branch ?? (await repo.branches.getDefaultBranch()).defaultBranch;

    await repo.commits.create({
      message,
      branch: targetBranch,
      files,
      author,
    });
  }

  async listCommits({
    repoId,
    limit = 50,
    order = "desc",
  }: Parameters<GitProvider["listCommits"]>[0]): Promise<GitCommitSummary[]> {
    const repo = freestyle.git.repos.ref({ repoId });
    const commits = await repo.commits.list({ limit, order });
    return commits.commits;
  }
}

export const freestyleGitProvider = new FreestyleGitProvider();
