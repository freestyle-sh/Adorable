import type { ProjectStore } from "@/lib/ports";
import type {
  RepoDeploymentSummary,
  RepoMetadata,
} from "@/lib/project-metadata";
import {
  addRepoDeployment,
  promoteRepoDeploymentToProduction,
  readRepoMetadata,
  resolveSourceRepoId,
  setRepoProductionDomain,
  writeRepoMetadata,
} from "@/lib/repo-storage";

export class FreestyleProjectStore implements ProjectStore {
  async readMetadata(repoId: string) {
    return readRepoMetadata(repoId);
  }

  async writeMetadata(repoId: string, metadata: RepoMetadata) {
    await writeRepoMetadata(repoId, metadata);
  }

  async resolveSourceRepoId(repoId: string) {
    return resolveSourceRepoId(repoId);
  }

  async recordDeployment(input: {
    repoId: string;
    metadata: RepoMetadata;
    deployment: RepoDeploymentSummary;
  }): Promise<RepoMetadata> {
    return addRepoDeployment(input.repoId, input.metadata, input.deployment);
  }

  async setProductionDomain(input: {
    repoId: string;
    metadata: RepoMetadata;
    domain: string;
  }): Promise<RepoMetadata> {
    return setRepoProductionDomain(
      input.repoId,
      input.metadata,
      input.domain,
    );
  }

  async promoteDeploymentToProduction(input: {
    repoId: string;
    metadata: RepoMetadata;
    deploymentId: string;
  }): Promise<RepoMetadata> {
    return promoteRepoDeploymentToProduction(
      input.repoId,
      input.metadata,
      input.deploymentId,
    );
  }
}

export const freestyleProjectStore = new FreestyleProjectStore();
