import type { ProjectStore } from "@/lib/ports";
import {
  addRepoDeployment,
  readRepoMetadata,
  type RepoDeploymentSummary,
  resolveSourceRepoId,
  type RepoMetadata,
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
}

export const freestyleProjectStore = new FreestyleProjectStore();
