export type GitRepositorySummary = {
  id: string;
  name?: string | null;
};

export type GitImportInput = {
  commitMessage: string;
  url: string;
  type: "git";
};

export type CreateGitRepositoryInput = {
  name?: string;
  import?: GitImportInput;
};

export type CreateGitRepositoryResult = {
  repoId: string;
};

export type CreateGithubSyncedRepositoryInput = {
  name?: string;
  githubRepoName: string;
};

export type GitIdentityPermissions = {
  permissions: {
    git: {
      list(input: { limit: number }): Promise<{
        repositories: GitRepositorySummary[];
      }>;
      grant(input: { permission: "write"; repoId: string }): Promise<unknown>;
    };
  };
};

export type GitCommitFile = {
  path: string;
  content: string;
};

export type GitCommitAuthor = {
  name: string;
  email: string;
};

export type CreateGitCommitInput = {
  repoId: string;
  message: string;
  branch?: string;
  files: GitCommitFile[];
  author: GitCommitAuthor;
};

export type GitCommitSummary = {
  sha: string;
  message: string;
  author?: {
    date?: string;
  };
};

export interface GitProvider {
  createRepository(
    input?: CreateGitRepositoryInput,
  ): Promise<CreateGitRepositoryResult>;
  createGithubSyncedRepository(
    input: CreateGithubSyncedRepositoryInput,
  ): Promise<CreateGitRepositoryResult>;
  grantWriteAccess(input: {
    identity: GitIdentityPermissions;
    repoId: string;
  }): Promise<void>;
  listRepositoriesForIdentity(input: {
    identity: GitIdentityPermissions;
    limit?: number;
  }): Promise<GitRepositorySummary[]>;
  getDefaultBranch(repoId: string): Promise<string>;
  createCommit(input: CreateGitCommitInput): Promise<void>;
  listCommits(input: {
    repoId: string;
    limit?: number;
    order?: "asc" | "desc";
  }): Promise<GitCommitSummary[]>;
}
