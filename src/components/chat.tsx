"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChangeEvent, useEffect } from "react";
import { ChatContainer } from "./ui/chat-container";
import { Message } from "ai";
import { ToolMessage } from "./tools";
import { IntegrationsButton } from "./IntegrationsButton";

export default function Chat(props: {
  appId: string;
  initialMessages: Message[];
  isLoading?: boolean;
  topBar?: React.ReactNode;
  unsentMessage?: string;
}) {
  const { messages, handleSubmit, input, handleInputChange, status, append } =
    useChat({
      initialMessages: props.initialMessages,
      generateId: () => {
        return "cs-" + crypto.randomUUID();
      },
      sendExtraMessageFields: true,
      headers: {
        "Adorable-App-Id": props.appId,
      },
      api: "/api/chat",
      experimental_prepareRequestBody: (request) => {
        const lastMessage = request.messages.at(-1) ?? null;
        return {
          message: lastMessage,
          threadId: props.appId,
          resourceId: props.appId,
        };
      },
    });

  useEffect(() => {
    const url = new URL(window.location.href);
    const unsentMessageRaw = url.searchParams.get("unsentMessage");
    url.searchParams.delete("unsentMessage");

    const unsentMessage = unsentMessageRaw
      ? decodeURIComponent(unsentMessageRaw)
      : null;

    if (unsentMessage) {
      window.history.replaceState(undefined, "", url.toString());

      append({
        content: unsentMessage,
        role: "user",
      });
    }
  });

  const onValueChange = (value: string) => {
    handleInputChange({
      target: { value },
    } as ChangeEvent<HTMLTextAreaElement>);
  };

  const onSubmit = (e?: Event) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col h-screen">
      {props.topBar}
      <div className="flex-1 overflow-y-auto flex flex-col space-y-6">
        <ChatContainer autoScroll>
          {messages.map((message) => (
            <MessageBody key={message.id} message={message} />
          ))}
        </ChatContainer>
      </div>
      <div className="p-3 transition-all bg-background backdrop-blur-sm z-10">
        <IntegrationsButton mode="manage" />
        <PromptInputBasic
          input={input || ""}
          onSubmit={onSubmit}
          onValueChange={onValueChange}
          isGenerating={
            props.isLoading || status === "streaming" || status === "submitted"
          }
        />
      </div>
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-1 mb-4">
        <div className="bg-neutral-200 dark:bg-neutral-700 rounded-xl px-4 py-1 max-w-[80%] ml-auto">
          {message.content}
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

          if (part.type === "tool-invocation") {
            if (
              part.toolInvocation.state === "result" &&
              part.toolInvocation.result.isError
            ) {
              return (
                <div
                  key={index}
                  className="border-red-500 border text-sm text-red-800 rounded bg-red-100 px-2 py-1 mt-2 mb-4"
                >
                  {part.toolInvocation.result?.content?.map(
                    (content: { type: "text"; text: string }, i: number) => (
                      <div key={i}>{content.text}</div>
                    )
                  )}
                  {/* Unexpectedly failed while using tool{" "}
                  {part.toolInvocation.toolName}. Please try again. again. */}
                </div>
              );
            }

            // if (
            //   message.parts!.length - 1 == index &&
            //   part.toolInvocation.state !== "result"
            // ) {
            return (
              <ToolMessage key={index} toolInvocation={part.toolInvocation} />
            );
            // } else {
            //   return undefined;
            // }
          }
        })}
      </div>
    );
  }

  if (message.content) {
    return (
      <Markdown className="prose prose-sm dark:prose-invert max-w-none">
        {message.content}
      </Markdown>
    );
  }

  return (
    <div>
      <p className="text-gray-500">Something went wrong</p>
    </div>
  );
}
