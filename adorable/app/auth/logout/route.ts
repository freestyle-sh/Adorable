import { NextResponse } from "next/server";
import { getSafeAuthRedirectPath } from "@/lib/product-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const next = getSafeAuthRedirectPath(requestUrl.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
