import { Assistant } from "../../assistant";
import { RepoWelcome } from "@/components/assistant-ui/repo-welcome";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";
import { readConversationMessages } from "@/lib/repo-storage";

const hasRepoAccess = async (repoId: string) => {
  const { identityId, identity } = await getOrCreateIdentitySession();
  const access = createFreestyleAccessContext({
    identityId,
    identity,
  });
  return access.hasGitRepoAccess(repoId);
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ repoId: string; conversationId: string }>;
}) {
  const { repoId, conversationId } = await params;

  if (!(await hasRepoAccess(repoId))) {
    return (
      <Assistant
        initialMessages={[]}
        selectedRepoId={repoId}
        selectedConversationId={conversationId}
        welcome={<RepoWelcome />}
      />
    );
  }

  const initialMessages = await readConversationMessages(
    repoId,
    conversationId,
  );
  return (
    <Assistant
      initialMessages={initialMessages}
      selectedRepoId={repoId}
      selectedConversationId={conversationId}
      welcome={<RepoWelcome />}
    />
  );
}
