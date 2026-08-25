"use client";

import { createContext, useContext } from "react";
import type { ProjectConversationSummary } from "@/lib/project-types";

export type ProjectConversation = ProjectConversationSummary;

type ProjectConversationsContextValue = {
  projectId: string | null;
  conversations: ProjectConversation[];
  onSelectConversation: (conversationId: string) => void;
};

const ProjectConversationsContext =
  createContext<ProjectConversationsContextValue>({
    projectId: null,
    conversations: [],
    onSelectConversation: () => {},
  });

export const ProjectConversationsProvider =
  ProjectConversationsContext.Provider;

export const useProjectConversations = () =>
  useContext(ProjectConversationsContext);
