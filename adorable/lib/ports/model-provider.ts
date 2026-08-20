import type { streamText, ToolSet, UIMessage } from "ai";

export type ModelProviderName = "openai" | "anthropic";

export type StreamModelResponseParams = {
  system: string;
  messages: UIMessage[];
  tools: ToolSet;
  apiKey?: string;
  providerOverride?: string;
};

export type StreamModelResponseResult = {
  result: ReturnType<typeof streamText>;
  provider: ModelProviderName;
};

export interface ModelProvider {
  streamResponse(
    input: StreamModelResponseParams,
  ): Promise<StreamModelResponseResult>;
}
