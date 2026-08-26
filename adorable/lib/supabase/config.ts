const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export const getSupabasePublicConfig = (): SupabasePublicConfig => {
  const url = process.env[SUPABASE_URL_ENV];
  const anonKey = process.env[SUPABASE_ANON_KEY_ENV];

  if (!url || !anonKey) {
    throw new Error(
      `${SUPABASE_URL_ENV} and ${SUPABASE_ANON_KEY_ENV} must be configured.`,
    );
  }

  return { url, anonKey };
};
