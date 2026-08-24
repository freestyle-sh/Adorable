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
  setProductionDomain(input: {
    repoId: string;
    metadata: RepoMetadata;
    domain: string;
  }): Promise<RepoMetadata>;
  promoteDeploymentToProduction(input: {
    repoId: string;
    metadata: RepoMetadata;
    deploymentId: string;
  }): Promise<RepoMetadata>;
}
