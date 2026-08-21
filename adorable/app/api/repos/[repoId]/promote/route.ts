import { NextResponse } from "next/server";
import { freestyleDeploymentProvider } from "@/lib/adapters";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";
import {
  promoteRepoDeploymentToProduction,
  type RepoMetadata,
  readRepoMetadata,
} from "@/lib/repo-storage";

const assertRepoAccess = async (repoId: string) => {
  const { identityId, identity } = await getOrCreateIdentitySession();
  const access = createFreestyleAccessContext({
    identityId,
    identity,
  });
  return access.hasGitRepoAccess(repoId);
};

type DeploymentEntry = {
  deploymentId: string;
  domains: string[];
};

const ownsDeployment = async (
  metadata: RepoMetadata,
  deploymentId: string,
) => {
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
    const entries = await freestyleDeploymentProvider.listDeployments(500);
    const match = (entries as DeploymentEntry[]).find(
      (entry) => entry.deploymentId === deploymentId,
    );
    return Boolean(
      match?.domains.some((domain) => knownDomains.has(domain)),
    );
  } catch {
    return false;
  }
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;

  if (!(await assertRepoAccess(repoId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let deploymentId = "";
  try {
    const payload = (await req.json()) as { deploymentId?: string };
    deploymentId = payload?.deploymentId?.trim() ?? "";
  } catch {
    deploymentId = "";
  }

  if (!deploymentId) {
    return NextResponse.json(
      { error: "deploymentId is required" },
      { status: 400 },
    );
  }

  const metadata = await readRepoMetadata(repoId);
  if (!metadata) {
    return NextResponse.json(
      { error: "Repository metadata not found" },
      { status: 404 },
    );
  }

  if (!metadata.productionDomain) {
    return NextResponse.json(
      { error: "Configure a production domain ending in .style.dev first" },
      { status: 400 },
    );
  }

  if (!(await ownsDeployment(metadata, deploymentId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await freestyleDeploymentProvider.createDomainMapping({
    domain: metadata.productionDomain,
    deploymentId,
  });

  const nextMetadata = await promoteRepoDeploymentToProduction(
    repoId,
    metadata,
    deploymentId,
  );

  return NextResponse.json({
    productionDomain: nextMetadata.productionDomain,
    productionDeploymentId: nextMetadata.productionDeploymentId,
  });
}
