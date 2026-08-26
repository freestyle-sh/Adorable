const DEFAULT_AUTH_REDIRECT_PATH = "/";

export const getSafeAuthRedirectPath = (
  next: string | null | undefined,
): string => {
  if (!next) return DEFAULT_AUTH_REDIRECT_PATH;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  try {
    const parsed = new URL(trimmed, "https://adorable.local");
    if (parsed.origin !== "https://adorable.local") {
      return DEFAULT_AUTH_REDIRECT_PATH;
    }
  } catch {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  return trimmed;
};
