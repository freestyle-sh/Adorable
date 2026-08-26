import { freestyle } from "freestyle-sandboxes";

export const DEPLOYMENT_DOMAIN_SUFFIX = "adorable.style.dev";

export type DeploymentUiStatus = {
  state: "idle" | "deploying" | "live" | "failed";
  domain: string | null;
  url: string | null;
  commitSha: string | null;
  deploymentId: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type DeploymentTimelineEntry = {
  commitSha: string;
  commitMessage: string;
  commitDate: string;
  domain: string;
  url: string;
  deploymentId: string | null;
  state: "idle" | "deploying" | "live" | "failed";
};

const isBootstrapCommit = (message: string | undefined) =>
  (message ?? "").trim().toLowerCase() === "initial commit";

export const getLatestCommitSha = async (repoId: string) => {
  const repo = freestyle.git.repos.ref({ repoId });
  const commits = await repo.commits.list({ limit: 50, order: "desc" });
  const latestUserCommit = commits.commits.find(
    (commit) => !isBootstrapCommit(commit.message),
  );
  return latestUserCommit?.sha ?? null;
};

export const getDomainForCommit = (commitSha: string) => {
  return `${commitSha.slice(0, 12)}-${DEPLOYMENT_DOMAIN_SUFFIX}`;
};

export const mapDeploymentStateToUiState = (
  deploymentState: string,
): DeploymentUiStatus["state"] => {
  return deploymentState === "deployed"
    ? "live"
    : deploymentState === "failed"
      ? "failed"
      : "deploying";
};

export const getDeploymentStatusForLatestCommit = async (
  repoId: string,
  isAgentRunning: boolean,
): Promise<DeploymentUiStatus> => {
  const commitSha = await getLatestCommitSha(repoId);
  const updatedAt = new Date().toISOString();

  if (!commitSha) {
    return {
      state: "idle",
      domain: null,
      url: null,
      commitSha: null,
      deploymentId: null,
      lastError: "No commits found for repository.",
      updatedAt,
    };
  }

  const domain = getDomainForCommit(commitSha);
  const { entries } = await freestyle.serverless.deployments.list({
    limit: 200,
  });

  const match = entries.find((entry) => entry.domains.includes(domain));

  if (!match) {
    return {
      state: isAgentRunning ? "deploying" : "idle",
      domain,
      url: `https://${domain}`,
      commitSha,
      deploymentId: null,
      lastError: null,
      updatedAt,
    };
  }

  const state = mapDeploymentStateToUiState(match.state);

  return {
    state,
    domain,
    url: `https://${domain}`,
    commitSha,
    deploymentId: match.deploymentId,
    lastError: state === "failed" ? "Deployment reported failed state." : null,
    updatedAt,
  };
};

export const getDeploymentTimelineFromCommits = async (
  repoId: string,
  limit = 12,
): Promise<DeploymentTimelineEntry[]> => {
  const repo = freestyle.git.repos.ref({ repoId });
  const commits = await repo.commits.list({
    limit: 50,
    order: "desc",
  });
  const { entries } = await freestyle.serverless.deployments.list({
    limit: 500,
  });

  const userCommits = commits.commits
    .filter((commit) => !isBootstrapCommit(commit.message))
    .slice(0, limit);

  return userCommits.map((commit) => {
    const domain = getDomainForCommit(commit.sha);
    const match = entries.find((entry) => entry.domains.includes(domain));

    const state: DeploymentTimelineEntry["state"] = !match
      ? "idle"
      : mapDeploymentStateToUiState(match.state);

    return {
      commitSha: commit.sha,
      commitMessage: commit.message,
      commitDate: commit.author?.date ?? new Date().toISOString(),
      domain,
      url: `https://${domain}`,
      deploymentId: match?.deploymentId ?? null,
      state,
    };
  });
};
