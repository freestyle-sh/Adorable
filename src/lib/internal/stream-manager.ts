import { UIMessage } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { redis, redisPublisher } from "./redis";
import { AIService } from "./ai-service";
import { Agent } from "@mastra/core/agent";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";

const streamContext = createResumableStreamContext({
  waitUntil: after,
});

export interface StreamState {
  state: string | null;
}

export interface StreamResponse {
  response(): Response;
}

export interface StreamInfo {
  readableStream(): Promise<ReadableStream<string>>;
  response(): Promise<Response>;
}

/**
 * Get the current stream state for an app
 */
export async function getStreamState(appId: string): Promise<StreamState> {
  const state = await redisPublisher.get(`app:${appId}:stream-state`);
  return { state };
}

/**
 * Check if a stream is currently running for an app
 */
export async function isStreamRunning(appId: string): Promise<boolean> {
  const state = await redisPublisher.get(`app:${appId}:stream-state`);
  return state === "running";
}

/**
 * Stop a running stream for an app
 */
export async function stopStream(appId: string): Promise<void> {
  await redisPublisher.publish(
    `events:${appId}`,
    JSON.stringify({ type: "abort-stream" })
  );
  await redisPublisher.del(`app:${appId}:stream-state`);
}

/**
 * Wait for a stream to stop (with timeout)
 */
export async function waitForStreamToStop(
  appId: string,
  maxAttempts: number = 60
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const state = await redisPublisher.get(`app:${appId}:stream-state`);
    if (!state) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

/**
 * Clear the stream state for an app
 */
export async function clearStreamState(appId: string): Promise<void> {
  await redisPublisher.del(`app:${appId}:stream-state`);
}

/**
 * Get an existing stream for an app
 */
export async function getStream(appId: string): Promise<StreamInfo | null> {
  const hasStream = await streamContext.hasExistingStream(appId);
  if (hasStream === true) {
    return {
      async readableStream() {
        const stream = await streamContext.resumeExistingStream(appId);
        if (!stream) {
          throw new Error("Failed to resume existing stream");
        }
        return stream;
      },
      async response() {
        const resumableStream = await streamContext.resumeExistingStream(appId);
        if (!resumableStream) {
          throw new Error("Failed to resume existing stream");
        }
        return new Response(resumableStream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            "x-vercel-ai-ui-message-stream": "v1",
            "x-accel-buffering": "no",
          },
        });
      },
    };
  }
  return null;
}

/**
 * Set up a new stream for an app
 */
export async function setStream(
  appId: string,
  prompt: UIMessage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: any
): Promise<StreamResponse> {
  if (!stream.toUIMessageStreamResponse) {
    console.error("Stream missing toUIMessageStreamResponse method!");
    throw new Error("Stream missing required toUIMessageStreamResponse method");
  }

  const responseBody = stream.toUIMessageStreamResponse().body;

  if (!responseBody) {
    console.error("Response body is undefined!");
    throw new Error(
      "Error creating resumable stream: response body is undefined"
    );
  }

  await redisPublisher.set(`app:${appId}:stream-state`, "running", {
    EX: 15,
  });

  const resumableStream = await streamContext.createNewResumableStream(
    appId,
    () => {
      return responseBody.pipeThrough(
        new TextDecoderStream()
      ) as ReadableStream<string>;
    }
  );

  if (!resumableStream) {
    console.error("Failed to create resumable stream");
    throw new Error("Failed to create resumable stream");
  }

  return {
    response() {
      // Set up abort callback directly since this is a synchronous context
      redis.subscribe(`events:${appId}`, (event) => {
        const data = JSON.parse(event);
        if (data.type === "abort-stream") {
          console.log("cancelling http stream");
          resumableStream?.cancel();
        }
      });

      return new Response(resumableStream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-vercel-ai-ui-message-stream": "v1",
          "x-accel-buffering": "no",
        },
        status: 200,
      });
    },
  };
}

/**
 * Set up an abort callback for a stream
 */
export async function setupAbortCallback(
  appId: string,
  callback: () => void
): Promise<void> {
  redis.subscribe(`events:${appId}`, (event) => {
    const data = JSON.parse(event);
    if (data.type === "abort-stream") {
      callback();
    }
  });
}

/**
 * Update the keep-alive timestamp for a stream
 */
export async function updateKeepAlive(appId: string): Promise<void> {
  await redisPublisher.set(`app:${appId}:stream-state`, "running", {
    EX: 15,
  });
}

/**
 * Handle stream lifecycle events (start, finish, error)
 */
export async function handleStreamLifecycle(
  appId: string,
  event: "start" | "finish" | "error"
): Promise<void> {
  switch (event) {
    case "start":
      await updateKeepAlive(appId);
      break;
    case "finish":
    case "error":
      await clearStreamState(appId);
      break;
  }
}

// Stream health monitoring
const streamHealth = new Map<
  string,
  { lastActivity: number; startTime: number; messageCount: number }
