import type { UIMessage } from "ai";
import type { RepoConversationSummary, RepoMetadata } from "@/lib/repo-storage";

export type CreateConversationInput = {
  repoId: string;
  metadata: RepoMetadata;
  conversationId: string;
  title?: string;
};

export type SaveConversationMessagesInput = {
  repoId: string;
  metadata: RepoMetadata;
  conversationId: string;
  messages: UIMessage[];
};

export interface ConversationStore {
  listConversations(repoId: string): Promise<RepoConversationSummary[]>;
  createConversation(input: CreateConversationInput): Promise<RepoMetadata>;
  readMessages(repoId: string, conversationId: string): Promise<UIMessage[]>;
  saveMessages(input: SaveConversationMessagesInput): Promise<RepoMetadata>;
}
