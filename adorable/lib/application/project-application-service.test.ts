import { describe, expect, it, vi } from "vitest";
import type { AccessContext } from "@/lib/application/access-control-service";
import { ADORABLE_WRAPPER_REPO_PREFIX } from "@/lib/project-constants";
import type { RepoMetadata, RepoVmMetadata } from "@/lib/project-metadata";
import { TEMPLATE_REPO } from "@/lib/vars";
import type {
  ConversationStore,
  GitProvider,
  ProjectStore,
  SandboxProvider,
} from "@/lib/ports";

vi.mock("@/lib/adapters", () => ({
  freestyleConversationStore: {},
  freestyleGitProvider: {},
  freestyleProjectStore: {},
  freestyleSandboxProvider: {},
}));

describe("ProjectApplicationService", () => {
  it("creates source repo, wrapper repo, VM, metadata, grants, and initial conversation without GitHub sync", async () => {
    const { ProjectApplicationService } = await import(
      "@/lib/application/project-application-service"
    );

    const createRepositoryCalls: Parameters<
      GitProvider["createRepository"]
    >[0][] = [];
    const writeMetadataCalls: Array<{
      repoId: string;
      metadata: RepoMetadata;
    }> = [];
    const createConversationCalls: Parameters<
      ConversationStore["createConversation"]
    >[0][] = [];
    const createdVm: RepoVmMetadata = {
      vmId: "vm-id",
      previewUrl: "https://preview.example.test",
      devCommandTerminalUrl: "https://terminal.example.test",
      additionalTerminalsUrl: "https://terminals.example.test",
    };
    const createdForRepoIds: string[] = [];
    const grantedGitRepoIds: string[] = [];
    const grantedVmIds: string[] = [];

    const gitProvider = {
      async createRepository(input) {
        createRepositoryCalls.push(input);
        return {
          repoId:
            createRepositoryCalls.length === 1
              ? "source-repo-id"
              : "wrapper-repo-id",
        };
      },
      async createGithubSyncedRepository() {
        throw new Error("createGithubSyncedRepository should not be called");
      },
      async grantWriteAccess() {
        throw new Error("grantWriteAccess should not be called");
      },
      async listRepositoriesForIdentity() {
        throw new Error("listRepositoriesForIdentity should not be called");
      },
      async getDefaultBranch() {
        throw new Error("getDefaultBranch should not be called");
      },
      async createCommit() {
        throw new Error("createCommit should not be called");
      },
      async listCommits() {
        throw new Error("listCommits should not be called");
      },
    } satisfies GitProvider;

    const sandboxProvider = {
      async createForRepo(repoId) {
        createdForRepoIds.push(repoId);
        return createdVm;
      },
      getRuntime() {
        throw new Error("getRuntime should not be called");
      },
    } satisfies SandboxProvider;

    const projectStore = {
      async readMetadata() {
        throw new Error("readMetadata should not be called");
      },
      async writeMetadata(repoId, metadata) {
        writeMetadataCalls.push({ repoId, metadata });
      },
      async resolveSourceRepoId() {
        throw new Error("resolveSourceRepoId should not be called");
      },
      async recordDeployment() {
        throw new Error("recordDeployment should not be called");
      },
      async setProductionDomain() {
        throw new Error("setProductionDomain should not be called");
      },
      async promoteDeploymentToProduction() {
        throw new Error("promoteDeploymentToProduction should not be called");
      },
    } satisfies ProjectStore;

    const conversationStore = {
      async listConversations() {
        throw new Error("listConversations should not be called");
      },
      async createConversation(input) {
        createConversationCalls.push(input);
        return {
          ...input.metadata,
          conversations: [
            {
              id: input.conversationId,
              title: input.title ?? "Conversation 1",
              createdAt: "2026-08-25T00:00:00.000Z",
              updatedAt: "2026-08-25T00:00:00.000Z",
            },
          ],
        };
      },
      async readMessages() {
        throw new Error("readMessages should not be called");
      },
      async saveMessages() {
        throw new Error("saveMessages should not be called");
      },
    } satisfies ConversationStore;

    const access = {
      identityId: "identity-id",
      async listGitRepositories() {
        throw new Error("listGitRepositories should not be called");
      },
      async hasGitRepoAccess() {
        throw new Error("hasGitRepoAccess should not be called");
      },
      async grantGitRepoWrite(repoId) {
        grantedGitRepoIds.push(repoId);
      },
      async grantVmAccess(vmId) {
        grantedVmIds.push(vmId);
      },
    } satisfies AccessContext;

    const service = new ProjectApplicationService({
      gitProvider,
      sandboxProvider,
      projectStore,
      conversationStore,
    });

    const result = await service.createProject(
      {
        requestedName: "My Project",
        requestedConversationTitle: "Initial conversation",
      },
      { access },
    );

    expect(createRepositoryCalls).toEqual([
      {
        name: "My Project",
        import: {
          commitMessage: "Initial commit",
          url: TEMPLATE_REPO,
          type: "git",
        },
      },
      {
        name: `${ADORABLE_WRAPPER_REPO_PREFIX}My Project`,
      },
    ]);
    expect(grantedGitRepoIds).toEqual(["source-repo-id", "wrapper-repo-id"]);
    expect(createdForRepoIds).toEqual(["source-repo-id"]);
    expect(grantedVmIds).toEqual(["vm-id"]);
    expect(writeMetadataCalls).toEqual([
      {
        repoId: "wrapper-repo-id",
        metadata: {
          version: 2,
          sourceRepoId: "source-repo-id",
          name: "My Project",
          vm: createdVm,
          conversations: [],
          deployments: [],
          productionDomain: null,
          productionDeploymentId: null,
        },
      },
    ]);
    expect(createConversationCalls).toHaveLength(1);
    expect(createConversationCalls[0]).toMatchObject({
      repoId: "wrapper-repo-id",
      metadata: writeMetadataCalls[0]?.metadata,
      title: "Initial conversation",
    });
    expect(createConversationCalls[0]?.conversationId).toEqual(
      expect.any(String),
    );
    expect(createConversationCalls[0]?.conversationId).not.toBe("");
    expect(result).toEqual({
      id: "wrapper-repo-id",
      metadata: {
        ...writeMetadataCalls[0]?.metadata,
        conversations: [
          {
            id: createConversationCalls[0]?.conversationId,
            title: "Initial conversation",
            createdAt: "2026-08-25T00:00:00.000Z",
            updatedAt: "2026-08-25T00:00:00.000Z",
          },
        ],
      },
      conversationId: createConversationCalls[0]?.conversationId,
    });
  });
});
