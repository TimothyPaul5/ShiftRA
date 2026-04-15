import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", normalizedEmail)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: true,
        message:
          "If that account exists, a password reset request has been submitted for admin review.",
      });
    }

    const { data: existingPending, error: existingError } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "pending")
      .limit(1);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    if (existingPending && existingPending.length > 0) {
      return NextResponse.json({
        success: true,
        message:
          "If that account exists, a password reset request has already been submitted.",
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_requests")
      .insert({
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message:
        "If that account exists, a password reset request has been submitted for admin review.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}