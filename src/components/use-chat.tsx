import { useChat } from "@ai-sdk/react";
import { useEffect, useCallback, useRef } from "react";

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
    onError?: (error: Error | unknown) => void;
  }
) {
  const id = options.id;
  const resume = options?.resume;
  const onError = options?.onError;
  const isResumingRef = useRef(false);

  options.resume = undefined;
  options.onError = undefined;

  const onFinish = options.onFinish;
  options.onFinish = useCallback(() => {
    runningChats.delete(id);
    isResumingRef.current = false;
    onFinish?.();
  }, [id, onFinish]);

  const chat = useChat(options);

  // Enhanced error handling with retry logic
  useEffect(() => {
    if (chat.error && onError) {
      onError(chat.error);
    }
  }, [chat.error, onError]);

  // Add reload functionality
  const reload = useCallback(() => {
    if (runningChats.has(id)) {
      runningChats.delete(id);
    }
    isResumingRef.current = false;

    return chat.stop().then(() => {
      // Force a fresh start
      if (resume) {
        setTimeout(() => {
          if (!runningChats.has(id) && !isResumingRef.current) {
            isResumingRef.current = true;
            chat.resumeStream();
            runningChats.add(id);
          }
        }, 100);
      }
    });
  }, [chat, id, resume]);

  useEffect(() => {
    if (!runningChats.has(id) && resume && !isResumingRef.current) {
      isResumingRef.current = true;
      chat.resumeStream();
      runningChats.add(id);
    }

    return () => {
      if (runningChats.has(id)) {
        chat.stop().then(() => {
          runningChats.delete(id);
          isResumingRef.current = false;
        });
      }
    };
  }, [resume, id, chat]);

  return { ...chat, reload };
}