>();
const STREAM_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const STREAM_HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds

// Health check timer
setInterval(async () => {
  const now = Date.now();
  for (const [appId, health] of streamHealth.entries()) {
    // Check for stuck streams (no activity for too long)
    if (now - health.lastActivity > STREAM_TIMEOUT) {
      console.warn(`Stream ${appId} appears stuck, forcing cleanup`);
      try {
        await forceCleanupStream(appId);
      } catch (error) {
        console.error(`Failed to cleanup stuck stream ${appId}:`, error);
      }
    }

    // Check for streams running too long
    if (now - health.startTime > 10 * 60 * 1000) {
      // 10 minutes
      console.warn(`Stream ${appId} running too long, forcing cleanup`);
      try {
        await forceCleanupStream(appId);
      } catch (error) {
        console.error(`Failed to cleanup long-running stream ${appId}:`, error);
      }
    }
  }
}, STREAM_HEALTH_CHECK_INTERVAL);

/**
 * Force cleanup a stream that's stuck or problematic
 */
async function forceCleanupStream(appId: string) {
  try {
    // Clear all stream state
    await clearStreamState(appId);

    // Remove from health monitoring
    streamHealth.delete(appId);

    // Release stream slot
    releaseStreamSlot(appId);

    // Clear any Redis keys
    await redis.del(`stream:${appId}`);
    await redis.del(`stream:${appId}:keepalive`);
    await redis.del(`stream:${appId}:events`);

    console.log(`Forced cleanup completed for stream ${appId}`);
  } catch (error) {
    console.error(`Error during forced cleanup of stream ${appId}:`, error);
  }
}

/**
 * Check if a stream is actually healthy and not stuck
 */
async function isStreamHealthy(appId: string): Promise<boolean> {
  try {
    const health = streamHealth.get(appId);
    if (!health) return false;

    const now = Date.now();
    const timeSinceLastActivity = now - health.lastActivity;
    const streamAge = now - health.startTime;

    // Stream is healthy if it's had recent activity and isn't too old
    return timeSinceLastActivity < STREAM_TIMEOUT && streamAge < 10 * 60 * 1000;
  } catch (error) {
    console.error(`Error checking stream health for ${appId}:`, error);
    return false;
  }
}

/**
 * Prevent multiple streams from running simultaneously for the same app
 */
async function ensureSingleStream(appId: string): Promise<void> {
  try {
    // Check if there's already a healthy stream running
    if (await isStreamRunning(appId)) {
      const isHealthy = await isStreamHealthy(appId);
      if (isHealthy) {
        console.log(
          `Stream ${appId} is already running and healthy, stopping previous`
        );
        await stopStream(appId);
        await waitForStreamToStop(appId);
      } else {
        console.log(`Stream ${appId} appears stuck, forcing cleanup`);
        await forceCleanupStream(appId);
      }
    }

    // Clear any stale state
    await clearStreamState(appId);

    // Initialize health monitoring
    streamHealth.set(appId, {
      lastActivity: Date.now(),
      startTime: Date.now(),
      messageCount: 0,
    });
  } catch (error) {
    console.error(`Error ensuring single stream for ${appId}:`, error);
    // If we can't ensure single stream, force cleanup and continue
    await forceCleanupStream(appId);
  }
}

/**
 * Update stream health with activity
 */
function updateStreamHealth(appId: string, messageCount?: number) {
  const health = streamHealth.get(appId);
  if (health) {
    health.lastActivity = Date.now();
    if (messageCount !== undefined) {
      health.messageCount = messageCount;
    }
  }
}

// Connection pool to prevent too many simultaneous streams
const MAX_CONCURRENT_STREAMS = 10;
const activeStreams = new Set<string>();

/**
 * Check if we can start a new stream
 */
function canStartNewStream(): boolean {
  return activeStreams.size < MAX_CONCURRENT_STREAMS;
}

/**
 * Reserve a stream slot
 */
function reserveStreamSlot(appId: string): boolean {
  if (canStartNewStream()) {
    activeStreams.add(appId);
    return true;
  }
  return false;
}

/**
 * Release a stream slot
 */
function releaseStreamSlot(appId: string): void {
  activeStreams.delete(appId);
}

// Global lock to prevent multiple streams for the same app
const streamLocks = new Map<string, Promise<StreamResponse>>();

/**
 * Send a message to the AI and handle all stream plumbing internally
 * This is the main interface that developers should use
 */
