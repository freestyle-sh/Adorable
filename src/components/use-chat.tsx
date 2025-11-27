import { useChat } from "@ai-sdk/react";
import { useEffect } from "react";

// For some reason, if the chat is resumed during a router page navigation, it
// will try to resume the stream multiple times and result in some sort of leak
// where the chat is spammed with new messages. This only happens in dev mode. I
// think it's related to react rendering components twice in dev mode so
// discover bugs. This utility prevents a stream from being resumed multiple
// times.
const runningChats = new Set<string>();
export function useChatSafe(
  options: Parameters<typeof useChat>[0] & {
    id: string;
    onFinish?: () => void;
    api?: string;
  }
) {
  const id = options.id;
  const resume = options?.resume;

  options.resume = undefined;

  const onFinish = options.onFinish;
  options.onFinish = () => {
    runningChats.delete(id);
    if (onFinish) {
      onFinish();
    }
  };

  const chat = useChat(options);

  useEffect(() => {
    if (!runningChats.has(id) && resume) {
      chat.resumeStream();
      runningChats.add(id);
    }

    return () => {
      if (runningChats.has(id)) {
        chat.stop().then(() => {
          runningChats.delete(id);
        });
      }
    };
  }, [resume, id]);

  return chat;
}
