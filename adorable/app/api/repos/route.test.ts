import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockAuthenticationRequiredError extends Error {
    readonly status = 401;

    constructor(message = "Authentication required.") {
      super(message);
      this.name = "AuthenticationRequiredError";
    }
  }

  return {
    AuthenticationRequiredError: MockAuthenticationRequiredError,
    createFreestyleAccessContext: vi.fn(),
    createOwnedProject: vi.fn(),
    freestyleDeploymentProvider: {
      listDeployments: vi.fn(),
    },
    freestyleProjectStore: {
      readMetadata: vi.fn(),
    },
    getOrCreateIdentitySession: vi.fn(),
    listProjectsForUser: vi.fn(),
    projectApplicationService: {
      createProject: vi.fn(),
    },
    requireCurrentUser: vi.fn(),
    resolveOwnedProjectName: vi.fn(),
  };
});

vi.mock("@/lib/adapters", () => ({
  freestyleDeploymentProvider: mocks.freestyleDeploymentProvider,
  freestyleProjectStore: mocks.freestyleProjectStore,
}));

vi.mock("@/lib/application/access-control-service", () => ({
  createFreestyleAccessContext: mocks.createFreestyleAccessContext,
}));

vi.mock("@/lib/application/project-application-service", () => ({
  projectApplicationService: mocks.projectApplicationService,
}));

vi.mock("@/lib/identity-session", () => ({
  getOrCreateIdentitySession: mocks.getOrCreateIdentitySession,
}));

vi.mock("@/lib/product-auth", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
  createOwnedProject: mocks.createOwnedProject,
  listProjectsForUser: mocks.listProjectsForUser,
  requireCurrentUser: mocks.requireCurrentUser,
  resolveOwnedProjectName: mocks.resolveOwnedProjectName,
}));

