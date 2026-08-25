export type ProjectRelease = {
  id: string;
  message: string;
  createdAt: string;
  /** The dev-VM snapshot this release was cut from. */
  snapshotId: string;
  state: "publishing" | "live" | "failed";
  error: string | null;
};

export type ProjectConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A project's state, stored as JSON on its dev VM's disk. The dev VM's id is
 * the project id, so this file never has to name it.
 */
export type ProjectMetadata = {
  version: 3;
  name: string;
  createdAt: string;
  /**
   * The project's other VM: built and served, never edited by the agent.
   * Null until the first publish, which is what creates it.
   */
  prodVmId: string | null;
  /** Where the dev VM's live-reloading app is served. */
  previewDomain: string;
  /** Where the prod VM is served, once a release has been published. */
  productionDomain: string;
  conversations: ProjectConversationSummary[];
  releases: ProjectRelease[];
  /** The release production is currently serving. */
  liveReleaseId: string | null;
};

export type ProjectItem = {
  id: string;
  name: string;
  previewUrl: string;
  productionUrl: string;
  prodVmId: string | null;
  conversations: ProjectConversationSummary[];
  releases: ProjectRelease[];
  liveReleaseId: string | null;
};
