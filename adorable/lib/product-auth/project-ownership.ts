import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type ProductProject = {
  id: string;
  ownerUserId: string;
  wrapperRepoId: string;
  sourceRepoId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ProjectOwnershipStore = {
  findProjectForUserByRepoId(
    userId: string,
    repoId: string,
  ): Promise<ProductProject | null>;
};

export class ProjectOwnershipRequiredError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ProjectOwnershipRequiredError";
  }
}

export const projectFromRow = (row: ProjectRow): ProductProject => ({
  id: row.id,
  ownerUserId: row.owner_user_id,
  wrapperRepoId: row.wrapper_repo_id,
  sourceRepoId: row.source_repo_id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export const projectMatchesRepoId = (
  project: Pick<ProductProject, "wrapperRepoId" | "sourceRepoId">,
  repoId: string,
) => project.wrapperRepoId === repoId || project.sourceRepoId === repoId;

export const createSupabaseProjectOwnershipStore = async (): Promise<
  ProjectOwnershipStore
> => {
  const supabase = await createSupabaseServerClient();

  const findByColumn = async (
    userId: string,
    column: "wrapper_repo_id" | "source_repo_id",
    repoId: string,
  ) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_user_id", userId)
      .eq(column, repoId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) throw error;
    return data ? projectFromRow(data) : null;
  };

  return {
    async findProjectForUserByRepoId(userId, repoId) {
      return (
        (await findByColumn(userId, "wrapper_repo_id", repoId)) ??
        (await findByColumn(userId, "source_repo_id", repoId))
      );
    },
  };
};

export const hasProjectOwnership = async (
  userId: string,
  repoId: string,
  store?: ProjectOwnershipStore,
): Promise<boolean> => {
  const resolvedStore = store ?? (await createSupabaseProjectOwnershipStore());
  const project = await resolvedStore.findProjectForUserByRepoId(userId, repoId);
  return Boolean(project && projectMatchesRepoId(project, repoId));
};

export const assertProjectOwnership = async (
  userId: string,
  repoId: string,
  store?: ProjectOwnershipStore,
): Promise<void> => {
  if (!(await hasProjectOwnership(userId, repoId, store))) {
    throw new ProjectOwnershipRequiredError();
  }
};
