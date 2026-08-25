import { Assistant } from "../../assistant";
import { ProjectWelcome } from "@/components/assistant-ui/project-welcome";
import { authorizeProject } from "@/lib/project-access";
import { readConversationMessages } from "@/lib/project-storage";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ projectId: string; conversationId: string }>;
}) {
  const { projectId, conversationId } = await params;

  const initialMessages = (await authorizeProject(projectId))
    ? await readConversationMessages(projectId, conversationId)
    : [];

  return (
    <Assistant
      initialMessages={initialMessages}
      selectedProjectId={projectId}
      selectedConversationId={conversationId}
      welcome={<ProjectWelcome />}
    />
  );
}
