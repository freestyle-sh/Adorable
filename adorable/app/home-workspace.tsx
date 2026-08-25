"use client";

import { useCallback, useState } from "react";
import { Assistant } from "./assistant";
import { ProjectWorkspaceShell } from "./[projectId]/project-workspace-shell";
import { HomeWelcome } from "@/components/assistant-ui/home-welcome";

export function HomeWorkspace() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const handleActiveConversationChange = useCallback(
    (projectId: string, conversationId: string) => {
      setActiveProjectId(projectId);
      setActiveConversationId(conversationId);
    },
    [],
  );

  return (
    <ProjectWorkspaceShell
      projectId={activeProjectId}
      selectedConversationIdOverride={activeConversationId}
    >
      <Assistant
        selectedProjectId={activeProjectId}
        selectedConversationId={activeConversationId}
        onActiveConversationChange={handleActiveConversationChange}
        welcome={<HomeWelcome />}
      />
    </ProjectWorkspaceShell>
  );
}
