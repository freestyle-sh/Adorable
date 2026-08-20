import { freestyle } from "freestyle-sandboxes";
import {
  getDeploymentStatusForLatestCommit,
  getDeploymentTimelineFromCommits,
  getDomainForCommit,
} from "@/lib/deployment-status";
import type {
  CreateDeploymentInput,
  DeploymentEntry,
  DeploymentProvider,
} from "@/lib/ports";

export class FreestyleDeploymentProvider implements DeploymentProvider {
  async createDeployment({ repoId, domains, build }: CreateDeploymentInput) {
    const deployment = await freestyle.serverless.deployments.create({
      repo: repoId,
      domains,
      build,
    });

    const deploymentId =
      deployment && typeof deployment === "object" && "id" in deployment
        ? String((deployment as Record<string, unknown>).id ?? "") || null
        : null;

    return { deploymentId };
  }

  async listDeployments(limit = 500): Promise<DeploymentEntry[]> {
    const { entries } = await freestyle.serverless.deployments.list({ limit });
    return entries as DeploymentEntry[];
  }

  async createDomainMapping({
    domain,
    deploymentId,
  }: Parameters<DeploymentProvider["createDomainMapping"]>[0]) {
    await freestyle.domains.mappings.create({
      domain,
      deploymentId,
    });
  }

  async getStatusForLatestCommit(repoId: string, isAgentRunning: boolean) {
    return getDeploymentStatusForLatestCommit(repoId, isAgentRunning);
  }

  async getTimelineFromCommits(repoId: string, limit?: number) {
    return getDeploymentTimelineFromCommits(repoId, limit);
  }

  getDomainForCommit(commitSha: string) {
    return getDomainForCommit(commitSha);
  }
}

export const freestyleDeploymentProvider = new FreestyleDeploymentProvider();
