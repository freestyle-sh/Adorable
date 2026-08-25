"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  PencilIcon,
  RocketIcon,
  RotateCcwIcon,
} from "lucide-react";
import type { ProjectItem, ProjectRelease } from "@/lib/project-types";

const formatRelativeTime = (dateString: string) => {
  const diffSeconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );
  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

const ReleaseState = ({
  release,
  isLive,
}: {
  release: ProjectRelease;
  isLive: boolean;
}) => {
  if (release.state === "publishing") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2Icon className="size-3 animate-spin" />
        Building
      </span>
    );
  }

  if (release.state === "failed") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircleIcon className="size-3" />
        Failed
      </span>
    );
  }

  // A built release stays built after it is superseded; only one is serving.
  if (!isLive) {
    return <span className="text-xs text-muted-foreground">Built</span>;
  }

  return (
    <span className="flex items-center gap-1 text-xs text-emerald-500">
      <CheckCircle2Icon className="size-3" />
      Live
    </span>
  );
};

/**
 * Publishing builds the dev VM's current code onto the project's production
 * VM. The two VMs are permanent, so production keeps the same address across
 * every release — and every release keeps a snapshot to roll back to.
 */
export function PublishDialog({
  project,
  onSetProductionDomain,
  onPublish,
  onRollback,
}: {
  project: ProjectItem;
  onSetProductionDomain: (projectId: string, domain: string) => Promise<void>;
  onPublish: (projectId: string, message: string) => Promise<void>;
  onRollback: (projectId: string, releaseId: string) => Promise<void>;
}) {
  const [message, setMessage] = React.useState("");
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = React.useState<string | null>(null);

  const [isEditingDomain, setIsEditingDomain] = React.useState(false);
  const [domainInput, setDomainInput] = React.useState("");
  const [isSavingDomain, setIsSavingDomain] = React.useState(false);
  const [domainError, setDomainError] = React.useState<string | null>(null);

  const releases = project.releases;
  const isBuilding = releases.some((release) => release.state === "publishing");
  const productionDomain = new URL(project.productionUrl).host;

  const cancelEditDomain = () => {
    setIsEditingDomain(false);
    setDomainError(null);
  };

  const saveDomain = async () => {
    const nextDomain = domainInput.trim().toLowerCase();
    setDomainError(null);
    setIsSavingDomain(true);
    try {
      await onSetProductionDomain(project.id, nextDomain);
      setIsEditingDomain(false);
    } catch (error) {
      setDomainError(
        error instanceof Error ? error.message : "Failed to save domain",
      );
    } finally {
      setIsSavingDomain(false);
    }
  };

  const publish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      await onPublish(project.id, message.trim() || "Publish");
      setMessage("");
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Failed to publish",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const rollback = async (releaseId: string) => {
    setRollingBackId(releaseId);
    try {
      await onRollback(project.id, releaseId);
    } catch {
      // The release's own failed state carries the reason.
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && cancelEditDomain()}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
        >
          {isBuilding ? (
            <Loader2Icon className="size-3 animate-spin" />
          ) : (
            <RocketIcon className="size-3" />
          )}
          Publish
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish</DialogTitle>
          <DialogDescription>
            Builds the current code onto this project&apos;s production VM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Production address */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Production domain
            </p>

            {isEditingDomain ? (
              <div className="space-y-2">
                <Input
                  value={domainInput}
                  onChange={(event) => setDomainInput(event.target.value)}
                  placeholder="my-app.style.dev"
                  autoFocus
                />
                {domainError && (
                  <p className="text-xs text-destructive">{domainError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveDomain}
                    disabled={isSavingDomain}
                  >
                    {isSavingDomain && (
                      <Loader2Icon className="size-3 animate-spin" />
                    )}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditDomain}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <a
                  href={project.productionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-sm hover:underline"
                >
                  <span className="truncate">{productionDomain}</span>
                  <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setDomainInput(productionDomain);
                    setDomainError(null);
                    setIsEditingDomain(true);
                  }}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Change domain"
                >
                  <PencilIcon className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* New release */}
          <div className="space-y-2">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What changed in this release?"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isPublishing) void publish();
              }}
            />
            {publishError && (
              <p className="text-xs text-destructive">{publishError}</p>
            )}
            <Button
              className="w-full"
              onClick={publish}
              disabled={isPublishing || isBuilding}
            >
              {isPublishing || isBuilding ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <RocketIcon className="size-3.5" />
              )}
              {isBuilding ? "Building…" : "Publish to production"}
            </Button>
          </div>

          {/* History */}
          {releases.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Releases
              </p>
              <div className="max-h-56 divide-y divide-border/50 overflow-y-auto rounded-md border">
                {releases.map((release) => {
                  const isLive = release.id === project.liveReleaseId;
                  return (
                    <div
                      key={release.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{release.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(release.createdAt)}
                        </p>
                        {release.error && (
                          <p className="mt-0.5 truncate text-xs text-destructive">
                            {release.error}
                          </p>
                        )}
                      </div>

                      <ReleaseState release={release} isLive={isLive} />

                      {!isLive && release.state !== "publishing" && (
                        <button
                          type="button"
                          onClick={() => void rollback(release.id)}
                          disabled={rollingBackId === release.id}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Roll production back to this release"
                        >
                          {rollingBackId === release.id ? (
                            <Loader2Icon className="size-3 animate-spin" />
                          ) : (
                            <RotateCcwIcon className="size-3" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