describe("/api/repos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a predictable 401 from GET before touching Freestyle when Supabase auth is missing", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new mocks.AuthenticationRequiredError(),
    );

    const { GET } = await import("./route");
    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      error: "Authentication required.",
    });
    expect(response.status).toBe(401);
    expect(mocks.getOrCreateIdentitySession).not.toHaveBeenCalled();
    expect(mocks.listProjectsForUser).not.toHaveBeenCalled();
  });

  it("returns owned and legacy repositories without changing the public contract", async () => {
    const access = {
      identityId: "legacy-identity-id",
      listGitRepositories: vi.fn().mockResolvedValue([
        {
          id: "legacy-wrapper-repo-id",
          name: "adorable-meta - Legacy Project",
        },
        {
          id: "source-repo-id",
          name: "Source Repo",
        },
      ]),
    };
    const ownedMetadata = {
      version: 2,
      sourceRepoId: "owned-source-repo-id",
      vm: null,
      conversations: [],
      deployments: [],
      productionDomain: null,
      productionDeploymentId: null,
    };
    const legacyMetadata = {
      version: 2,
      sourceRepoId: "legacy-source-repo-id",
      vm: null,
      conversations: [],
      deployments: [],
      productionDomain: null,
      productionDeploymentId: null,
    };

    mocks.requireCurrentUser.mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
    });
    mocks.getOrCreateIdentitySession.mockResolvedValue({
      identityId: "legacy-identity-id",
      identity: { kind: "legacy-identity" },
    });
    mocks.createFreestyleAccessContext.mockReturnValue(access);
    mocks.listProjectsForUser.mockResolvedValue([
      {
        id: "product-project-id",
        ownerUserId: "user-id",
        wrapperRepoId: "owned-wrapper-repo-id",
        sourceRepoId: "owned-source-repo-id",
        name: "Owned Project",
        createdAt: "2026-08-26T00:00:00.000Z",
        updatedAt: "2026-08-26T00:00:00.000Z",
        archivedAt: null,
      },
    ]);
    mocks.freestyleDeploymentProvider.listDeployments.mockResolvedValue([]);
    mocks.freestyleProjectStore.readMetadata.mockImplementation(
      async (repoId: string) =>
        repoId === "owned-wrapper-repo-id" ? ownedMetadata : legacyMetadata,
    );

    const { GET } = await import("./route");
    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      identityId: "legacy-identity-id",
      repositories: [
        {
          id: "owned-wrapper-repo-id",
          name: "Owned Project",
          metadata: ownedMetadata,
        },
        {
          id: "legacy-wrapper-repo-id",
          name: "Legacy Project",
          metadata: legacyMetadata,
        },
      ],
    });
    expect(response.status).toBe(200);
    expect(mocks.listProjectsForUser).toHaveBeenCalledWith("user-id");
    expect(access.listGitRepositories).toHaveBeenCalledWith(200);
    expect(mocks.freestyleProjectStore.readMetadata).toHaveBeenCalledWith(
      "owned-wrapper-repo-id",
    );
    expect(mocks.freestyleProjectStore.readMetadata).toHaveBeenCalledWith(
      "legacy-wrapper-repo-id",
    );
  });

  it("deduplicates owned and legacy repositories by wrapper repo id", async () => {
    const access = {
      identityId: "legacy-identity-id",
      listGitRepositories: vi.fn().mockResolvedValue([
        {
          id: "shared-wrapper-repo-id",
          name: "adorable-meta - Legacy Name",
        },
      ]),
    };
    const metadata = {
      version: 2,
      sourceRepoId: "source-repo-id",
      vm: null,
      conversations: [],
      deployments: [],
      productionDomain: null,
      productionDeploymentId: null,
    };

    mocks.requireCurrentUser.mockResolvedValue({ id: "user-id" });
    mocks.getOrCreateIdentitySession.mockResolvedValue({
      identityId: "legacy-identity-id",
      identity: { kind: "legacy-identity" },
    });
    mocks.createFreestyleAccessContext.mockReturnValue(access);
    mocks.listProjectsForUser.mockResolvedValue([
      {
        id: "product-project-id",
        ownerUserId: "user-id",
        wrapperRepoId: "shared-wrapper-repo-id",
        sourceRepoId: "source-repo-id",
        name: "Owned Name",
        createdAt: "2026-08-26T00:00:00.000Z",
        updatedAt: "2026-08-26T00:00:00.000Z",
        archivedAt: null,
      },
    ]);
    mocks.freestyleDeploymentProvider.listDeployments.mockResolvedValue([]);
    mocks.freestyleProjectStore.readMetadata.mockResolvedValue(metadata);

    const { GET } = await import("./route");
    const response = await GET();
    const payload = await response.json();

    expect(payload.repositories).toHaveLength(1);
    expect(payload.repositories[0]).toMatchObject({
      id: "shared-wrapper-repo-id",
      name: "Owned Name",
    });
    expect(mocks.freestyleProjectStore.readMetadata).toHaveBeenCalledTimes(1);
  });

  it("creates the project with the legacy Freestyle identity and persists ownership", async () => {
    const access = { identityId: "legacy-identity-id" };
    const result = {
      id: "wrapper-repo-id",
      metadata: {
        version: 2,
        sourceRepoId: "source-repo-id",
        conversations: [],
        deployments: [],
        productionDomain: null,
        productionDeploymentId: null,
      },
      conversationId: "conversation-id",
    };

    mocks.requireCurrentUser.mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
    });
    mocks.getOrCreateIdentitySession.mockResolvedValue({
      identityId: "legacy-identity-id",
      identity: { kind: "legacy-identity" },
    });
    mocks.createFreestyleAccessContext.mockReturnValue(access);
    mocks.projectApplicationService.createProject.mockResolvedValue(result);
    mocks.resolveOwnedProjectName.mockReturnValue("Project");

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://adorable.test/api/repos", {
        method: "POST",
        body: JSON.stringify({
          name: "Project",
          conversationTitle: "Initial conversation",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      id: "wrapper-repo-id",
      metadata: result.metadata,
      conversationId: "conversation-id",
    });
    expect(response.status).toBe(200);
    expect(mocks.createFreestyleAccessContext).toHaveBeenCalledWith({
      identityId: "legacy-identity-id",
      identity: { kind: "legacy-identity" },
    });
    expect(mocks.projectApplicationService.createProject).toHaveBeenCalledWith(
      {
        requestedName: "Project",
        requestedConversationTitle: "Initial conversation",
        githubRepoName: undefined,
      },
      { access },
    );
    expect(mocks.createOwnedProject).toHaveBeenCalledWith({
      ownerUserId: "user-id",
      wrapperRepoId: "wrapper-repo-id",
      sourceRepoId: "source-repo-id",
      name: "Project",
    });
  });

  it("returns a predictable 401 from POST before touching Freestyle when Supabase auth is missing", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new mocks.AuthenticationRequiredError(),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://adorable.test/api/repos", {
        method: "POST",
        body: JSON.stringify({ name: "Project" }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Authentication required.",
    });
    expect(response.status).toBe(401);
    expect(mocks.getOrCreateIdentitySession).not.toHaveBeenCalled();
    expect(mocks.projectApplicationService.createProject).not.toHaveBeenCalled();
    expect(mocks.createOwnedProject).not.toHaveBeenCalled();
  });
});
