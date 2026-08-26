import { describe, expect, it } from "vitest";
import {
  isValidProductionDomain,
  normalizeProductionDomain,
} from "@/lib/application/production-domain";

describe("normalizeProductionDomain", () => {
  it("normalizes whitespace, case, protocol, and path", () => {
    expect(normalizeProductionDomain(" HTTPS://Project.Style.Dev/path ")).toBe(
      "project.style.dev",
    );
  });

  it("preserves query strings without a slash", () => {
    expect(normalizeProductionDomain("project.style.dev?x=1")).toBe(
      "project.style.dev?x=1",
    );
  });
});

describe("isValidProductionDomain", () => {
  it.each(["project.style.dev", "sub.project.style.dev"])(
    "accepts %s",
    (domain) => {
      expect(isValidProductionDomain(domain)).toBe(true);
    },
  );

  it.each([
    "style.dev",
    "evilstyle.dev",
    "project.style.dev.evil.com",
    "project.style.dev:3000",
    "",
    "PROJECT.STYLE.DEV",
    "https://project.style.dev",
  ])("rejects %s", (domain) => {
    expect(isValidProductionDomain(domain)).toBe(false);
  });

  it("accepts user input after normalization", () => {
    const domain = normalizeProductionDomain(" HTTPS://PROJECT.STYLE.DEV/path ");

    expect(isValidProductionDomain(domain)).toBe(true);
  });
});
