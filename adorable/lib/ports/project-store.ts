import type {
  RepoDeploymentSummary,
  RepoMetadata,
} from "@/lib/repo-storage";

export interface ProjectStore {
  readMetadata(repoId: string): Promise<RepoMetadata | null>;
  writeMetadata(repoId: string, metadata: RepoMetadata): Promise<void>;
  resolveSourceRepoId(repoId: string): Promise<string>;
  recordDeployment(input: {
    repoId: string;
    metadata: RepoMetadata;
    deployment: RepoDeploymentSummary;
  }): Promise<RepoMetadata>;
}
