import { NextResponse } from "next/server";
import { freestyleProjectStore } from "@/lib/adapters";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import {
  isValidProductionDomain,
  normalizeProductionDomain,
} from "@/lib/application/production-domain";
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

  let requestedDomain = "";
  try {
    const payload = (await req.json()) as { domain?: string };
    requestedDomain = payload?.domain ?? "";
  } catch {
    requestedDomain = "";
  }

  const domain = normalizeProductionDomain(requestedDomain);
  if (!domain || !isValidProductionDomain(domain)) {
    return NextResponse.json(
      { error: "Domain must be a valid hostname ending in .style.dev" },
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

  const nextMetadata = await freestyleProjectStore.setProductionDomain({
    repoId,
    metadata,
    domain,
  });

  return NextResponse.json({
    productionDomain: nextMetadata.productionDomain,
    productionDeploymentId: nextMetadata.productionDeploymentId,
  });
}
