import { describe, expect, it } from "vitest";
import {
  assertProjectOwnership,
  createOwnedProject,
  hasProjectOwnership,
  listProjectsForUser,
  projectMatchesRepoId,
  ProjectOwnershipRequiredError,
  resolveOwnedProjectName,
  toProjectInsert,
  type CreateOwnedProjectInput,
  type ProductProject,
  type ProjectOwnershipStore,
} from "@/lib/product-auth/project-ownership";

const project: ProductProject = {
  id: "project-id",
  ownerUserId: "user-id",
  wrapperRepoId: "wrapper-repo-id",
  sourceRepoId: "source-repo-id",
  name: "Project",
  createdAt: "2026-08-26T00:00:00.000Z",
  updatedAt: "2026-08-26T00:00:00.000Z",
  archivedAt: null,
};

const createStore = (
  result: ProductProject | null,
  calls: Array<{ userId: string; repoId: string }> = [],
  createCalls: CreateOwnedProjectInput[] = [],
  listResult: ProductProject[] = [],
  listCalls: string[] = [],
): ProjectOwnershipStore => ({
  async createOwnedProject(input) {
    createCalls.push(input);
    return project;
  },
  async findProjectForUserByRepoId(userId, repoId) {
    calls.push({ userId, repoId });
    return result;
  },
  async listProjectsForUser(userId) {
    listCalls.push(userId);
    return listResult.filter((nextProject) => nextProject.archivedAt === null);
  },
});

describe("projectMatchesRepoId", () => {
  it("matches wrapper and source repository ids", () => {
    expect(projectMatchesRepoId(project, "wrapper-repo-id")).toBe(true);
    expect(projectMatchesRepoId(project, "source-repo-id")).toBe(true);
    expect(projectMatchesRepoId(project, "other-repo-id")).toBe(false);
  });
});

describe("toProjectInsert", () => {
  it("maps ownership input to the projects insert shape", () => {
    expect(
      toProjectInsert({
        ownerUserId: "user-id",
        wrapperRepoId: "wrapper-repo-id",
        sourceRepoId: "source-repo-id",
        name: "Project",
      }),
    ).toEqual({
      owner_user_id: "user-id",
      wrapper_repo_id: "wrapper-repo-id",
      source_repo_id: "source-repo-id",
      name: "Project",
    });
  });
});

describe("resolveOwnedProjectName", () => {
  it("uses requestedName before githubRepoName", () => {
    expect(
      resolveOwnedProjectName({
        requestedName: "Requested",
        githubRepoName: "owner/github-name",
      }),
    ).toBe("Requested");
  });

  it("infers the name from githubRepoName when requestedName is missing", () => {
    expect(
      resolveOwnedProjectName({
        githubRepoName: "owner/github-name",
      }),
    ).toBe("github-name");
  });

  it("falls back to Project", () => {
    expect(resolveOwnedProjectName({})).toBe("Project");
  });
});

describe("createOwnedProject", () => {
  it("persists ownership through the provided store", async () => {
    const createCalls: CreateOwnedProjectInput[] = [];
    const input = {
      ownerUserId: "user-id",
      wrapperRepoId: "wrapper-repo-id",
      sourceRepoId: "source-repo-id",
      name: "Project",
    };

    await expect(
      createOwnedProject(input, createStore(null, [], createCalls)),
    ).resolves.toBe(project);

    expect(createCalls).toEqual([input]);
  });

  it("propagates ownership store errors", async () => {
    const error = new Error("insert failed");
    const store = {
      async createOwnedProject() {
        throw error;
      },
      async findProjectForUserByRepoId() {
        return null;
      },
    } satisfies ProjectOwnershipStore;

    await expect(
      createOwnedProject(
        {
          ownerUserId: "user-id",
          wrapperRepoId: "wrapper-repo-id",
          sourceRepoId: "source-repo-id",
          name: "Project",
        },
        store,
      ),
    ).rejects.toBe(error);
  });
});

describe("listProjectsForUser", () => {
  it("lists active projects for the provided owner", async () => {
    const listCalls: string[] = [];
    const archivedProject: ProductProject = {
      ...project,
      id: "archived-project-id",
      wrapperRepoId: "archived-wrapper-repo-id",
      archivedAt: "2026-08-26T00:00:00.000Z",
    };

    await expect(
      listProjectsForUser(
        "user-id",
        createStore(null, [], [], [project, archivedProject], listCalls),
      ),
    ).resolves.toEqual([project]);

    expect(listCalls).toEqual(["user-id"]);
  });

  it("propagates ownership list errors", async () => {
    const error = new Error("list failed");
    const store = {
      async createOwnedProject() {
        return project;
      },
      async findProjectForUserByRepoId() {
        return null;
      },
      async listProjectsForUser() {
        throw error;
      },
    } satisfies ProjectOwnershipStore;

    await expect(listProjectsForUser("user-id", store)).rejects.toBe(error);
  });
});

describe("hasProjectOwnership", () => {
  it("returns true when the ownership store finds a matching project", async () => {
    const calls: Array<{ userId: string; repoId: string }> = [];

    await expect(
      hasProjectOwnership(
        "user-id",
        "wrapper-repo-id",
        createStore(project, calls),
      ),
    ).resolves.toBe(true);

    expect(calls).toEqual([
      { userId: "user-id", repoId: "wrapper-repo-id" },
    ]);
  });

  it("returns false when the store finds no project", async () => {
    await expect(
      hasProjectOwnership("user-id", "other-repo-id", createStore(null)),
    ).resolves.toBe(false);
  });
});

describe("assertProjectOwnership", () => {
  it("throws a predictable forbidden error when ownership is missing", async () => {
    await expect(
      assertProjectOwnership("user-id", "other-repo-id", createStore(null)),
    ).rejects.toBeInstanceOf(ProjectOwnershipRequiredError);
  });
});
