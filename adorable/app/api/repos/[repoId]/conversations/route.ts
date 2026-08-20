import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";
import { createConversationInRepo, readRepoMetadata } from "@/lib/repo-storage";

const assertRepoAccess = async (repoId: string) => {
  const { identityId, identity } = await getOrCreateIdentitySession();
  const access = createFreestyleAccessContext({
    identityId,
    identity,
  });
  return access.hasGitRepoAccess(repoId);
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;

  if (!(await assertRepoAccess(repoId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const metadata = await readRepoMetadata(repoId);
  if (!metadata) {
    return NextResponse.json(
      { error: "Repository metadata not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ conversations: metadata.conversations });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;

  let requestedTitle: string | undefined;
  try {
    const payload = (await req.json()) as { title?: string };
    const nextTitle = payload?.title?.trim();
    requestedTitle = nextTitle ? nextTitle : undefined;
  } catch {
    requestedTitle = undefined;
  }

  if (!(await assertRepoAccess(repoId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const metadata = await readRepoMetadata(repoId);
  if (!metadata) {
    return NextResponse.json(
      { error: "Repository metadata not found" },
      { status: 404 },
    );
  }

  const conversationId = randomUUID();
  const next = await createConversationInRepo(
    repoId,
    metadata,
    conversationId,
    requestedTitle,
  );

  return NextResponse.json({
    conversationId,
    conversations: next.conversations,
  });
}
