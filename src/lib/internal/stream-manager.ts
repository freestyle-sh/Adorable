import { UIMessage } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { getRedis, getRedisPublisher } from "./redis";
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
  const redisPublisher = await getRedisPublisher();
  let state = null;
  if (redisPublisher) {
    try {
      state = await redisPublisher.get(`app:${appId}:stream-state`);
    } catch (error) {
      console.warn("Failed to get stream state from Redis:", error);
    }
  }
  return { state };
}

/**
 * Check if a stream is currently running for an app
 */
export async function isStreamRunning(appId: string): Promise<boolean> {
  const redisPublisher = await getRedisPublisher();
  if (redisPublisher) {
    try {
      const state = await redisPublisher.get(`app:${appId}:stream-state`);
      return state === "running";
    } catch (error) {
      console.warn("Failed to check stream state from Redis:", error);
    }
  }
  return false;
}

/**
 * Stop a running stream for an app
 */
export async function stopStream(appId: string): Promise<void> {
  const redisPublisher = await getRedisPublisher();
  if (redisPublisher) {
    try {
      await redisPublisher.publish(
        `events:${appId}`,
        JSON.stringify({ type: "abort-stream" })
      );
      await redisPublisher.del(`app:${appId}:stream-state`);
    } catch (error) {
      console.warn("Failed to stop stream via Redis:", error);
    }
  }
}

/**
 * Wait for a stream to stop (with timeout)
 */
export async function waitForStreamToStop(
  appId: string,
  maxAttempts: number = 60
): Promise<boolean> {
  const redisPublisher = await getRedisPublisher();
  if (!redisPublisher) {
    return true; // If Redis is not available, assume stream is stopped
  }
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const state = await redisPublisher.get(`app:${appId}:stream-state`);
      if (!state) {
        return true;
      }
    } catch (error) {
      console.warn("Failed to check stream state:", error);
      return true; // If Redis fails, assume stream is stopped
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

/**
 * Clear the stream state for an app
 */
export async function clearStreamState(appId: string): Promise<void> {
  const redisPublisher = await getRedisPublisher();
  if (redisPublisher) {
    try {
      await redisPublisher.del(`app:${appId}:stream-state`);
    } catch (error) {
      console.warn("Failed to clear stream state from Redis:", error);
    }
  }
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

  const redisPublisher = await getRedisPublisher();
  if (redisPublisher) {
    try {
      await redisPublisher.setEx(`app:${appId}:stream-state`, 15, "running");
    } catch (error) {
      console.warn("Failed to set stream state in Redis:", error);
    }
  }

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
      getRedis().then((redis) => {
        if (redis) {
          try {
            redis.subscribe(`events:${appId}`, (event: string) => {
              const data = JSON.parse(event);
              if (data.type === "abort-stream") {
                console.log("cancelling http stream");
                resumableStream?.cancel();
              }
            });
          } catch (error) {
            console.warn("Failed to set up Redis subscription:", error);
          }
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
  const redis = await getRedis();
  if (redis) {
    try {
      redis.subscribe(`events:${appId}`, (event: string) => {
        const data = JSON.parse(event);
        if (data.type === "abort-stream") {
          callback();
        }
      });
    } catch (error) {
      console.warn("Failed to set up abort callback via Redis:", error);
    }
  }
}

/**
 * Update the keep-alive timestamp for a stream
 */
export async function updateKeepAlive(appId: string): Promise<void> {
  const redisPublisher = await getRedisPublisher();
  if (redisPublisher) {
    try {
      await redisPublisher.setEx(`app:${appId}:stream-state`, 15, "running");
    } catch (error) {
      console.warn("Failed to update keep-alive in Redis:", error);
    }
  }
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
  const controller = new AbortController();
  let shouldAbort = false;

  // Set up abort callback
  await setupAbortCallback(appId, () => {
    shouldAbort = true;
  });

  let lastKeepAlive = Date.now();

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
        if (Date.now() - lastKeepAlive > 5000) {
          lastKeepAlive = Date.now();
          await updateKeepAlive(appId);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async onStepFinish(_step: { response: { messages: unknown[] } }) {
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
        await handleStreamLifecycle(appId, "error");
      },
      onFinish: async () => {
        await handleStreamLifecycle(appId, "finish");
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

  return await setStream(appId, message, aiResponse.stream);
}
