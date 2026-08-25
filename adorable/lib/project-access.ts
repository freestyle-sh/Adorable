import { listPermittedVmIds } from "./identity-session";
import { readProjectMetadata } from "./project-storage";
import type { ProjectMetadata } from "./project-types";

/**
 * A visitor may act on a project when their identity has been granted its dev
 * VM. Returns the project's metadata so callers do not read it twice.
 */
export const authorizeProject = async (
  projectId: string,
): Promise<ProjectMetadata | null> => {
  const permitted = await listPermittedVmIds();
  if (!permitted.has(projectId)) return null;
  return readProjectMetadata(projectId);
};
