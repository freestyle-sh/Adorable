import { useState, useCallback, useEffect } from "react";

interface UseStreamRecoveryOptions {
  onError?: (error: string) => void;
  messageCount?: number;
}

export function useStreamRecovery({
  onError,
  messageCount,
}: UseStreamRecoveryOptions) {
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Clear error state when messages arrive successfully
  useEffect(() => {
    if (messageCount && messageCount > 0) {
      setLastError(null);
      setRetryCount(0);
      setIsRecovering(false);
    }
  }, [messageCount]);

  const handleError = useCallback(
    (error: Error | unknown) => {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Stream error occurred";
      setLastError(errorMessage);
      onError?.(errorMessage);

      // Auto-retry on error
      setTimeout(
        () => {
          if (retryCount < 3) {
            console.log(
              `Auto-retrying chat stream (attempt ${retryCount + 1})`
            );
            setRetryCount((prev) => prev + 1);
            setIsRecovering(true);
            // The reload will be called by the parent component
          }
        },
        2000 * (retryCount + 1)
      );
    },
    [retryCount, onError]
  );

  const resetErrorState = useCallback(() => {
    setLastError(null);
    setRetryCount(0);
    setIsRecovering(false);
  }, []);

  const forceRecovery = useCallback(
    async (stop: () => Promise<void>, reload: () => void) => {
      setIsRecovering(true);
      setLastError("Forcing stream recovery...");
      try {
        await stop();
        setTimeout(() => {
          reload();
          setIsRecovering(false);
        }, 1000);
      } catch (error) {
        console.error("Force recovery failed:", error);
        setIsRecovering(false);
      }
    },
    []
  );

  return {
    retryCount,
    lastError,
    isRecovering,
    handleError,
    resetErrorState,
    forceRecovery,
  };
}
