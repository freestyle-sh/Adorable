import { NextResponse } from "next/server";
import {
  freestyleDeploymentProvider,
  freestyleProjectStore,
} from "@/lib/adapters";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { deploymentBelongsToProject } from "@/lib/application/deployment-ownership";
import { getOrCreateIdentitySession } from "@/lib/identity-session";

const assertRepoAccess = async (repoId: string) => {
  const { identityId, identity } = await getOrCreateIdentitySession();
  const access = createFreestyleAccessContext({
    identityId,
    identity,
  });
  return access.hasGitRepoAccess(repoId);
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

  const metadata = await freestyleProjectStore.readMetadata(repoId);
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

  if (
    !(await deploymentBelongsToProject(metadata, deploymentId, (limit) =>
      freestyleDeploymentProvider.listDeployments(limit),
    ))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await freestyleDeploymentProvider.createDomainMapping({
    domain: metadata.productionDomain,
    deploymentId,
  });

  const nextMetadata =
    await freestyleProjectStore.promoteDeploymentToProduction({
      repoId,
      metadata,
      deploymentId,
    });

  return NextResponse.json({
    productionDomain: nextMetadata.productionDomain,
    productionDeploymentId: nextMetadata.productionDeploymentId,
  });
}
