"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/lib/project-types";
import { VmTerminal } from "@/components/assistant-ui/vm-terminal";
import { ProjectConversationsProvider } from "@/lib/project-conversations-context";
import { ProjectsProvider } from "@/lib/projects-context";
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
  /** The named PTY session on the VM this tab is attached to. */
  session: string;
  closable: boolean;
};

/** The session the project's app server runs in. Matches APP_SESSION in lib/vars.ts. */
const APP_SESSION = "dev";

type OptimisticMetadataDetail = {
  projectId: string;
  conversationId: string;
  projectName: string;
  conversationTitle: string;
};

type ThreadStateDetail = {
  projectId: string | null;
  isRunning: boolean;
};

export function ProjectWorkspaceShell({
  projectId,
  children,
  selectedConversationIdOverride,
}: {
  projectId: string | null;
  children: React.ReactNode;
  selectedConversationIdOverride?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const selectedConversationId =
    selectedConversationIdOverride ??
    pathname.split("/").filter(Boolean)[1] ??
    null;

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [threadIsRunning, setThreadIsRunning] = useState(false);
  const hasPublishingProject = projects.some((project) =>
    project.releases.some((release) => release.state === "publishing"),
  );

  const loadProjects = useCallback(async () => {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { projects?: ProjectItem[] };
      setProjects(data.projects ?? []);
    }
    setProjectsLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) return;
    loadProjects();
  }, [loadProjects, projectId]);

  useEffect(() => {
    if (!threadIsRunning && !hasPublishingProject) return;
    const interval = window.setInterval(() => {
      void loadProjects();
    }, 10000);
    return () => {
      window.clearInterval(interval);
    };
  }, [loadProjects, threadIsRunning, hasPublishingProject]);

  useEffect(() => {
    const handleProjectsUpdated = () => {
      void loadProjects();
    };

    window.addEventListener("adorable:projects-updated", handleProjectsUpdated);
    return () => {
      window.removeEventListener(
        "adorable:projects-updated",
        handleProjectsUpdated,
      );
    };
  }, [loadProjects]);

  useEffect(() => {
    const handleThreadState = (event: Event) => {
      const customEvent = event as CustomEvent<ThreadStateDetail>;
      const detail = customEvent.detail;
      if (!detail) return;
      if (projectId && detail.projectId && detail.projectId !== projectId)
        return;
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
  }, [projectId]);

  useEffect(() => {
    const handleOptimisticMetadata = (event: Event) => {
      const customEvent = event as CustomEvent<OptimisticMetadataDetail>;
      const detail = customEvent.detail;
      if (!detail?.projectId || !detail?.conversationId) return;

      const now = new Date().toISOString();

      setProjects((previous) =>
        previous.map((project) => {
          if (project.id !== detail.projectId) return project;

          const hasConversation = project.conversations.some(
            (conversation) => conversation.id === detail.conversationId,
          );

          const nextConversations = hasConversation
            ? project.conversations.map((conversation) =>
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
                ...project.conversations,
              ];

          return {
            ...project,
            name:
              project.name === "Untitled Project"
                ? detail.projectName
                : project.name,
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
    (nextProjectId: string) => {
      router.push(`/${nextProjectId}`);
    },
    [router],
  );

  const selectedProject = projectId
    ? (projects.find((project) => project.id === projectId) ?? null)
    : null;
  const showWorkspacePanel = Boolean(projectId);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");

  // Reset to chat view when navigating away
  useEffect(() => {
    if (!projectId) setMobileView("chat");
  }, [projectId]);

  // On mobile, compute which panel to show
  const gridColumns = (() => {
    if (!showWorkspacePanel) return "1fr 0fr";
    if (isMobile) return mobileView === "chat" ? "1fr 0fr" : "0fr 1fr";
    return "2fr 3fr";
  })();

  const conversationsContextValue = useMemo(
    () => ({
      projectId,
      conversations: selectedProject?.conversations ?? [],
      onSelectConversation: (conversationId: string) => {
        if (projectId) {
          router.push(`/${projectId}/${conversationId}`);
        }
      },
    }),
    [projectId, selectedProject?.conversations, router],
  );

  const onSetProductionDomain = useCallback(
    async (nextProjectId: string, domain: string) => {
      const response = await fetch(
        `/api/projects/${nextProjectId}/production-domain`,
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

      await loadProjects();
    },
    [loadProjects],
  );

  /** Build the current dev code onto the project's production VM. */
  const onPublish = useCallback(
    async (nextProjectId: string, message: string) => {
      const response = await fetch(`/api/projects/${nextProjectId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to publish");
      }

      await loadProjects();
    },
    [loadProjects],
  );

  /** Put production back on an earlier release. */
  const onRollback = useCallback(
    async (nextProjectId: string, releaseId: string) => {
      const response = await fetch(`/api/projects/${nextProjectId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to roll back");
      }

      await loadProjects();
    },
    [loadProjects],
  );

  const projectsContextValue = useMemo(
    () => ({
      projects,
      isLoading: projectsLoading,
      onSelectProject: handleSelectProject,
    }),
    [projects, projectsLoading, handleSelectProject],
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <ProjectsProvider value={projectsContextValue}>
      <ProjectConversationsProvider value={conversationsContextValue}>
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          {/* Unified top bar */}
          {projectId && selectedProject && (
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
                          new CustomEvent("adorable:go-to-project", {
                            detail: { projectId },
                          }),
                        );
                        router.push(`/${projectId}`);
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
                    {selectedProject.previewUrl && (
                      <PublishDialog
                        project={selectedProject}
                        onSetProductionDomain={onSetProductionDomain}
                        onPublish={onPublish}
                        onRollback={onRollback}
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
                  {showWorkspacePanel && selectedProject.previewUrl && (
                    <BrowserControls
                      previewUrl={selectedProject.previewUrl}
                      iframeRef={iframeRef}
                      project={selectedProject}
                      onSetProductionDomain={onSetProductionDomain}
                      onPublish={onPublish}
                      onRollback={onRollback}
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
                (selectedProject?.previewUrl ? (
                  <AppPreview project={selectedProject} iframeRef={iframeRef} />
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
    </ProjectsProvider>
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
  project,
  iframeRef,
}: {
  project: ProjectItem;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [extraTerminals, setExtraTerminals] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTab] = useState("dev-server");
  const [counter, setCounter] = useState(1);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    setIframeLoaded(false);
  }, [project.previewUrl]);

  /**
   * Terminal sessions are named on the VM, so a tab's name is all the state a
   * new terminal needs: the guest creates the shell on first connect and keeps
   * it alive afterwards.
   */
  const addTerminal = useCallback(() => {
    const id = `terminal-${counter}`;
    setExtraTerminals((previous) => [
      ...previous,
      {
        id,
        label: `Terminal ${counter}`,
        session: `shell-${counter}`,
        closable: true,
      },
    ]);
    setActiveTab(id);
    setCounter((current) => current + 1);
  }, [counter]);

  const closeTerminal = useCallback(
    (id: string) => {
      setExtraTerminals((previous) => previous.filter((tab) => tab.id !== id));
      if (activeTab === id) setActiveTab("dev-server");
    },
    [activeTab],
  );

  const allTabs: TerminalTab[] = [
    {
      id: "dev-server",
      label: "Dev Server",
      session: APP_SESSION,
      closable: false,
    },
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
            src={project.previewUrl}
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

          <button
            type="button"
            onClick={addTerminal}
            className="ml-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="New terminal"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-[rgb(30,30,30)]">
          {allTabs.map((tab) => (
            <VmTerminal
              key={tab.id}
              projectId={project.id}
              session={tab.session}
              className="absolute inset-0 h-full w-full p-1"
              // Kept mounted so a background terminal keeps receiving output.
              style={{ display: activeTab === tab.id ? "block" : "none" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BrowserControls({
  previewUrl,
  iframeRef,
  project,
  onSetProductionDomain,
  onPublish,
  onRollback,
}: {
  previewUrl: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  project: ProjectItem;
  onSetProductionDomain: (projectId: string, domain: string) => Promise<void>;
  onPublish: (projectId: string, message: string) => Promise<void>;
  onRollback: (projectId: string, releaseId: string) => Promise<void>;
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
          project={project}
          onSetProductionDomain={onSetProductionDomain}
          onPublish={onPublish}
          onRollback={onRollback}
        />
      </div>
    </>
  );
}
