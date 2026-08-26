"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RepoDeployment, RepoItem, RepoVmInfo } from "@/lib/repo-types";
import { ProjectConversationsProvider } from "@/lib/project-conversations-context";
import { ReposProvider } from "@/lib/repos-context";
import { PublishDialog } from "@/components/assistant-ui/publish-dialog";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  CodeIcon,
  Loader2Icon,
  MonitorIcon,
  PlusIcon,
  RotateCwIcon,
  XIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type TerminalTab = {
  id: string;
  label: string;
  url: string;
  closable: boolean;
};

type OptimisticMetadataDetail = {
  repoId: string;
  conversationId: string;
  repoName: string;
  conversationTitle: string;
};

type ThreadStateDetail = {
  repoId: string | null;
  isRunning: boolean;
};

const redirectToLogin = () => {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
};

export function RepoWorkspaceShell({
  repoId,
  children,
  selectedConversationIdOverride,
}: {
  repoId: string | null;
  children: React.ReactNode;
  selectedConversationIdOverride?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const selectedConversationId =
    selectedConversationIdOverride ??
    pathname.split("/").filter(Boolean)[1] ??
    null;

  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [threadIsRunning, setThreadIsRunning] = useState(false);
  const hasDeployingRepo = repos.some((repo) =>
    repo.deployments.some((deployment) => deployment.state === "deploying"),
  );

  const loadRepos = useCallback(async () => {
    const response = await fetch("/api/repos", { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 401) {
        redirectToLogin();
      }
      setReposLoading(false);
      return;
    }

    const data = await response.json();
    const nextRepos: RepoItem[] = Array.isArray(data.repositories)
      ? data.repositories.map(
          (repo: {
            id: string;
            name?: string;
            metadata?: {
              vm?: RepoVmInfo;
              conversations?: RepoItem["conversations"];
              deployments?: RepoDeployment[];
              productionDomain?: string | null;
              productionDeploymentId?: string | null;
            };
          }) => ({
            id: repo.id,
            name: repo.name ?? "Untitled Repo",
            vm: repo.metadata?.vm ?? null,
            conversations: Array.isArray(repo.metadata?.conversations)
              ? repo.metadata.conversations
              : [],
            deployments: Array.isArray(repo.metadata?.deployments)
              ? repo.metadata.deployments
              : [],
            productionDomain:
              typeof repo.metadata?.productionDomain === "string"
                ? repo.metadata.productionDomain
                : null,
            productionDeploymentId:
              typeof repo.metadata?.productionDeploymentId === "string"
                ? repo.metadata.productionDeploymentId
                : null,
          }),
        )
      : [];

    setRepos(nextRepos);
    setReposLoading(false);
  }, []);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  useEffect(() => {
    if (!repoId) return;
    loadRepos();
  }, [loadRepos, repoId]);

  useEffect(() => {
    if (!threadIsRunning && !hasDeployingRepo) return;
    const interval = window.setInterval(() => {
      void loadRepos();
    }, 10000);
    return () => {
      window.clearInterval(interval);
    };
  }, [loadRepos, threadIsRunning, hasDeployingRepo]);

  useEffect(() => {
    const handleReposUpdated = () => {
      void loadRepos();
    };

    window.addEventListener("adorable:repos-updated", handleReposUpdated);
    return () => {
      window.removeEventListener("adorable:repos-updated", handleReposUpdated);
    };
  }, [loadRepos]);

  useEffect(() => {
    const handleThreadState = (event: Event) => {
      const customEvent = event as CustomEvent<ThreadStateDetail>;
      const detail = customEvent.detail;
      if (!detail) return;
      if (repoId && detail.repoId && detail.repoId !== repoId) return;
      setThreadIsRunning(Boolean(detail.isRunning));
    };

    window.addEventListener(
      "adorable:thread-state",
      handleThreadState as EventListener,
    );
    return () => {
      window.removeEventListener(
        "adorable:thread-state",
        handleThreadState as EventListener,
      );
    };
  }, [repoId]);

  useEffect(() => {
    const handleOptimisticMetadata = (event: Event) => {
      const customEvent = event as CustomEvent<OptimisticMetadataDetail>;
      const detail = customEvent.detail;
      if (!detail?.repoId || !detail?.conversationId) return;

      const now = new Date().toISOString();

      setRepos((previous) =>
        previous.map((repo) => {
          if (repo.id !== detail.repoId) return repo;

          const hasConversation = repo.conversations.some(
            (conversation) => conversation.id === detail.conversationId,
          );

          const nextConversations = hasConversation
            ? repo.conversations.map((conversation) =>
                conversation.id === detail.conversationId
                  ? {
                      ...conversation,
                      title: detail.conversationTitle,
                      updatedAt: now,
                    }
                  : conversation,
              )
            : [
                {
                  id: detail.conversationId,
                  title: detail.conversationTitle,
                  createdAt: now,
                  updatedAt: now,
                },
                ...repo.conversations,
              ];

          return {
            ...repo,
            name: repo.name === "Untitled Repo" ? detail.repoName : repo.name,
            conversations: nextConversations,
          };
        }),
      );
    };

    window.addEventListener(
      "adorable:metadata-optimistic",
      handleOptimisticMetadata as EventListener,
    );
    return () => {
      window.removeEventListener(
        "adorable:metadata-optimistic",
        handleOptimisticMetadata as EventListener,
      );
    };
  }, []);

  const handleSelectProject = useCallback(
    (nextRepoId: string) => {
      router.push(`/${nextRepoId}`);
    },
    [router],
  );

  const selectedRepo = repoId
    ? (repos.find((repo) => repo.id === repoId) ?? null)
    : null;
  const showWorkspacePanel = Boolean(repoId);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");

  // Reset to chat view when navigating away
  useEffect(() => {
    if (!repoId) setMobileView("chat");
  }, [repoId]);

  // On mobile, compute which panel to show
  const gridColumns = (() => {
    if (!showWorkspacePanel) return "1fr 0fr";
    if (isMobile) return mobileView === "chat" ? "1fr 0fr" : "0fr 1fr";
    return "2fr 3fr";
  })();

  const conversationsContextValue = useMemo(
    () => ({
      repoId,
      conversations: selectedRepo?.conversations ?? [],
      onSelectConversation: (conversationId: string) => {
        if (repoId) {
          router.push(`/${repoId}/${conversationId}`);
        }
      },
    }),
    [repoId, selectedRepo?.conversations, router],
  );

  const onSetProductionDomain = useCallback(
    async (nextRepoId: string, domain: string) => {
      const response = await fetch(
        `/api/repos/${nextRepoId}/production-domain`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to configure production domain");
      }

      await loadRepos();
    },
    [loadRepos],
  );

  const onPromoteDeployment = useCallback(
    async (nextRepoId: string, deploymentId: string) => {
      const response = await fetch(`/api/repos/${nextRepoId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to promote deployment");
      }

      await loadRepos();
    },
    [loadRepos],
  );

  const reposContextValue = useMemo(
    () => ({
      repos,
      isLoading: reposLoading,
      onSelectProject: handleSelectProject,
    }),
    [repos, reposLoading, handleSelectProject],
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <ReposProvider value={reposContextValue}>
      <ProjectConversationsProvider value={conversationsContextValue}>
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          {/* Unified top bar */}
          {repoId && selectedRepo && (
            <div
              className={cn(
                "shrink-0 border-b bg-background transition-[grid-template-columns] duration-500 ease-in-out",
                isMobile ? "flex h-11 items-center" : "grid h-11",
              )}
              style={
                isMobile ? undefined : { gridTemplateColumns: gridColumns }
              }
            >
              {/* Left: back button */}
              {(!isMobile || mobileView === "chat") && (
                <div className="flex items-center px-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedConversationId) {
                        window.dispatchEvent(
                          new CustomEvent("adorable:go-to-repo", {
                            detail: { repoId },
                          }),
                        );
                        router.push(`/${repoId}`);
                      } else {
                        window.dispatchEvent(new Event("adorable:go-home"));
                        router.push("/");
                      }
                    }}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    title={
                      selectedConversationId ? "All conversations" : "All apps"
                    }
                  >
                    <ChevronLeftIcon className="size-3.5" />
                    <span className="text-sm font-medium">
                      {selectedConversationId
                        ? "All Conversations"
                        : "All Apps"}
                    </span>
                  </button>
                </div>
              )}

              {/* Mobile preview top bar: back to chat + publish */}
              {isMobile && mobileView === "preview" && (
                <div className="flex flex-1 items-center gap-1 px-2">
                  <button
                    type="button"
                    onClick={() => setMobileView("chat")}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronLeftIcon className="size-3.5" />
                    <span className="text-sm font-medium">Chat</span>
                  </button>
                  <div className="ml-auto">
                    {selectedRepo.vm?.previewUrl && (
                      <PublishDialog
                        repo={selectedRepo}
                        onSetProductionDomain={onSetProductionDomain}
                        onPromoteDeployment={onPromoteDeployment}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Right: browser controls + publish (desktop only) */}
              {!isMobile && (
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 transition-opacity duration-500",
                    showWorkspacePanel
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  )}
                >
                  {showWorkspacePanel && selectedRepo.vm?.previewUrl && (
                    <BrowserControls
                      previewUrl={selectedRepo.vm.previewUrl}
                      iframeRef={iframeRef}
                      repo={selectedRepo}
                      onSetProductionDomain={onSetProductionDomain}
                      onPromoteDeployment={onPromoteDeployment}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main content grid */}
          <div
            className={cn(
              "grid min-h-0 flex-1 pb-2",
              !isMobile &&
                "transition-[grid-template-columns] duration-500 ease-in-out",
            )}
            style={isMobile ? undefined : { gridTemplateColumns: gridColumns }}
          >
            <div
              className={cn(
                "relative min-w-0 overflow-hidden",
                isMobile && mobileView === "preview" && "hidden",
              )}
            >
              {children}
            </div>
            <div
              className={cn(
                "min-w-0 overflow-hidden",
                !isMobile && "transition-opacity duration-500",
                showWorkspacePanel && (!isMobile || mobileView === "preview")
                  ? "opacity-100"
                  : !isMobile && "pointer-events-none opacity-0",
                isMobile && mobileView === "chat" && "hidden",
              )}
            >
              {showWorkspacePanel &&
                (selectedRepo?.vm?.previewUrl ? (
                  <AppPreview
                    metadata={selectedRepo.vm}
                    iframeRef={iframeRef}
                  />
                ) : (
                  <PreviewPlaceholder />
                ))}
            </div>
          </div>

          {/* Mobile floating toggle button */}
          {isMobile && showWorkspacePanel && (
            <button
              type="button"
              onClick={() =>
                setMobileView((v) => (v === "chat" ? "preview" : "chat"))
              }
              className="fixed right-4 bottom-20 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
              title={mobileView === "chat" ? "Show preview" : "Show chat"}
            >
              {mobileView === "chat" ? (
                <MonitorIcon className="size-5" />
              ) : (
                <CodeIcon className="size-5" />
              )}
            </button>
          )}
        </div>
      </ProjectConversationsProvider>
    </ReposProvider>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b bg-muted/20 px-2">
        <div className="size-6 rounded bg-muted-foreground/8" />
        <div className="size-6 rounded bg-muted-foreground/8" />
        <div className="size-6 rounded bg-muted-foreground/8" />
        <div className="ml-1 h-7 flex-1 rounded-md bg-muted/50" />
      </div>

      <div className="h-[70%] overflow-hidden p-8">
        <div className="mx-auto max-w-md space-y-8">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-muted/60" />
            <div className="flex gap-4">
              <div className="h-3 w-12 animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted/40" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-6 w-56 animate-pulse rounded bg-muted/50" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted/30" />
            <div className="mt-2 h-9 w-28 animate-pulse rounded-lg bg-muted/40" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-muted/30 p-3"
              >
                <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
                <div className="h-2 w-3/4 animate-pulse rounded bg-muted/25" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-muted/20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-[30%] min-h-0 flex-col border-t">
        <div className="flex h-8 shrink-0 items-center bg-muted/20 px-3">
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted-foreground/10" />
        </div>
        <div className="flex-1 p-3">
          <div className="space-y-2">
            <div className="h-2.5 w-48 animate-pulse rounded bg-muted-foreground/8" />
            <div className="h-2.5 w-32 animate-pulse rounded bg-muted-foreground/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppPreview({
  metadata,
  iframeRef,
}: {
  metadata: RepoVmInfo;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [extraTerminals, setExtraTerminals] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTab] = useState("dev-server");
  const [counter, setCounter] = useState(1);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadedTerminals, setLoadedTerminals] = useState<Set<string>>(
    new Set(),
  );

  const markTerminalLoaded = useCallback((id: string) => {
    setLoadedTerminals((prev) => new Set(prev).add(id));
  }, []);

  useEffect(() => {
    setIframeLoaded(false);
  }, [metadata.previewUrl]);

  const addTerminal = useCallback(() => {
    if (!metadata.additionalTerminalsUrl) return;
    const id = `terminal-${counter}`;
    setExtraTerminals((prev) => [
      ...prev,
      {
        id,
        label: `Terminal ${counter}`,
        url: metadata.additionalTerminalsUrl,
        closable: true,
      },
    ]);
    setActiveTab(id);
    setCounter((c) => c + 1);
  }, [counter, metadata.additionalTerminalsUrl]);

  const closeTerminal = useCallback(
    (id: string) => {
      setExtraTerminals((prev) => prev.filter((t) => t.id !== id));
      if (activeTab === id) setActiveTab("dev-server");
    },
    [activeTab],
  );

  const allTabs: TerminalTab[] = [
    ...(metadata.devCommandTerminalUrl
      ? [
          {
            id: "dev-server",
            label: "Dev Server",
            url: metadata.devCommandTerminalUrl,
            closable: false,
          },
        ]
      : []),
    ...extraTerminals,
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative flex h-[70%] min-h-0 flex-col">
        <div className="relative min-h-0 flex-1 bg-muted/30">
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-3">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground/40">
                  Loading preview…
                </p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={metadata.previewUrl}
            className={cn(
              "h-full w-full transition-opacity duration-300",
              iframeLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>

      <div className="flex h-[30%] min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-0 border-y bg-[rgb(43,43,43)] px-1">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center gap-1 px-2 py-1.5 text-xs transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-foreground bg-[rgb(43,43,43)] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {tab.closable && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(tab.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      closeTerminal(tab.id);
                    }
                  }}
                  className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
                >
                  <XIcon className="size-3" />
                </span>
              )}
            </button>
          ))}

          {metadata.additionalTerminalsUrl && (
            <button
              type="button"
              onClick={addTerminal}
              className="ml-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="New terminal"
            >
              <PlusIcon className="size-3.5" />
            </button>
          )}
        </div>

        <div className="relative min-h-0 flex-1 bg-[rgb(30,30,30)]">
          {allTabs.map((tab) => (
            <iframe
              key={tab.id}
              src={tab.url}
              className={cn(
                "absolute inset-0 h-full w-full transition-opacity duration-500",
                loadedTerminals.has(tab.id) ? "opacity-100" : "opacity-0",
              )}
              style={{ display: activeTab === tab.id ? "block" : "none" }}
              onLoad={() => markTerminalLoaded(tab.id)}
            />
          ))}
          {allTabs.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No terminal selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BrowserControls({
  previewUrl,
  iframeRef,
  repo,
  onSetProductionDomain,
  onPromoteDeployment,
}: {
  previewUrl: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  repo: RepoItem;
  onSetProductionDomain: (repoId: string, domain: string) => Promise<void>;
  onPromoteDeployment: (repoId: string, deploymentId: string) => Promise<void>;
}) {
  const [urlValue, setUrlValue] = useState(() => {
    try {
      return new URL(previewUrl).pathname;
    } catch {
      return "/";
    }
  });

  useEffect(() => {
    try {
      setUrlValue(new URL(previewUrl).pathname);
    } catch {
      setUrlValue("/");
    }
  }, [previewUrl]);

  const baseUrl = (() => {
    try {
      const u = new URL(previewUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      return previewUrl;
    }
  })();

  const navigate = (path: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    setUrlValue(normalizedPath);
    iframe.src = `${baseUrl}${normalizedPath}`;
  };

  const handleReload = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.src = iframe.src;
  };

  const handleBack = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {}
  };

  const handleForward = () => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch {}
  };

  return (
    <>
      <button
        type="button"
        onClick={handleBack}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Back"
      >
        <ArrowLeftIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={handleForward}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Forward"
      >
        <ArrowRightIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={handleReload}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Reload"
      >
        <RotateCwIcon className="size-3.5" />
      </button>
      <form
        className="ml-1 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(urlValue);
        }}
      >
        <input
          type="text"
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          className="h-7 w-full rounded-md bg-muted/50 px-2.5 text-xs text-foreground transition-colors outline-none focus:bg-muted focus:ring-1 focus:ring-ring"
          aria-label="URL path"
        />
      </form>
      <div className="ml-1.5">
        <PublishDialog
          repo={repo}
          onSetProductionDomain={onSetProductionDomain}
          onPromoteDeployment={onPromoteDeployment}
        />
      </div>
    </>
  );
}
