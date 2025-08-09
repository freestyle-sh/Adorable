import { UIMessage } from "ai";
import { NextRequest } from "next/server";
import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { builderAgent } from "@/mastra/agents/builder";
import { AIService } from "./ai-service";
import { ErrorHandler } from "./error-handler";
import { Resilience } from "./resilience";
import { Monitoring } from "./monitoring";
import {
  isStreamRunning,
  stopStream,
  waitForStreamToStop,
  clearStreamState,
  sendMessageWithStreaming,
} from "./stream-manager";

export interface ChatRequest {
  messages: UIMessage[];
}

export class ChatService {
  /**
   * Process a chat request with full error handling and fallbacks
   * This method handles all the complexity while keeping the interface simple
   */
  static async processChatRequest(
    req: NextRequest,
    appId: string
  ): Promise<Response> {
    const startTime = Date.now();

    try {
      // Parse request body
      const { messages }: ChatRequest = await req.json();
      if (!messages || messages.length === 0) {
        throw new Error("No messages provided");
      }

      // Get the app
      const app = await getApp(appId);
      if (!app) {
        throw new Error("App not found");
      }

      // Handle stream lifecycle
      await this.manageStreamLifecycle(appId);

      // Get MCP server with resilience
      const { mcpEphemeralUrl } = await Resilience.withResilience(
        () => freestyle.requestDevServer({ repoId: app.info.gitRepo }),
        "mcp-server-request",
        { maxAttempts: 2, baseDelay: 500 },
        { failureThreshold: 3, recoveryTimeout: 15000 }
      );

      // Try streaming first with resilience
      try {
        const resumableStream = await Resilience.withResilience(
          () =>
            sendMessageWithStreaming(
              builderAgent,
              appId,
              mcpEphemeralUrl,
              messages.at(-1)!
            ),
          "streaming",
          { maxAttempts: 2, baseDelay: 1000 },
          { failureThreshold: 2, recoveryTimeout: 10000 }
        );

        // Record success
        Monitoring.recordSuccess(Date.now() - startTime);
        return resumableStream.response();
      } catch (streamError) {
        console.log("Streaming failed, falling back to memory:", streamError);
        const fallbackResponse = await this.handleStreamingFallback(appId);

        // Record success for fallback
        Monitoring.recordSuccess(Date.now() - startTime);
        return fallbackResponse;
      }
    } catch (error) {
      // Record failure
      Monitoring.recordFailure(
        Date.now() - startTime,
        "chat-processing",
        String(error)
      );
      return ErrorHandler.handleError(error, "chat-processing");
    }
  }

  /**
   * Manage stream lifecycle - stop existing streams and ensure clean state
   */
  private static async manageStreamLifecycle(appId: string): Promise<void> {
    if (await isStreamRunning(appId)) {
      console.log("Stopping previous stream for appId:", appId);
      await stopStream(appId);

      // Wait for stream to stop with timeout
      const stopped = await waitForStreamToStop(appId);
      if (!stopped) {
        await clearStreamState(appId);
        throw new Error(
          "Previous stream is still shutting down, please try again"
        );
      }
    }
  }

  /**
   * Handle fallback when streaming fails - save messages to memory
   */
  private static async handleStreamingFallback(
    appId: string
  ): Promise<Response> {
    try {
      // Try to save any unsaved messages to memory
      const unsavedMessages = await AIService.getUnsavedMessages(appId);
      if (unsavedMessages.length > 0) {
        await AIService.saveMessagesToMemory(
          builderAgent,
          appId,
          unsavedMessages
        );
      }

      return ErrorHandler.createStreamSuccessResponse(
        "Message processed and saved to memory. Streaming will resume on next request."
      );
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      throw new Error("Failed to process message. Please try again.");
    }
  }

  /**
   * Validate that the request has all required components
   */
  static validateChatRequest(req: NextRequest): Response | null {
    // Check for required headers
    const validationError = ErrorHandler.validateRequest(req, [
      "Adorable-App-Id",
    ]);
    if (validationError) {
      return validationError;
    }

    // Check content type
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return ErrorHandler.handleError(
        new Error("Invalid content type. Expected application/json"),
        "request-validation"
      );
    }

    return null;
  }
}
