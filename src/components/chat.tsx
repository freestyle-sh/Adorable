"use client";

import { useQuery } from "@tanstack/react-query";
import { chatState } from "@/actions/chat-streaming";
import { PromptInputBasic } from "./chatinput";
import { useState } from "react";
import { ChatContainer } from "./ui/chat-container";
import { UIMessage } from "ai";
import { useChatSafe } from "./use-chat";
import Image from "next/image";
import { Markdown } from "./ui/markdown";
import { ToolMessage } from "./tools";
import { useStreamRecovery } from "@/hooks/use-stream-recovery";

export default function Chat(props: {
  appId: string;
  initialMessages: UIMessage[];
  running: boolean;
}) {
  const { data: chat } = useQuery({
    queryKey: ["chat", props.appId],
    queryFn: () => chatState(props.appId),
    refetchInterval: 1000,
  });

  const { messages, sendMessage, reload, stop } = useChatSafe({
    messages: props.initialMessages,
    id: props.appId,
    resume: props.running && chat?.state === "running",
    onError: (error: Error | unknown) => {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Stream error occurred";
      setLastError(errorMessage);
      setTimeout(() => {
        reload();
      }, 2000);
    },
  });

  const [input, setInput] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);

  const { retryCount, isRecovering, resetErrorState, forceRecovery } =
    useStreamRecovery({
      onError: setLastError,
      messageCount: messages.length,
    });

  const onSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    resetErrorState();
    sendMessage(
      {
        id: crypto.randomUUID(),
        parts: [{ text: input, type: "text" }],
        role: "user",
      },
      {
        headers: {
          "Adorable-App-Id": props.appId,
        },
      }
    );
    setInput("");
  };

  const handleStop = async () => {
    await fetch("/api/chat/" + props.appId + "/stream", {
      method: "DELETE",
      headers: {
        "Adorable-App-Id": props.appId,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Error display */}
      {lastError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-red-800 text-sm">
                {isRecovering
                  ? "Recovering..."
                  : `Connection issue detected. ${retryCount > 0 && `Retry attempt ${retryCount}/3`}`}
              </div>
            </div>
            <div className="flex gap-2">
              {!isRecovering && (
                <button
                  onClick={() => {
                    resetErrorState();
                    reload();
                  }}
                  className="text-red-600 hover:text-red-800 text-sm font-medium underline"
                >
                  Retry now
                </button>
              )}
              <button
                onClick={() => forceRecovery(stop, reload)}
                className="text-red-600 hover:text-red-800 text-sm font-medium underline"
                disabled={isRecovering}
              >
                Force recovery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery status */}
      {isRecovering && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-4 mt-4">
          <div className="flex items-center">
            <div className="text-blue-800 text-sm">
              Recovering stream... Please wait.
            </div>
          </div>
        </div>
      )}

      <ChatContainer autoScroll>
        {messages.map((message: UIMessage) => (
          <MessageBody key={message.id} message={message} />
        ))}
      </ChatContainer>

      <div className="p-4 border-t">
        <PromptInputBasic
          input={input}
          onValueChange={setInput}
          onSubmit={onSubmit}
          onSubmitWithImages={(text, images) => {
            if (text.trim()) {
              sendMessage(
                {
                  id: crypto.randomUUID(),
                  parts: [
                    { text, type: "text" },
                    ...images.map((img) => ({
                      type: "file" as const,
                      url: img.data,
                      mediaType: img.mimeType,
                    })),
                  ],
                  role: "user",
                },
                {
                  headers: {
                    "Adorable-App-Id": props.appId,
                  },
                }
              );
            } else if (images.length > 0) {
              sendMessage(
                {
                  id: crypto.randomUUID(),
                  parts: images.map((img) => ({
                    type: "file" as const,
                    url: img.data,
                    mediaType: img.mimeType,
                  })),
                  role: "user",
                },
                {
                  headers: {
                    "Adorable-App-Id": props.appId,
                  },
                }
              );
            }
            setInput("");
          }}
          stop={handleStop}
          isGenerating={chat?.state === "running"}
        />
      </div>
    </div>
  );
}

function MessageBody({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-1 mb-4">
        <div className="bg-neutral-200 dark:bg-neutral-700 rounded-xl px-4 py-1 max-w-[80%] ml-auto">
          {message.parts.map(
            (
              part: {
                type: string;
                text?: string;
                url?: string;
                mediaType?: string;
              },
              index: number
            ) => {
              if (part.type === "text") {
                return <div key={index}>{part.text}</div>;
              } else if (
                part.type === "file" &&
                part.mediaType?.startsWith("image/")
              ) {
                return (
                  <div key={index} className="mt-2">
                    <Image
                      src={part.url as string}
                      alt="User uploaded image"
                      width={200}
                      height={200}
                      className="max-w-full h-auto rounded"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                );
              }
              return <div key={index}>unexpected message</div>;
            }
          )}
        </div>
      </div>
    );
  }

  if (Array.isArray(message.parts) && message.parts.length !== 0) {
    return (
      <div className="mb-4">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div key={index} className="mb-4">
                <Markdown className="prose prose-sm dark:prose-invert max-w-none">
                  {part.text}
                </Markdown>
              </div>
            );
          }

          if (part.type.startsWith("tool-")) {
            return <ToolMessage key={index} toolInvocation={part} />;
          }

          return null;
        })}
      </div>
    );
  }

  if (message.parts) {
    return (
      <Markdown className="prose prose-sm dark:prose-invert max-w-none">
        {message.parts
          .map((part: { type: string; text?: string }) =>
            part.type === "text" ? part.text : "[something went wrong]"
          )
          .join("")}
      </Markdown>
    );
  }

  return (
    <div>
      <p className="text-gray-500">Something went wrong</p>
    </div>
  );
}
