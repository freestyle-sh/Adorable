export type CurrentUser = {
  id: string;
  email?: string;
};

type SupabaseAuthReader = {
  auth: {
    getUser(): Promise<{
      data: { user: CurrentUser | null };
      error: unknown;
    }>;
  };
};

export class AuthenticationRequiredError extends Error {
  readonly status = 401;

  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export const getCurrentUserFromSupabase = async (
  supabase: SupabaseAuthReader,
): Promise<CurrentUser | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  return getCurrentUserFromSupabase(supabase);
};

export const requireCurrentUser = async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  return user;
};
