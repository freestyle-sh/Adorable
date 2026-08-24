import {
  freestyleDeploymentProvider,
  freestyleProjectStore,
} from "@/lib/adapters";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get("repoId");
  const runningParam = searchParams.get("running");
  const isAgentRunning = runningParam === "1" || runningParam === "true";

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

    const sourceRepoId =
      await freestyleProjectStore.resolveSourceRepoId(repoId);
    const status = await freestyleDeploymentProvider.getStatusForLatestCommit(
      sourceRepoId,
      isAgentRunning,
    );
    return Response.json({ ok: true, ...status });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch deployment status.",
      },
      { status: 500 },
    );
  }
}
