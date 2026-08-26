import { describe, expect, it } from "vitest";
import { deploymentBelongsToProject } from "@/lib/application/deployment-ownership";
import type { DeploymentEntry } from "@/lib/ports";
import type { RepoMetadata } from "@/lib/project-metadata";

const createMetadata = (
  deployments: RepoMetadata["deployments"],
): RepoMetadata => ({
  version: 2,
  sourceRepoId: "source-repo-id",
  vm: {
    vmId: "vm-id",
    previewUrl: "https://preview.example.test",
    devCommandTerminalUrl: "https://terminal.example.test",
    additionalTerminalsUrl: "https://terminals.example.test",
  },
  conversations: [],
  deployments,
  productionDomain: "project-a.style.dev",
  productionDeploymentId: null,
});

const createDeployment = ({
  deploymentId,
  domain,
}: {
  deploymentId: string | null;
  domain: string;
}): RepoMetadata["deployments"][number] => ({
  commitSha: "commit-sha",
  commitMessage: "Commit message",
  commitDate: "2026-08-26T00:00:00.000Z",
  domain,
  url: `https://${domain}`,
  deploymentId,
  state: "live",
});

const createDeploymentEntry = ({
  deploymentId,
  domains,
}: {
  deploymentId: string;
  domains: string[];
}): DeploymentEntry => ({
  deploymentId,
  state: "deployed",
  domains,
});

describe("deploymentBelongsToProject", () => {
  it("returns true for a direct metadata deploymentId match without fallback", async () => {
    const listDeploymentsCalls: number[] = [];
    const metadata = createMetadata([
      createDeployment({
        deploymentId: "dep-1",
        domain: "project-a.style.dev",
      }),
    ]);

    const result = await deploymentBelongsToProject(
      metadata,
      "dep-1",
      async (limit) => {
        listDeploymentsCalls.push(limit);
        return [];
      },
    );

    expect(result).toBe(true);
    expect(listDeploymentsCalls).toEqual([]);
  });

  it("returns false without fallback when there are no known domains", async () => {
    const listDeploymentsCalls: number[] = [];
    const metadata = createMetadata([]);

    const result = await deploymentBelongsToProject(
      metadata,
      "dep-1",
      async (limit) => {
        listDeploymentsCalls.push(limit);
        return [];
      },
    );

    expect(result).toBe(false);
    expect(listDeploymentsCalls).toEqual([]);
  });

  it("returns true when fallback finds the deployment with a known domain", async () => {
    const listDeploymentsCalls: number[] = [];
    const metadata = createMetadata([
      createDeployment({
        deploymentId: null,
        domain: "project-a.style.dev",
      }),
    ]);

    const result = await deploymentBelongsToProject(
      metadata,
      "dep-external",
      async (limit) => {
        listDeploymentsCalls.push(limit);
        return [
          createDeploymentEntry({
            deploymentId: "dep-external",
            domains: ["project-a.style.dev"],
          }),
        ];
      },
    );

    expect(result).toBe(true);
    expect(listDeploymentsCalls).toEqual([500]);
  });

  it("returns false when fallback finds the deployment with an unrelated domain", async () => {
    const listDeploymentsCalls: number[] = [];
    const metadata = createMetadata([
      createDeployment({
        deploymentId: null,
        domain: "project-a.style.dev",
      }),
    ]);

    const result = await deploymentBelongsToProject(
      metadata,
      "dep-external",
      async (limit) => {
        listDeploymentsCalls.push(limit);
        return [
          createDeploymentEntry({
            deploymentId: "dep-external",
            domains: ["other-project.style.dev"],
          }),
        ];
      },
    );

    expect(result).toBe(false);
    expect(listDeploymentsCalls).toEqual([500]);
  });

  it("returns false when fallback listing fails", async () => {
    const metadata = createMetadata([
      createDeployment({
        deploymentId: null,
        domain: "project-a.style.dev",
      }),
    ]);

    const result = await deploymentBelongsToProject(
      metadata,
      "dep-external",
      async () => {
        throw new Error("listDeployments failed");
      },
    );

    expect(result).toBe(false);
  });
});
