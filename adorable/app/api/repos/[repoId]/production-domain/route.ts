import { NextResponse } from "next/server";
import { freestyleProjectStore } from "@/lib/adapters";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";

const PRODUCTION_SUFFIX = ".style.dev";

const assertRepoAccess = async (repoId: string) => {
  const { identityId, identity } = await getOrCreateIdentitySession();
  const access = createFreestyleAccessContext({
    identityId,
    identity,
  });
  return access.hasGitRepoAccess(repoId);
};

const normalizeDomain = (domain: string) => {
  const trimmed = domain.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  return withoutProtocol.split("/")[0] ?? "";
};

const isValidProductionDomain = (domain: string) => {
  return (
    domain.endsWith(PRODUCTION_SUFFIX) &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)*\.style\.dev$/.test(
      domain,
    )
  );
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

  const domain = normalizeDomain(requestedDomain);
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
