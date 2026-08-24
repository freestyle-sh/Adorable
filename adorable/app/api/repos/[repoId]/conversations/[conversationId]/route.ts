import { NextResponse } from "next/server";
import { freestyleConversationStore } from "@/lib/adapters";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";

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
  { params }: { params: Promise<{ repoId: string; conversationId: string }> },
) {
  const { repoId, conversationId } = await params;

  if (!(await assertRepoAccess(repoId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await freestyleConversationStore.readMessages(
    repoId,
    conversationId,
  );
  return NextResponse.json({ messages });
}
