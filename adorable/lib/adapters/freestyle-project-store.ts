import type { ProjectStore } from "@/lib/ports";
import {
  addRepoDeployment,
  readRepoMetadata,
  type RepoDeploymentSummary,
  resolveSourceRepoId,
  type RepoMetadata,
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
}

export const freestyleProjectStore = new FreestyleProjectStore();
