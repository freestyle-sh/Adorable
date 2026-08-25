import { type UIMessage } from "ai";
import { devVm } from "./project-vm";
import type {
  ProjectConversationSummary,
  ProjectMetadata,
  ProjectRelease,
} from "./project-types";
import { ADORABLE_DIR } from "./vars";

/**
 * A project's state lives on its own dev VM, at {@link ADORABLE_DIR}. The VM is
 * the project, so its disk is the only place the state can be that cannot fall
 * out of sync with it — and there is no second store to provision.
 */
const METADATA_PATH = `${ADORABLE_DIR}/project.json`;

const conversationPath = (conversationId: string) =>
  `${ADORABLE_DIR}/conversations/${conversationId}.json`;

export const readProjectMetadata = async (
  projectId: string,
): Promise<ProjectMetadata> => {
  const raw = await devVm(projectId).fs.readTextFile(METADATA_PATH);
  return JSON.parse(raw) as ProjectMetadata;
};

export const writeProjectMetadata = async (
  projectId: string,
  metadata: ProjectMetadata,
) => {
  await devVm(projectId).fs.writeTextFile(
    METADATA_PATH,
    JSON.stringify(metadata, null, 2),
  );
  return metadata;
};

/** Read, transform, write. The dev VM is the single writer, so this is safe. */
const updateProjectMetadata = async (
  projectId: string,
  update: (metadata: ProjectMetadata) => ProjectMetadata,
) => {
  const current = await readProjectMetadata(projectId);
  return writeProjectMetadata(projectId, update(current));
};

const deriveConversationTitle = (
  messages: UIMessage[],
  fallback: string,
): string => {
  const userMessage = messages.find((message) => message.role === "user");
  const textPart = userMessage?.parts?.find((part) => part.type === "text");
  const text = textPart && "text" in textPart ? textPart.text : "";
  const clean = text.trim().replace(/\s+/g, " ");
  return clean ? clean.slice(0, 60) : fallback;
};

export const createConversation = async (
  projectId: string,
  conversationId: string,
  initialTitle?: string,
) => {
  const now = new Date().toISOString();

  const [metadata] = await Promise.all([
    updateProjectMetadata(projectId, (current) => ({
      ...current,
      conversations: [
        {
          id: conversationId,
          title:
            initialTitle?.trim().replace(/\s+/g, " ").slice(0, 60) ||
            `Conversation ${current.conversations.length + 1}`,
          createdAt: now,
          updatedAt: now,
        },
        ...current.conversations,
      ],
    })),
    devVm(projectId).fs.writeTextFile(conversationPath(conversationId), "[]"),
  ]);

  return metadata;
};

export const readConversationMessages = async (
  projectId: string,
  conversationId: string,
): Promise<UIMessage[]> => {
  const raw = await devVm(projectId).fs.readTextFile(
    conversationPath(conversationId),
  );
  return JSON.parse(raw) as UIMessage[];
};

export const saveConversationMessages = async (
  projectId: string,
  conversationId: string,
  messages: UIMessage[],
) => {
  const now = new Date().toISOString();

  const [metadata] = await Promise.all([
    updateProjectMetadata(projectId, (current) => {
      const existing = current.conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      const summary: ProjectConversationSummary = {
        id: conversationId,
        title: deriveConversationTitle(
          messages,
          existing?.title ?? `Conversation ${current.conversations.length + 1}`,
        ),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      return {
        ...current,
        conversations: [
          summary,
          ...current.conversations.filter(
            (conversation) => conversation.id !== conversationId,
          ),
        ],
      };
    }),
    devVm(projectId).fs.writeTextFile(
      conversationPath(conversationId),
      JSON.stringify(messages, null, 2),
    ),
  ]);

  return metadata;
};

export const addRelease = (projectId: string, release: ProjectRelease) =>
  updateProjectMetadata(projectId, (current) => ({
    ...current,
    releases: [release, ...current.releases].slice(0, 50),
  }));

export const updateRelease = (
  projectId: string,
  releaseId: string,
  patch: Partial<ProjectRelease>,
) =>
  updateProjectMetadata(projectId, (current) => ({
    ...current,
    releases: current.releases.map((release) =>
      release.id === releaseId ? { ...release, ...patch } : release,
    ),
    liveReleaseId: patch.state === "live" ? releaseId : current.liveReleaseId,
  }));

export const setProductionDomain = (projectId: string, domain: string) =>
  updateProjectMetadata(projectId, (current) => ({
    ...current,
    productionDomain: domain,
  }));

export const renameProject = (projectId: string, name: string) =>
  updateProjectMetadata(projectId, (current) => ({ ...current, name }));
