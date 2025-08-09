import { UIMessage } from "ai";
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { MessageList } from "@mastra/core/agent";
import { builderAgent } from "@/mastra/agents/builder";
import { morphTool } from "@/tools/morph-tool";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";

export interface AIStreamOptions {
  threadId: string;
  resourceId: string;
  maxSteps?: number;
  maxRetries?: number;
  maxOutputTokens?: number;
  onChunk?: () => void;
  onStepFinish?: (step: { response: { messages: unknown[] } }) => void;
  onError?: (error: { error: unknown }) => void;
  onFinish?: () => void;
  abortSignal?: AbortSignal;
}

export interface AIResponse {
  stream: {
    toUIMessageStreamResponse: () => {
      body?: ReadableStream<Uint8Array> | null;
    };
  };
}

export class AIService {
  /**
   * Send a message to the AI and get a stream response
   *
   * This is the main method developers should use for AI interactions.
   * It handles all the complex setup (MCP client, toolsets, memory, streaming)
   * and returns a clean response object with just the stream.
   *
   * All message list management and MCP client lifecycle is handled internally.
   *
   * @param agent - The Mastra agent to use for AI interactions
   * @param appId - The application ID
   * @param mcpUrl - The MCP server URL
   * @param message - The message to send to the AI
   * @param options - Optional configuration for the AI interaction
   * @returns Promise<AIResponse> - Contains only the stream for UI consumption
   *
   * @example
   * ```typescript
   * import { builderAgent } from "@/mastra/agents/builder";
   *
   * const response = await AIService.sendMessage(builderAgent, appId, mcpUrl, {
   *   id: crypto.randomUUID(),
   *   parts: [{ type: "text", text: "Build me a todo app" }],
   *   role: "user"
   * });
   *
   * // Use the stream for UI - that's all you need!
   * const uiStream = response.stream.toUIMessageStreamResponse();
   * ```
   */
  static async sendMessage(
    agent: Agent,
    appId: string,
    mcpUrl: string,
    fs: FreestyleDevServerFilesystem,
    message: UIMessage,
    options?: Partial<AIStreamOptions>
  ): Promise<AIResponse> {
    const mcp = new MCPClient({
      id: crypto.randomUUID(),
      servers: {
        dev_server: {
          url: new URL(mcpUrl),
        },
      },
    });

    const freestyleToolsets = await mcp.getToolsets();

    // Save message to memory
    const memory = await agent.getMemory();
    if (memory) {
      await memory.saveMessages({
        messages: [
          {
            content: {
              parts: message.parts,
              format: 3,
            },
            role: "user",
            createdAt: new Date(),
            id: message.id,
            threadId: appId,
            type: "text",
            resourceId: appId,
          },
        ],
      });
    }

    const messageList = new MessageList({
      resourceId: appId,
      threadId: appId,
    });

    const stream = await agent.stream([], {
      threadId: appId,
      resourceId: appId,
      maxSteps: options?.maxSteps ?? 100,
      maxRetries: options?.maxRetries ?? 0,
      maxOutputTokens: options?.maxOutputTokens ?? 64000,
      toolsets: {
        ...(process.env.MORPH_API_KEY
          ? {
              morph: {
                edit_file: morphTool(fs),
              },
            }
          : {}),
        ...freestyleToolsets,
      },
      async onChunk() {
        options?.onChunk?.();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async onStepFinish(step: { response: { messages: unknown[] } }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messageList.add(step.response.messages as any, "response");
        options?.onStepFinish?.(step);
      },
      onError: async (error: { error: unknown }) => {
        // Handle cleanup internally
        await mcp.disconnect();
        options?.onError?.(error);
      },
      onFinish: async () => {
        // Handle cleanup internally
        await mcp.disconnect();
        options?.onFinish?.();
      },
      abortSignal: options?.abortSignal,
    });

    // Ensure the stream has the proper method
    if (!stream.toUIMessageStreamResponse) {
      console.error(
        "Stream does not have toUIMessageStreamResponse method:",
        stream
      );
      throw new Error(
        "Invalid stream format - missing toUIMessageStreamResponse method"
      );
    }

    // Return only what developers need - the stream
    return { stream };
  }

  /**
   * Get the AI agent instance for advanced use cases
   *
   * Use this when you need direct access to the underlying agent
   * for advanced customization.
   *
   * @returns The builder agent instance
   */
  static getAgent() {
    return builderAgent;
  }

  /**
   * Get the memory instance for direct memory operations
   *
   * Use this when you need to directly interact with the AI's memory
   * for saving/loading messages or other memory operations.
   *
   * @returns Promise<Memory | undefined> - The memory instance
   */
  static async getMemory() {
    return await builderAgent.getMemory();
  }

  /**
   * Get unsaved messages from the current conversation
   *
   * This is a utility method for when you need to access the current
   * conversation state. Use sparingly - the service handles this automatically.
   *
   * @param appId - The application ID
   * @returns Promise<unknown[]> - Array of unsaved messages
   */
  static async getUnsavedMessages(appId: string): Promise<unknown[]> {
    const messageList = new MessageList({
      resourceId: appId,
      threadId: appId,
    });
    return messageList.drainUnsavedMessages();
  }

  /**
   * Save messages to memory manually
   *
   * This is a utility method for when you need to manually save messages.
   * The service handles this automatically in most cases.
   *
   * @param agent - The Mastra agent to use for memory operations
   * @param appId - The application ID
   * @param messages - Array of messages to save
   * @returns Promise<void>
   */
  static async saveMessagesToMemory(
    agent: Agent,
    appId: string,
    messages: unknown[]
  ): Promise<void> {
    const memory = await agent.getMemory();
    if (memory) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await memory.saveMessages({ messages: messages as any });
    }
  }
}
