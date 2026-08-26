import { describe, expect, it } from "vitest";
import {
  AuthenticationRequiredError,
  getCurrentUserFromSupabase,
} from "@/lib/product-auth/current-user";

describe("getCurrentUserFromSupabase", () => {
  it("returns the authenticated user", async () => {
    const user = { id: "user-id", email: "user@example.com" };

    const result = await getCurrentUserFromSupabase({
      auth: {
        async getUser() {
          return { data: { user }, error: null };
        },
      },
    });

    expect(result).toBe(user);
  });

  it("returns null when Supabase has no authenticated user", async () => {
    const result = await getCurrentUserFromSupabase({
      auth: {
        async getUser() {
          return { data: { user: null }, error: null };
        },
      },
    });

    expect(result).toBeNull();
  });

  it("returns null when Supabase returns an auth error", async () => {
    const result = await getCurrentUserFromSupabase({
      auth: {
        async getUser() {
          return {
            data: { user: null },
            error: new AuthenticationRequiredError(),
          };
        },
      },
    });

    expect(result).toBeNull();
  });
});
