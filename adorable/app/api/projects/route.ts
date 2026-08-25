import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  getOrCreateIdentitySession,
  grantVmAccess,
} from "@/lib/identity-session";
import {
  createConversation,
  writeProjectMetadata,
} from "@/lib/project-storage";
import type { ProjectItem, ProjectMetadata } from "@/lib/project-types";
import { createProjectVms, listProjectVms } from "@/lib/project-vm";
import { readProjectMetadata } from "@/lib/project-storage";

const toProjectItem = (id: string, metadata: ProjectMetadata): ProjectItem => ({
  id,
  name: metadata.name,
  previewUrl: `https://${metadata.previewDomain}`,
  productionUrl: `https://${metadata.productionDomain}`,
  prodVmId: metadata.prodVmId,
  conversations: metadata.conversations,
  releases: metadata.releases,
  liveReleaseId: metadata.liveReleaseId,
});

export async function GET() {
  const { identityId, identity } = await getOrCreateIdentitySession();
  const permissions = await identity.permissions.vm.list();
  const permitted = new Set(permissions.map((permission) => permission.vmId));

  const vms = (await listProjectVms()).filter((vm) => permitted.has(vm.id));

  const projects = await Promise.all(
    vms.map(async (vm) =>
      toProjectItem(vm.id, await readProjectMetadata(vm.id)),
    ),
  );

  return NextResponse.json({ identityId, projects });
}

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => ({}))) as {
    name?: string;
    conversationTitle?: string;
    githubRepoName?: string;
  };

  const githubRepoName = payload.githubRepoName?.trim();
  const name =
    payload.name?.trim() ||
    githubRepoName?.split("/").pop()?.trim() ||
    "Untitled Project";

  const sourceRepoUrl = githubRepoName
    ? `https://github.com/${githubRepoName.replace(/^https?:\/\/github\.com\//, "")}`
    : undefined;

  const { projectId, previewDomain, productionDomain } = await createProjectVms(
    name,
    sourceRepoUrl,
  );

  await grantVmAccess([projectId]);

  const metadata: ProjectMetadata = {
    version: 3,
    name,
    createdAt: new Date().toISOString(),
    prodVmId: null,
    previewDomain,
    productionDomain,
    conversations: [],
    releases: [],
    liveReleaseId: null,
  };

  await writeProjectMetadata(projectId, metadata);

  const conversationId = randomUUID();
  const next = await createConversation(
    projectId,
    conversationId,
    payload.conversationTitle?.trim(),
  );

  return NextResponse.json({
    id: projectId,
    conversationId,
    project: toProjectItem(projectId, next),
  });
}
