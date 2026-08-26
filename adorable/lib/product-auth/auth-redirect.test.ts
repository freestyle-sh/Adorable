import { describe, expect, it } from "vitest";
import { getSafeAuthRedirectPath } from "@/lib/product-auth/auth-redirect";

describe("getSafeAuthRedirectPath", () => {
  it("allows internal relative redirects", () => {
    expect(getSafeAuthRedirectPath("/projects?tab=recent")).toBe(
      "/projects?tab=recent",
    );
  });

  it("falls back to home for external redirects", () => {
    expect(getSafeAuthRedirectPath("https://example.com")).toBe("/");
  });

  it("falls back to home for protocol-relative redirects", () => {
    expect(getSafeAuthRedirectPath("//example.com/path")).toBe("/");
  });

  it("falls back to home when next is missing", () => {
    expect(getSafeAuthRedirectPath(null)).toBe("/");
  });
});
