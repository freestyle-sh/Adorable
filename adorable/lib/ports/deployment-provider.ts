import type {
  DeploymentTimelineEntry,
  DeploymentUiStatus,
} from "@/lib/deployment-status";

export type DeploymentEntry = {
  deploymentId: string;
  state: "building" | "deployed" | "failed";
  domains: string[];
};

export type CreateDeploymentInput = {
  repoId: string;
  domains: string[];
  build?: boolean;
};

export type CreateDeploymentResult = {
  deploymentId: string | null;
};

export interface DeploymentProvider {
  createDeployment(input: CreateDeploymentInput): Promise<CreateDeploymentResult>;
  listDeployments(limit?: number): Promise<DeploymentEntry[]>;
  createDomainMapping(input: {
    domain: string;
    deploymentId: string;
  }): Promise<void>;
  /**
   * Transitional helper matching the current deployment UI, where deployment
   * domains are derived from Git commits.
   */
  getStatusForLatestCommit(
    repoId: string,
    isAgentRunning: boolean,
  ): Promise<DeploymentUiStatus>;
  /**
   * Transitional helper matching the current deployment UI, where deployment
   * history is reconstructed from Git commits.
   */
  getTimelineFromCommits(
    repoId: string,
    limit?: number,
  ): Promise<DeploymentTimelineEntry[]>;
  getDomainForCommit(commitSha: string): string;
}
