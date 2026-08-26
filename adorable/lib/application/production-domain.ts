const PRODUCTION_SUFFIX = ".style.dev";

export const normalizeProductionDomain = (domain: string): string => {
  const trimmed = domain.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  return withoutProtocol.split("/")[0] ?? "";
};

export const isValidProductionDomain = (domain: string): boolean => {
  return (
    domain.endsWith(PRODUCTION_SUFFIX) &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)*\.style\.dev$/.test(
      domain,
    )
  );
};
