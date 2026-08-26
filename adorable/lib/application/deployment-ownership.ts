import type { DeploymentEntry } from "@/lib/ports";
import type { RepoMetadata } from "@/lib/project-metadata";

export const deploymentBelongsToProject = async (
  metadata: RepoMetadata,
  deploymentId: string,
  listDeployments: (limit: number) => Promise<DeploymentEntry[]>,
): Promise<boolean> => {
  if (
    metadata.deployments.some(
      (deployment) => deployment.deploymentId === deploymentId,
    )
  ) {
    return true;
  }

  const knownDomains = new Set(
    metadata.deployments.map((deployment) => deployment.domain),
  );
  if (knownDomains.size === 0) return false;

  try {
    const entries = await listDeployments(500);
    const match = entries.find((entry) => entry.deploymentId === deploymentId);
    return Boolean(
      match?.domains.some((domain) => knownDomains.has(domain)),
    );
  } catch {
    return false;
  }
};
