import type { ConversationStore } from "@/lib/ports/conversation-store";
import {
  createConversationInRepo,
  readConversationMessages,
  readRepoMetadata,
  saveConversationMessages,
} from "@/lib/repo-storage";

export class FreestyleConversationStore implements ConversationStore {
  async listConversations(repoId: string) {
    const metadata = await readRepoMetadata(repoId);
    return metadata?.conversations ?? [];
  }

  async createConversation({
    repoId,
    metadata,
    conversationId,
    title,
  }: Parameters<ConversationStore["createConversation"]>[0]) {
    return createConversationInRepo(repoId, metadata, conversationId, title);
  }

  async readMessages(repoId: string, conversationId: string) {
    return readConversationMessages(repoId, conversationId);
  }

  async saveMessages({
    repoId,
    metadata,
    conversationId,
    messages,
  }: Parameters<ConversationStore["saveMessages"]>[0]) {
    return saveConversationMessages(
      repoId,
      metadata,
      conversationId,
      messages,
    );
  }
}

export const freestyleConversationStore = new FreestyleConversationStore();
