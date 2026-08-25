"use client";

import { AssistantRuntimeProvider, useAuiState } from "@assistant-ui/react";
import {
  useAISDKRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useChat } from "@ai-sdk/react";
import { type UIMessage } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ThreadState = {
  isEmpty: boolean;
  isRunning: boolean;
};

type CreateFromGithubDetail = {
  githubRepoName: string;
};

const EMPTY_MESSAGES: UIMessage[] = [];

const extractUserPrompt = (messages: UIMessage[]): string | null => {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return null;

  const textPart = firstUserMessage.parts?.find((part) => part.type === "text");
  if (!textPart || !("text" in textPart)) return null;

  const clean = textPart.text.trim().replace(/\s+/g, " ");
  return clean || null;
};

export const Assistant = ({
  initialMessages,
  selectedProjectId = null,
  selectedConversationId = null,
  onThreadStateChange,
  onActiveConversationChange,
  welcome,
}: {
  initialMessages?: UIMessage[];
  selectedProjectId?: string | null;
  selectedConversationId?: string | null;
  onThreadStateChange?: (next: ThreadState) => void;
  onActiveConversationChange?: (
    projectId: string,
    conversationId: string,
  ) => void;
  welcome?: ReactNode;
}) => {
  const resolvedInitialMessages = initialMessages ?? EMPTY_MESSAGES;

  const [seedMessages, setSeedMessages] = useState<UIMessage[]>(
    resolvedInitialMessages,
  );
  const [runtimeVersion, setRuntimeVersion] = useState(0);
  const [localProjectId, setLocalProjectId] = useState<string | null>(
    selectedProjectId,
  );
  const [localConversationId, setLocalConversationId] = useState<string | null>(
    selectedConversationId,
  );
  const activeProjectIdRef = useRef<string | null>(selectedProjectId);
  const activeConversationIdRef = useRef<string | null>(selectedConversationId);
  const onActiveConversationChangeRef = useRef(onActiveConversationChange);
  const chatSessionIdRef = useRef(
    selectedConversationId
      ? `conversation:${selectedConversationId}`
      : selectedProjectId
        ? `project:${selectedProjectId}:draft`
        : "home:draft",
  );

  useEffect(() => {
    setSeedMessages(resolvedInitialMessages);
  }, [resolvedInitialMessages]);

  useEffect(() => {
    setLocalProjectId((previous) => selectedProjectId ?? previous);
    setLocalConversationId((previous) => selectedConversationId ?? previous);
  }, [selectedConversationId, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      activeProjectIdRef.current = selectedProjectId;
    }
    if (selectedConversationId) {
      activeConversationIdRef.current = selectedConversationId;
    }
  }, [selectedConversationId, selectedProjectId]);

  useEffect(() => {
    onActiveConversationChangeRef.current = onActiveConversationChange;
  }, [onActiveConversationChange]);

  useEffect(() => {
    const handleGoHome = () => {
      setSeedMessages(EMPTY_MESSAGES);
      setLocalProjectId(null);
      setLocalConversationId(null);
      activeProjectIdRef.current = null;
      activeConversationIdRef.current = null;
      chatSessionIdRef.current = `home:draft:${Date.now()}`;
      setRuntimeVersion((version) => version + 1);
    };

    window.addEventListener("adorable:go-home", handleGoHome);
    return () => {
      window.removeEventListener("adorable:go-home", handleGoHome);
    };
  }, []);

  useEffect(() => {
    const handleGoToRepo = (event: Event) => {
      const customEvent = event as CustomEvent<{ projectId: string }>;
      const detail = customEvent.detail;
      if (!detail?.projectId) return;

      setSeedMessages(EMPTY_MESSAGES);
      setLocalProjectId(detail.projectId);
      setLocalConversationId(null);
      activeProjectIdRef.current = detail.projectId;
      activeConversationIdRef.current = null;
      chatSessionIdRef.current = `project:${detail.projectId}:draft:${Date.now()}`;
      setRuntimeVersion((version) => version + 1);
    };

    window.addEventListener(
      "adorable:go-to-project",
      handleGoToRepo as EventListener,
    );
    return () => {
      window.removeEventListener(
        "adorable:go-to-project",
        handleGoToRepo as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleCreateFromGithub = async (event: Event) => {
      const customEvent = event as CustomEvent<CreateFromGithubDetail>;
      const githubRepoName = customEvent.detail?.githubRepoName?.trim();
      if (!githubRepoName) return;

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubRepoName }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const projectId = data.id as string | undefined;
      const conversationId = data.conversationId as string | undefined;

      if (!projectId || !conversationId) {
        return;
      }

      const nextPath = `/${projectId}/${conversationId}`;
      window.history.replaceState(window.history.state, "", nextPath);
      setSeedMessages(EMPTY_MESSAGES);
      setLocalProjectId(projectId);
      setLocalConversationId(conversationId);
      activeProjectIdRef.current = projectId;
      activeConversationIdRef.current = conversationId;
      chatSessionIdRef.current = `conversation:${conversationId}`;
      setRuntimeVersion((version) => version + 1);
      onActiveConversationChangeRef.current?.(projectId, conversationId);
      window.dispatchEvent(
        new CustomEvent("adorable:active-conversation", {
          detail: { projectId, conversationId },
        }),
      );
      window.dispatchEvent(new Event("adorable:projects-updated"));
    };

    window.addEventListener(
      "adorable:create-from-github",
      handleCreateFromGithub as EventListener,
    );
    return () => {
      window.removeEventListener(
        "adorable:create-from-github",
        handleCreateFromGithub as EventListener,
      );
    };
  }, []);

  const ensureActiveConversation = useCallback(
    async (
      requestedProjectName?: string,
      requestedConversationTitle?: string,
    ) => {
      const activeProjectId = activeProjectIdRef.current;
      const activeConversationId = activeConversationIdRef.current;

      if (activeProjectId && activeConversationId) {
        return {
          projectId: activeProjectId,
          conversationId: activeConversationId,
        };
      }

      if (activeProjectId) {
        const response = await fetch(
          `/api/projects/${activeProjectId}/conversations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              requestedConversationTitle
                ? { title: requestedConversationTitle }
                : {},
            ),
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to create a conversation for the selected project.",
          );
        }

        const data = await response.json();
        const conversationId = data.conversationId as string | undefined;

        if (!conversationId) {
          throw new Error("Conversation creation did not return an id.");
        }

        const nextPath = `/${activeProjectId}/${conversationId}`;
        window.history.replaceState(window.history.state, "", nextPath);
        setLocalConversationId(conversationId);
        activeConversationIdRef.current = conversationId;
        onActiveConversationChangeRef.current?.(
          activeProjectId,
          conversationId,
        );
        window.dispatchEvent(
          new CustomEvent("adorable:active-conversation", {
            detail: { projectId: activeProjectId, conversationId },
          }),
        );

        return {
          projectId: activeProjectId,
          conversationId,
        };
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          requestedProjectName || requestedConversationTitle
            ? {
                ...(requestedProjectName ? { name: requestedProjectName } : {}),
                ...(requestedConversationTitle
                  ? { conversationTitle: requestedConversationTitle }
                  : {}),
              }
            : {},
        ),
      });
      if (!response.ok) {
        throw new Error("Failed to create a project for this chat.");
      }

      const data = await response.json();
      const projectId = data.id as string | undefined;
      const conversationId = data.conversationId as string | undefined;

      if (!projectId || !conversationId) {
        throw new Error("Project creation did not return ids.");
      }

      const nextPath = `/${projectId}/${conversationId}`;
      window.history.replaceState(window.history.state, "", nextPath);
      setLocalProjectId(projectId);
      setLocalConversationId(conversationId);
      activeProjectIdRef.current = projectId;
      activeConversationIdRef.current = conversationId;
      onActiveConversationChangeRef.current?.(projectId, conversationId);
      window.dispatchEvent(
        new CustomEvent("adorable:active-conversation", {
          detail: { projectId, conversationId },
        }),
      );

      return {
        projectId,
        conversationId,
      };
    },
    [],
  );

  const runtimeKey = `${chatSessionIdRef.current}:${runtimeVersion}`;

  const handleThreadStateChange = useCallback(
    (next: ThreadState) => {
      onThreadStateChange?.(next);
      window.dispatchEvent(
        new CustomEvent("adorable:thread-state", {
          detail: {
            projectId: activeProjectIdRef.current,
            isRunning: next.isRunning,
          },
        }),
      );
    },
    [onThreadStateChange],
  );

  const dispatchProjectsUpdated = useCallback(() => {
    const projectId = activeProjectIdRef.current;
    if (!projectId) return;

    window.dispatchEvent(
      new CustomEvent("adorable:projects-updated", {
        detail: { projectId },
      }),
    );
  }, []);

  const handleChatFinish = useCallback(() => {
    dispatchProjectsUpdated();
  }, [dispatchProjectsUpdated]);

  const chat = useChat<UIMessage>({
    id: runtimeKey,
    transport: new AssistantChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async (options) => {
        const prompt = extractUserPrompt(options.messages);
        const projectName = prompt ? prompt.slice(0, 50) : undefined;
        const conversationTitle = prompt ? prompt.slice(0, 60) : undefined;
        const active = await ensureActiveConversation(
          projectName,
          conversationTitle,
        );

        if (prompt) {
          window.dispatchEvent(
            new CustomEvent("adorable:metadata-optimistic", {
              detail: {
                projectId: active.projectId,
                conversationId: active.conversationId,
                projectName: projectName,
                conversationTitle,
              },
            }),
          );
        }

        return {
          body: {
            ...options.body,
            messages: options.messages,
            metadata: options.requestMetadata,
            id: undefined,
            trigger: "submit-message",
            messageId: undefined,
            projectId: active.projectId,
            conversationId: active.conversationId,
          },
        };
      },
    }),
    messages: seedMessages,
    onFinish: handleChatFinish,
  });

  const runtime = useAISDKRuntime(chat);

  return (
    <AssistantRuntimeProvider key={runtimeKey} runtime={runtime}>
      <ThreadStateBridge onThreadStateChange={handleThreadStateChange} />
      <Thread welcome={welcome} />
    </AssistantRuntimeProvider>
  );
};

function ThreadStateBridge({
  onThreadStateChange,
}: {
  onThreadStateChange?: (next: ThreadState) => void;
}) {
  const isEmpty = useAuiState(({ thread }) => thread.isEmpty);
  const isRunning = useAuiState(({ thread }) => thread.isRunning);

  useEffect(() => {
    onThreadStateChange?.({ isEmpty, isRunning });
  }, [isEmpty, isRunning, onThreadStateChange]);

  return null;
}
