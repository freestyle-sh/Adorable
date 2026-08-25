import { Assistant } from "../assistant";
import { ProjectWelcome } from "@/components/assistant-ui/project-welcome";

export default async function RepoPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <Assistant
      initialMessages={[]}
      selectedProjectId={projectId}
      selectedConversationId={null}
      welcome={<ProjectWelcome />}
    />
  );
}
