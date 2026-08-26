import { NextResponse, type NextRequest } from "next/server";
import { getSafeAuthRedirectPath } from "@/lib/product-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeAuthRedirectPath(requestUrl.searchParams.get("next"));
  const redirectTo = new URL(next, requestUrl.origin);

  if (!code) {
    redirectTo.searchParams.set("auth_error", "missing_code");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectTo.searchParams.set("auth_error", "callback_failed");
  }

  return NextResponse.redirect(redirectTo);
}
