import { describe, expect, it } from "vitest";
import {
  DEPLOYMENT_DOMAIN_SUFFIX,
  getDomainForCommit,
} from "@/lib/deployment-status";

describe("getDomainForCommit", () => {
  it("uses the first 12 characters of a long commit SHA", () => {
    expect(getDomainForCommit("abcdef1234567890")).toBe(
      "abcdef123456-adorable.style.dev",
    );
  });

  it("uses the whole value for a short commit SHA", () => {
    expect(getDomainForCommit("abc123")).toBe(
      `abc123-${DEPLOYMENT_DOMAIN_SUFFIX}`,
    );
  });

  it("preserves the current empty string behavior", () => {
    expect(getDomainForCommit("")).toBe(`-${DEPLOYMENT_DOMAIN_SUFFIX}`);
  });
});
