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
    getOrCreateIdentitySession: vi.fn(),
    projectApplicationService: {
      createProject: vi.fn(),
    },
    requireCurrentUser: vi.fn(),
    resolveOwnedProjectName: vi.fn(),
  };
});

vi.mock("@/lib/adapters", () => ({
  freestyleDeploymentProvider: {
    listDeployments: vi.fn(),
  },
  freestyleProjectStore: {
    readMetadata: vi.fn(),
  },
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
  requireCurrentUser: mocks.requireCurrentUser,
  resolveOwnedProjectName: mocks.resolveOwnedProjectName,
}));

describe("POST /api/repos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns a predictable 401 before touching Freestyle when Supabase auth is missing", async () => {
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
