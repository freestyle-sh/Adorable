"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/projects-context";
import type { ProjectItem } from "@/lib/project-types";
import { type FC, useState } from "react";
import { GithubIcon } from "lucide-react";

/** Show what a visitor would see: production once published, dev otherwise. */
function getPreviewUrl(project: ProjectItem): string | null {
  if (project.liveReleaseId) return project.productionUrl;
  return project.previewUrl || null;
}

export const HomeWelcome: FC = () => {
  const { projects, isLoading, onSelectProject } = useProjects();
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [githubRepoInput, setGithubRepoInput] = useState("");
  const [githubRepoError, setGithubRepoError] = useState<string | null>(null);

  const handleUseGithubRepo = () => {
    const githubRepoName = githubRepoInput.trim();
    if (!githubRepoName.includes("/")) {
      setGithubRepoError("Repository must be in owner/repo format");
      return;
    }

    setGithubRepoError(null);
    window.dispatchEvent(
      new CustomEvent("adorable:create-from-github", {
        detail: { githubRepoName },
      }),
    );
    setGithubDialogOpen(false);
    setGithubRepoInput("");
  };

  const hasProjects = projects.length > 0;
  const showProjects = isLoading || hasProjects;

  return (
    <div className="aui-thread-welcome-root mx-auto flex w-full max-w-(--thread-max-width) grow flex-col items-center justify-center">
      <div className="flex w-full flex-col gap-8 px-2">
        {/* Hero */}
        <div className="flex animate-in flex-col items-center gap-2 pt-8 text-center duration-500 fill-mode-both fade-in">
          <svg
            viewBox="0 0 347 280"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-2 h-10 w-auto"
          >
            <path
              d="M70 267V235.793C37.4932 229.296 13 200.594 13 166.177C13 134.93 33.1885 108.399 61.2324 98.9148C61.9277 51.3467 100.705 13 148.438 13C183.979 13 214.554 34.2582 228.143 64.7527C234.182 63.4301 240.454 62.733 246.89 62.733C295.058 62.733 334.105 101.781 334.105 149.949C334.105 182.845 315.893 211.488 289 226.343V267"
              className="stroke-foreground/15"
              strokeWidth="25"
              strokeLinecap="round"
            />
            <path
              d="M146 237V267"
              className="stroke-foreground/15"
              strokeWidth="25"
              strokeLinecap="round"
            />
            <path
              d="M215 237V267"
              className="stroke-foreground/15"
              strokeWidth="25"
              strokeLinecap="round"
            />
          </svg>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            What do you want to build?
          </h1>
          <p className="text-sm text-muted-foreground/60">
            Describe an app or pick up where you left off
          </p>
        </div>

        {/* Project cards with previews */}
        <div
          className={cn(
            "flex w-full flex-col gap-3 transition-opacity duration-500",
            showProjects ? "opacity-100" : "opacity-0",
          )}
        >
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card/50"
                >
                  <Skeleton className="aspect-16/10 w-full" />
                  <div className="px-3 py-2.5">
                    <Skeleton className="mb-1.5 h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-2.5 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : hasProjects ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {projects.map((project, index) => {
                  const previewUrl = getPreviewUrl(project);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                      className="group animate-in overflow-hidden rounded-xl border border-border/50 bg-card/50 text-left transition-all duration-200 fill-mode-both fade-in hover:border-border hover:ring-1 hover:ring-ring/20"
                      style={
                        {
                          "--tw-animation-delay": `${index * 75}ms`,
                          "--tw-animation-duration": "400ms",
                        } as React.CSSProperties
                      }
                    >
                      {/* Preview thumbnail */}
                      <div className="relative aspect-16/10 w-full overflow-hidden bg-muted/30">
                        {previewUrl ? (
                          <iframe
                            src={previewUrl}
                            title={`${project.name} preview`}
                            className="pointer-events-none absolute inset-0 h-[200%] w-[200%] origin-top-left scale-50 border-0"
                            tabIndex={-1}
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-xs text-muted-foreground/30">
                              No preview
                            </span>
                          </div>
                        )}
                        {/* Status dot */}
                        <div className="absolute top-2 right-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full ring-2 ring-card/80",
                              project.liveReleaseId
                                ? "bg-emerald-500"
                                : project.releases.some(
                                      (release) =>
                                        release.state === "publishing",
                                    )
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground/30",
                            )}
                          />
                        </div>
                      </div>
                      {/* Info */}
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
                          {project.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/50">
                          {project.conversations.length} chat
                          {project.conversations.length !== 1 ? "s" : ""}
                          {project.releases.length > 0 && (
                            <>
                              {" · "}
                              {project.releases.length} release
                              {project.releases.length !== 1 ? "s" : ""}
                            </>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Import from GitHub — subtle link below the grid */}
              <button
                type="button"
                onClick={() => setGithubDialogOpen(true)}
                className="mx-auto flex animate-in items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground/40 transition-colors fill-mode-both fade-in hover:text-muted-foreground"
                style={
                  {
                    "--tw-animation-delay": `${projects.length * 75}ms`,
                    "--tw-animation-duration": "400ms",
                  } as React.CSSProperties
                }
              >
                <GithubIcon className="h-3 w-3" />
                Import from GitHub
              </button>
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={githubDialogOpen} onOpenChange={setGithubDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Use GitHub Project</DialogTitle>
            <DialogDescription>
              Enter a repository in owner/repo format. If you haven't installed
              the GitHub App yet, install it first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={githubRepoInput}
              onChange={(event) => {
                setGithubRepoInput(event.target.value);
                setGithubRepoError(null);
              }}
              placeholder="owner/repo"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleUseGithubRepo();
                }
              }}
            />
            {githubRepoError && (
              <p className="text-[13px] text-destructive">{githubRepoError}</p>
            )}
            <a
              href="https://dash.freestyle.sh/"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Install GitHub App (Dashboard → Git → Sync)
            </a>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setGithubDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUseGithubRepo}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
