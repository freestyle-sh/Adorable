import { createAnthropic } from "@ai-sdk/anthropic";
import {
  createOpenAI,
  type OpenAIResponsesProviderOptions,
} from "@ai-sdk/openai";
import {
  stepCountIs,
  streamText,
  type UIMessage,
  type ToolSet,
  convertToModelMessages,
} from "ai";

type LlmProviderName = "openai" | "anthropic";

const getProviderName = (override?: string): LlmProviderName => {
  const value = (override ?? process.env["LLM_PROVIDER"])?.toLowerCase().trim();
  if (value === "anthropic" || value === "claude") return "anthropic";
  return "openai";
};

type StreamLlmResponseParams = {
  system: string;
  messages: UIMessage[];
  tools: ToolSet;
  apiKey?: string;
  providerOverride?: string;
};

type StreamLlmResponseResult = {
  result: ReturnType<typeof streamText>;
  provider: LlmProviderName;
};

export const streamLlmResponse = async ({
  system,
  messages,
  tools,
  apiKey,
  providerOverride,
}: StreamLlmResponseParams): Promise<StreamLlmResponseResult> => {
  const provider = getProviderName(providerOverride);
  const modelMessages = await convertToModelMessages(messages);

  if (provider === "openai") {
    const openaiProvider = apiKey ? createOpenAI({ apiKey }) : createOpenAI({});
    const result = streamText({
      system,
      model: openaiProvider.responses("gpt-5.3-codex"),
      messages: modelMessages,
      tools,
      providerOptions: {
        openai: {
          reasoningEffort: "low",
        } satisfies OpenAIResponsesProviderOptions,
      },
      stopWhen: stepCountIs(100),
    });

    return {
      result,
      provider,
    };
  }

  const anthropicProvider = apiKey
    ? createAnthropic({ apiKey })
    : createAnthropic({});
  const result = streamText({
    system,
    model: anthropicProvider("claude-sonnet-4-20250514"),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(100),
  });

  return {
    result,
    provider,
  };
};
