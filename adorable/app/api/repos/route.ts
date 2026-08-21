import { NextResponse } from "next/server";
import { freestyle } from "freestyle-sandboxes";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { projectApplicationService } from "@/lib/application/project-application-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";
import {
  ADORABLE_WRAPPER_REPO_PREFIX,
  type RepoDeploymentSummary,
  readRepoMetadata,
} from "@/lib/repo-storage";

const toDisplayRepoName = (name?: string | null) => {
  if (!name) return undefined;
  return name.startsWith(ADORABLE_WRAPPER_REPO_PREFIX)
    ? name.slice(ADORABLE_WRAPPER_REPO_PREFIX.length)
    : name;
};

type DeploymentEntry = {
  deploymentId: string;
  state: "building" | "deployed" | "failed";
  domains: string[];
};

const reconcileDeploymentState = (
  deployment: RepoDeploymentSummary,
  entries: DeploymentEntry[],
): RepoDeploymentSummary => {
  const matchById = deployment.deploymentId
    ? entries.find((entry) => entry.deploymentId === deployment.deploymentId)
    : undefined;

  const matchByDomain = entries.find((entry) =>
    entry.domains.includes(deployment.domain),
  );

  const match = matchById ?? matchByDomain;
  if (!match) {
    return {
      ...deployment,
      state: deployment.state === "deploying" ? "idle" : deployment.state,
    };
  }

  const state: RepoDeploymentSummary["state"] =
    match.state === "deployed"
      ? "live"
      : match.state === "failed"
        ? "failed"
        : "deploying";

  return {
    ...deployment,
    deploymentId: match.deploymentId ?? deployment.deploymentId,
    state,
  };
};

const toRepoResponse = async (
  repo: { id: string; name?: string | null },
  deploymentEntries: DeploymentEntry[],
) => {
  const metadata = await readRepoMetadata(repo.id);
  const repoDisplayName = toDisplayRepoName(repo.name);
  const metadataDisplayName = toDisplayRepoName(metadata?.name);
  const reconciledMetadata = metadata
    ? {
        ...metadata,
        deployments: metadata.deployments.map((deployment) =>
          reconcileDeploymentState(deployment, deploymentEntries),
        ),
      }
    : metadata;

  return {
    id: repo.id,
    name: repoDisplayName ?? metadataDisplayName ?? "Untitled Repo",
    metadata: reconciledMetadata,
  };
};

export async function GET() {
  const { identityId, identity } = await getOrCreateIdentitySession();
  const access = createFreestyleAccessContext({ identityId, identity });
  const repositories = await access.listGitRepositories(200);
  const wrapperRepositories = repositories.filter((repo) =>
    (repo.name ?? "").startsWith(ADORABLE_WRAPPER_REPO_PREFIX),
  );

  let deploymentEntries: DeploymentEntry[] = [];
  try {
    const { entries } = await freestyle.serverless.deployments.list({
      limit: 500,
    });
    deploymentEntries = entries as DeploymentEntry[];
  } catch {
    deploymentEntries = [];
  }

  const items = await Promise.all(
    wrapperRepositories.map((repo) => toRepoResponse(repo, deploymentEntries)),
  );

  return NextResponse.json({
    identityId,
    repositories: items,
  });
}

export async function POST(req: Request) {
  const { identityId, identity } = await getOrCreateIdentitySession();

  let requestedName: string | undefined;
  let requestedConversationTitle: string | undefined;
  let githubRepoName: string | undefined;
  try {
    const payload = (await req.json()) as {
      name?: string;
      conversationTitle?: string;
      githubRepoName?: string;
    };
    const nextName = payload?.name?.trim();
    const nextConversationTitle = payload?.conversationTitle?.trim();
    const nextGithubRepoName = payload?.githubRepoName?.trim();
    requestedName = nextName ? nextName : undefined;
    requestedConversationTitle = nextConversationTitle
      ? nextConversationTitle
      : undefined;
    githubRepoName = nextGithubRepoName ? nextGithubRepoName : undefined;
  } catch {
    requestedName = undefined;
    requestedConversationTitle = undefined;
    githubRepoName = undefined;
  }

  const result = await projectApplicationService.createProject(
    {
      requestedName,
      requestedConversationTitle,
      githubRepoName,
    },
    {
      access: createFreestyleAccessContext({
        identityId,
        identity,
      }),
    },
  );

  return NextResponse.json({
    id: result.id,
    metadata: result.metadata,
    conversationId: result.conversationId,
  });
}
