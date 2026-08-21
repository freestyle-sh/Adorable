import { freestyleDeploymentProvider } from "@/lib/adapters";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";
import { resolveSourceRepoId } from "@/lib/repo-storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get("repoId");
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 12;

  if (!repoId) {
    return Response.json(
      { ok: false, error: "Missing repoId." },
      { status: 400 },
    );
  }

  try {
    const { identityId, identity } = await getOrCreateIdentitySession();
    const access = createFreestyleAccessContext({
      identityId,
      identity,
    });

    if (!(await access.hasGitRepoAccess(repoId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const sourceRepoId = await resolveSourceRepoId(repoId);
    const timeline = await freestyleDeploymentProvider.getTimelineFromCommits(
      sourceRepoId,
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 30) : 12,
    );
    return Response.json({ ok: true, timeline });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch deployment timeline.",
      },
      { status: 500 },
    );
  }
}