export async function sendMessageWithStreaming(
  agent: Agent,
  appId: string,
  mcpUrl: string,
  fs: FreestyleDevServerFilesystem,
  message: UIMessage
) {
  // Check if there's already a stream operation in progress for this app
  if (streamLocks.has(appId)) {
    console.log(
      `Stream operation already in progress for ${appId}, waiting...`
    );
    await streamLocks.get(appId);
    // After waiting, check if we still need to send the message
    if (await isStreamRunning(appId)) {
      console.log(`Stream ${appId} is now running, returning existing stream`);
      const existingStream = await getStream(appId);
      if (existingStream) {
        return existingStream;
      }
    }
  }

  // Create a lock for this app
  const streamPromise = (async (): Promise<StreamResponse> => {
    try {
      // Check connection pool
      if (!canStartNewStream()) {
        console.warn(
          `Connection pool full (${activeStreams.size}/${MAX_CONCURRENT_STREAMS}), forcing cleanup of oldest streams`
        );

        // Force cleanup of oldest streams to make room
        const oldestStreams = Array.from(activeStreams).slice(0, 2);
        for (const oldAppId of oldestStreams) {
          await forceCleanupStream(oldAppId);
        }
      }

      // Reserve stream slot
      if (!reserveStreamSlot(appId)) {
        throw new Error(
          "Unable to reserve stream slot - connection pool exhausted"
        );
      }

      // Ensure only one stream per app
      await ensureSingleStream(appId);

      const controller = new AbortController();
      let shouldAbort = false;
      let fallbackToMemory = false;

      // Set up abort callback
      await setupAbortCallback(appId, () => {
        shouldAbort = true;
      });

      let lastKeepAlive = Date.now();

      try {
        // Use the AI service to handle the AI interaction
        const aiResponse = await AIService.sendMessage(
          agent,
          appId,
          mcpUrl,
          fs,
          message,
          {
            threadId: appId,
            resourceId: appId,
            maxSteps: 100,
            maxRetries: 0,
            maxOutputTokens: 64000,
            async onChunk() {
              const now = Date.now();
              if (now - lastKeepAlive > 5000) {
                lastKeepAlive = now;
                await updateKeepAlive(appId);
                updateStreamHealth(appId);
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async onStepFinish(_step: { response: { messages: unknown[] } }) {
              updateStreamHealth(appId);
              if (shouldAbort) {
                await handleStreamLifecycle(appId, "error");
                controller.abort("Aborted stream after step finish");
                const messages = await AIService.getUnsavedMessages(appId);
                console.log(messages);
                await AIService.saveMessagesToMemory(agent, appId, messages);
              }
            },
            onError: async (error: { error: unknown }) => {
              console.error("Stream error in manager:", error);
              fallbackToMemory = true;
              await handleStreamLifecycle(appId, "error");
              // Clean up health monitoring
              streamHealth.delete(appId);
              // Release stream slot
              releaseStreamSlot(appId);
            },
            onFinish: async () => {
              await handleStreamLifecycle(appId, "finish");
              // Clean up health monitoring
              streamHealth.delete(appId);
              // Release stream slot
              releaseStreamSlot(appId);
            },
            abortSignal: controller.signal,
          }
        );

        // Ensure the stream has the proper method
        if (!aiResponse.stream.toUIMessageStreamResponse) {
          console.error("Stream missing toUIMessageStreamResponse method!");
          throw new Error(
            "Invalid stream format - missing toUIMessageStreamResponse method"
          );
        }

        // Set up the resumable stream
        const resumableStream = await setStream(
          appId,
          message,
          aiResponse.stream
        );

        // Set up the abort callback
        await setupAbortCallback(appId, () => {
          controller.abort("Stream aborted by user");
        });

        // Handle the stream lifecycle
        await handleStreamLifecycle(appId, "start");

        return resumableStream;
      } catch (error) {
        console.error("Stream setup failed, falling back to memory:", error);
        fallbackToMemory = true;
        streamHealth.delete(appId); // New: Clean up health monitoring on setup failure
        releaseStreamSlot(appId); // New: Release slot on setup failure
      }

      // Fallback logic (if fallbackToMemory is true)
      if (fallbackToMemory) {
        console.log("Falling back to memory for app:", appId);
        try {
          // Try to get any unsaved messages and save them to memory
          const unsavedMessages = await AIService.getUnsavedMessages(appId);
          if (unsavedMessages.length > 0) {
            await AIService.saveMessagesToMemory(agent, appId, unsavedMessages);
          }

          // Return a simple response that indicates the message was processed
          return {
            response() {
              return new Response(
                `data: {"type": "message", "data": {"id": "${crypto.randomUUID()}", "role": "assistant", "content": "Message processed and saved to memory"}}\n\n`,
                {
                  headers: {
                    "content-type": "text/event-stream",
                    "cache-control": "no-cache",
                    connection: "keep-alive",
                  },
                }
              );
            },
          };
        } catch (fallbackError) {
          console.error("Fallback to memory also failed:", fallbackError);
          throw new Error("Failed to process message and fallback failed");
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error("Stream setup failed and no fallback available");
    } finally {
      // Always release the lock
      streamLocks.delete(appId);
    }
  })();

  // Store the lock promise
  streamLocks.set(appId, streamPromise);

  // Return the result
  return streamPromise;
}
