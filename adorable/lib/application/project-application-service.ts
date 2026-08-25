import { randomUUID } from "crypto";
import {
  freestyleConversationStore,
  freestyleGitProvider,
  freestyleProjectStore,
  freestyleSandboxProvider,
} from "@/lib/adapters";
import type { AccessContext } from "@/lib/application/access-control-service";
import type {
  ConversationStore,
  GitProvider,
  ProjectStore,
  SandboxProvider,
} from "@/lib/ports";
import type { RepoMetadata } from "@/lib/project-metadata";
import { ADORABLE_WRAPPER_REPO_PREFIX } from "@/lib/repo-storage";
import { TEMPLATE_REPO } from "@/lib/vars";

export type CreateProjectInput = {
  requestedName?: string;
  requestedConversationTitle?: string;
  githubRepoName?: string;
};

export type CreateProjectContext = {
  access: AccessContext;
};

export type CreateProjectResult = {
  id: string;
  metadata: RepoMetadata;
  conversationId: string;
};

type ProjectApplicationServiceDependencies = {
  gitProvider: GitProvider;
  sandboxProvider: SandboxProvider;
  projectStore: ProjectStore;
  conversationStore: ConversationStore;
};

export class ProjectApplicationService {
  constructor(private readonly deps: ProjectApplicationServiceDependencies) {}

  async createProject(
    input: CreateProjectInput,
    context: CreateProjectContext,
  ): Promise<CreateProjectResult> {
    const { requestedName, requestedConversationTitle, githubRepoName } = input;
    const { access } = context;

    let sourceRepoId: string;
    if (githubRepoName) {
      const created = await this.deps.gitProvider.createGithubSyncedRepository({
        ...(requestedName ? { name: requestedName } : {}),
        githubRepoName,
      });
      sourceRepoId = created.repoId;
    } else {
      const created = await this.deps.gitProvider.createRepository({
        ...(requestedName ? { name: requestedName } : {}),
        import: {
          commitMessage: "Initial commit",
          url: TEMPLATE_REPO,
          type: "git",
        },
      });
      sourceRepoId = created.repoId;
    }

    const inferredName =
      requestedName ?? githubRepoName?.split("/").pop()?.trim() ?? "Project";
    const wrapperRepoName = `${ADORABLE_WRAPPER_REPO_PREFIX}${inferredName}`;
    const wrapperCreated = await this.deps.gitProvider.createRepository({
      name: wrapperRepoName,
    });
    const wrapperRepoId = wrapperCreated.repoId;

    await access.grantGitRepoWrite(sourceRepoId);

    await access.grantGitRepoWrite(wrapperRepoId);

    const vm = await this.deps.sandboxProvider.createForRepo(sourceRepoId);

    await access.grantVmAccess(vm.vmId);

    const initialMetadata: RepoMetadata = {
      version: 2,
      sourceRepoId,
      ...(requestedName ? { name: requestedName } : {}),
      vm,
      conversations: [],
      deployments: [],
      productionDomain: null,
      productionDeploymentId: null,
    };

    await this.deps.projectStore.writeMetadata(wrapperRepoId, initialMetadata);

    const conversationId = randomUUID();
    const metadata = await this.deps.conversationStore.createConversation({
      repoId: wrapperRepoId,
      metadata: initialMetadata,
      conversationId,
      title: requestedConversationTitle,
    });

    return {
      id: wrapperRepoId,
      metadata,
      conversationId,
    };
  }
}

export const projectApplicationService = new ProjectApplicationService({
  gitProvider: freestyleGitProvider,
  sandboxProvider: freestyleSandboxProvider,
  projectStore: freestyleProjectStore,
  conversationStore: freestyleConversationStore,
});
