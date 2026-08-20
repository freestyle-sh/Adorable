import { randomUUID } from "crypto";
import {
  freestyleConversationStore,
  freestyleGitProvider,
  freestyleProjectStore,
  freestyleSandboxProvider,
} from "@/lib/adapters";
import type {
  ConversationStore,
  GitIdentityPermissions,
  GitProvider,
  ProjectStore,
  SandboxProvider,
} from "@/lib/ports";
import {
  ADORABLE_WRAPPER_REPO_PREFIX,
  type RepoMetadata,
} from "@/lib/repo-storage";
import { TEMPLATE_REPO } from "@/lib/vars";

export type CreateProjectInput = {
  requestedName?: string;
  requestedConversationTitle?: string;
  githubRepoName?: string;
};

export type CreateProjectIdentity = GitIdentityPermissions & {
  permissions: GitIdentityPermissions["permissions"] & {
    vms: {
      grant(input: { vmId: string }): Promise<unknown>;
    };
  };
};

export type CreateProjectContext = {
  identity: CreateProjectIdentity;
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
    const { identity } = context;

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

    await this.deps.gitProvider.grantWriteAccess({
      identity,
      repoId: sourceRepoId,
    });

    await this.deps.gitProvider.grantWriteAccess({
      identity,
      repoId: wrapperRepoId,
    });

    const vm = await this.deps.sandboxProvider.createForRepo(sourceRepoId);

    // TODO: Move VM permission grants behind an identity/permission port.
    await identity.permissions.vms.grant({
      vmId: vm.vmId,
    });

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
