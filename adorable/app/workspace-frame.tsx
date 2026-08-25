"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ProjectWorkspaceShell } from "./[projectId]/project-workspace-shell";
import { ApiKeySettingsDialog } from "@/components/api-key-gate";

type ActiveConversationDetail = {
  projectId: string;
  conversationId: string;
};

export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathParts = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname],
  );

  const routeRepoId = pathParts[0] ?? null;
  const routeConversationId = pathParts[1] ?? null;

  const [activeProjectId, setActiveRepoId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (routeRepoId) {
      setActiveRepoId(routeRepoId);
      setActiveConversationId(routeConversationId);
    }
  }, [routeConversationId, routeRepoId]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    if (pathname === "/" && previousPathname !== "/") {
      setActiveRepoId(null);
      setActiveConversationId(null);
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const handleActiveConversation = (event: Event) => {
      const customEvent = event as CustomEvent<ActiveConversationDetail>;
      const detail = customEvent.detail;
      if (!detail?.projectId || !detail?.conversationId) {
        return;
      }

      setActiveRepoId(detail.projectId);
      setActiveConversationId(detail.conversationId);
    };

    window.addEventListener(
      "adorable:active-conversation",
      handleActiveConversation as EventListener,
    );

    return () => {
      window.removeEventListener(
        "adorable:active-conversation",
        handleActiveConversation as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleGoHome = () => {
      setActiveRepoId(null);
      setActiveConversationId(null);
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
      setActiveRepoId(detail.projectId);
      setActiveConversationId(null);
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

  const effectiveRepoId = routeRepoId ?? activeProjectId;
  const effectiveConversationId = routeConversationId ?? activeConversationId;

  return (
    <ProjectWorkspaceShell
      projectId={effectiveRepoId}
      selectedConversationIdOverride={effectiveConversationId}
    >
      {children}
      {/* Settings button */}
      <div className="fixed bottom-3 left-3 z-50 md:right-3 md:left-auto">
        <ApiKeySettingsDialog />
      </div>
    </ProjectWorkspaceShell>
  );
}
