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

const redirectToLogin = () => {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
};

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
  selectedRepoId = null,
  selectedConversationId = null,
  onThreadStateChange,
  onActiveConversationChange,
  welcome,
}: {
  initialMessages?: UIMessage[];
  selectedRepoId?: string | null;
  selectedConversationId?: string | null;
  onThreadStateChange?: (next: ThreadState) => void;
  onActiveConversationChange?: (repoId: string, conversationId: string) => void;
  welcome?: ReactNode;
}) => {
  const resolvedInitialMessages = initialMessages ?? EMPTY_MESSAGES;

  const [seedMessages, setSeedMessages] = useState<UIMessage[]>(
    resolvedInitialMessages,
  );
  const [runtimeVersion, setRuntimeVersion] = useState(0);
  const [localRepoId, setLocalRepoId] = useState<string | null>(selectedRepoId);
  const [localConversationId, setLocalConversationId] = useState<string | null>(
    selectedConversationId,
  );
  const activeRepoIdRef = useRef<string | null>(selectedRepoId);
  const activeConversationIdRef = useRef<string | null>(selectedConversationId);
  const onActiveConversationChangeRef = useRef(onActiveConversationChange);
  const chatSessionIdRef = useRef(
    selectedConversationId
      ? `conversation:${selectedConversationId}`
      : selectedRepoId
        ? `repo:${selectedRepoId}:draft`
        : "home:draft",
  );

  useEffect(() => {
    setSeedMessages(resolvedInitialMessages);
  }, [resolvedInitialMessages]);

  useEffect(() => {
    setLocalRepoId((previous) => selectedRepoId ?? previous);
    setLocalConversationId((previous) => selectedConversationId ?? previous);
  }, [selectedConversationId, selectedRepoId]);

  useEffect(() => {
    if (selectedRepoId) {
      activeRepoIdRef.current = selectedRepoId;
    }
    if (selectedConversationId) {
      activeConversationIdRef.current = selectedConversationId;
    }
  }, [selectedConversationId, selectedRepoId]);

  useEffect(() => {
    onActiveConversationChangeRef.current = onActiveConversationChange;
  }, [onActiveConversationChange]);

  useEffect(() => {
    const handleGoHome = () => {
      setSeedMessages(EMPTY_MESSAGES);
      setLocalRepoId(null);
      setLocalConversationId(null);
      activeRepoIdRef.current = null;
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
      const customEvent = event as CustomEvent<{ repoId: string }>;
      const detail = customEvent.detail;
      if (!detail?.repoId) return;

      setSeedMessages(EMPTY_MESSAGES);
      setLocalRepoId(detail.repoId);
      setLocalConversationId(null);
      activeRepoIdRef.current = detail.repoId;
      activeConversationIdRef.current = null;
      chatSessionIdRef.current = `repo:${detail.repoId}:draft:${Date.now()}`;
      setRuntimeVersion((version) => version + 1);
    };

    window.addEventListener(
      "adorable:go-to-repo",
      handleGoToRepo as EventListener,
    );
    return () => {
      window.removeEventListener(
        "adorable:go-to-repo",
        handleGoToRepo as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleCreateFromGithub = async (event: Event) => {
      const customEvent = event as CustomEvent<CreateFromGithubDetail>;
      const githubRepoName = customEvent.detail?.githubRepoName?.trim();
      if (!githubRepoName) return;

      const response = await fetch("/api/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubRepoName }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
        }
        return;
      }

      const data = await response.json();
      const repoId = data.id as string | undefined;
      const conversationId = data.conversationId as string | undefined;

      if (!repoId || !conversationId) {
        return;
      }

      const nextPath = `/${repoId}/${conversationId}`;
      window.history.replaceState(window.history.state, "", nextPath);
      setSeedMessages(EMPTY_MESSAGES);
      setLocalRepoId(repoId);
      setLocalConversationId(conversationId);
      activeRepoIdRef.current = repoId;
      activeConversationIdRef.current = conversationId;
      chatSessionIdRef.current = `conversation:${conversationId}`;
      setRuntimeVersion((version) => version + 1);
      onActiveConversationChangeRef.current?.(repoId, conversationId);
      window.dispatchEvent(
        new CustomEvent("adorable:active-conversation", {
          detail: { repoId, conversationId },
        }),
      );
      window.dispatchEvent(new Event("adorable:repos-updated"));
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
    async (requestedRepoName?: string, requestedConversationTitle?: string) => {
      const activeRepoId = activeRepoIdRef.current;
      const activeConversationId = activeConversationIdRef.current;

      if (activeRepoId && activeConversationId) {
        return {
          repoId: activeRepoId,
          conversationId: activeConversationId,
        };
      }

      if (activeRepoId) {
        const response = await fetch(
          `/api/repos/${activeRepoId}/conversations`,
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
            "Failed to create a conversation for the selected repo.",
          );
        }

        const data = await response.json();
        const conversationId = data.conversationId as string | undefined;

        if (!conversationId) {
          throw new Error("Conversation creation did not return an id.");
        }

        const nextPath = `/${activeRepoId}/${conversationId}`;
        window.history.replaceState(window.history.state, "", nextPath);
        setLocalConversationId(conversationId);
        activeConversationIdRef.current = conversationId;
        onActiveConversationChangeRef.current?.(activeRepoId, conversationId);
        window.dispatchEvent(
          new CustomEvent("adorable:active-conversation", {
            detail: { repoId: activeRepoId, conversationId },
          }),
        );

        return {
          repoId: activeRepoId,
          conversationId,
        };
      }

      const response = await fetch("/api/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          requestedRepoName || requestedConversationTitle
            ? {
                ...(requestedRepoName ? { name: requestedRepoName } : {}),
                ...(requestedConversationTitle
                  ? { conversationTitle: requestedConversationTitle }
                  : {}),
              }
            : {},
        ),
      });
      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
        }
        throw new Error("Failed to create a repository for this chat.");
      }

      const data = await response.json();
      const repoId = data.id as string | undefined;
      const conversationId = data.conversationId as string | undefined;

      if (!repoId || !conversationId) {
        throw new Error("Repository creation did not return ids.");
      }

      const nextPath = `/${repoId}/${conversationId}`;
      window.history.replaceState(window.history.state, "", nextPath);
      setLocalRepoId(repoId);
      setLocalConversationId(conversationId);
      activeRepoIdRef.current = repoId;
      activeConversationIdRef.current = conversationId;
      onActiveConversationChangeRef.current?.(repoId, conversationId);
      window.dispatchEvent(
        new CustomEvent("adorable:active-conversation", {
          detail: { repoId, conversationId },
        }),
      );

      return {
        repoId,
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
            repoId: activeRepoIdRef.current,
            isRunning: next.isRunning,
          },
        }),
      );
    },
    [onThreadStateChange],
  );

  const dispatchReposUpdated = useCallback(() => {
    const repoId = activeRepoIdRef.current;
    if (!repoId) return;

    window.dispatchEvent(
      new CustomEvent("adorable:repos-updated", {
        detail: { repoId },
      }),
    );
  }, []);

  const handleChatFinish = useCallback(() => {
    dispatchReposUpdated();
  }, [dispatchReposUpdated]);

  const chat = useChat<UIMessage>({
    id: runtimeKey,
    transport: new AssistantChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async (options) => {
        const prompt = extractUserPrompt(options.messages);
        const repoName = prompt ? prompt.slice(0, 50) : undefined;
        const conversationTitle = prompt ? prompt.slice(0, 60) : undefined;
        const active = await ensureActiveConversation(
          repoName,
          conversationTitle,
        );

        if (prompt) {
          window.dispatchEvent(
            new CustomEvent("adorable:metadata-optimistic", {
              detail: {
                repoId: active.repoId,
                conversationId: active.conversationId,
                repoName: repoName,
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
            repoId: active.repoId,
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
