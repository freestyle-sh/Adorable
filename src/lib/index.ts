/**
 * 🚀 AI Builder - Main Exports
 *
 * This is the main entry point for the AI Builder library.
 * Import what you need to customize your AI app!
 */

// Backward compatibility exports
export { builderAgent } from "@/mastra/agents/builder";
export { AIService } from "./internal/ai-service";
export {
  sendMessageWithStreaming,
  getStreamState,
  isStreamRunning,
  stopStream,
  waitForStreamToStop,
  clearStreamState,
} from "./internal/stream-manager";

// Internal utilities (for advanced use cases)
export { Resilience } from "./internal/resilience";
export { ErrorHandler } from "./internal/error-handler";
export { Monitoring } from "./internal/monitoring";

// Legacy exports for existing code
export { freestyle } from "./freestyle";
export { todoTool } from "@/tools/todo-tool";
export { morphTool } from "@/tools/morph-tool";

// Type exports for TypeScript
export type { UIMessage } from "ai";
export type { Agent } from "@mastra/core/agent";

/**
 * 🎯 Quick Start Examples
 *
 * // Use the default builder agent
 * import { builderAgent, sendMessageWithStreaming } from "@/lib";
 *
 * const response = await sendMessageWithStreaming(
 *   builderAgent,
 *   appId,
 *   mcpUrl,
 *   userMessage
 * );
 */
