import { describe, expect, it } from "vitest";
import {
  assertProjectOwnership,
  hasProjectOwnership,
  projectMatchesRepoId,
  ProjectOwnershipRequiredError,
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
): ProjectOwnershipStore => ({
  async findProjectForUserByRepoId(userId, repoId) {
    calls.push({ userId, repoId });
    return result;
  },
});

describe("projectMatchesRepoId", () => {
  it("matches wrapper and source repository ids", () => {
    expect(projectMatchesRepoId(project, "wrapper-repo-id")).toBe(true);
    expect(projectMatchesRepoId(project, "source-repo-id")).toBe(true);
    expect(projectMatchesRepoId(project, "other-repo-id")).toBe(false);
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
