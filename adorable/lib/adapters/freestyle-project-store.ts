import type { ProjectStore } from "@/lib/ports";
import {
  readRepoMetadata,
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
}

export const freestyleProjectStore = new FreestyleProjectStore();
