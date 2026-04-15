import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/login";

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
  const redirectUrl = new URL(next, redirectBase);

  if (!token_hash || !type) {
    redirectUrl.searchParams.set("error", "missing_token");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const normalizedType =
    type === "invite" || type === "recovery" || type === "email"
      ? type
      : "invite";

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: normalizedType as "invite" | "recovery" | "email",
  });

  if (error) {
    redirectUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}