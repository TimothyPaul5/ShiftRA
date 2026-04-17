import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProfileById } from "@/lib/data/profileRepository";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const callerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user: callerUser },
      error: callerAuthError,
    } = await callerClient.auth.getUser();

    if (callerAuthError || !callerUser) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const callerProfile = await getProfileById(callerUser.id);

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await req.json();

    const {
      name,
      capacity,
      weekday_staff_needed,
      weekend_staff_needed,
      minimum_required_availability_days,
    } = body as {
      name?: string;
      capacity?: number;
      weekday_staff_needed?: number;
      weekend_staff_needed?: number;
      minimum_required_availability_days?: number;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Hall name is required." }, { status: 400 });
    }

    if (
      capacity === undefined ||
      weekday_staff_needed === undefined ||
      weekend_staff_needed === undefined ||
      minimum_required_availability_days === undefined
    ) {
      return NextResponse.json(
        { error: "All hall fields are required." },
        { status: 400 }
      );
    }

    if (Number(capacity) < 1) {
      return NextResponse.json({ error: "Capacity must be at least 1." }, { status: 400 });
    }

    if (Number(weekday_staff_needed) < 1) {
      return NextResponse.json(
        { error: "Weekday staff needed must be at least 1." },
        { status: 400 }
      );
    }

    if (Number(weekend_staff_needed) < 1) {
      return NextResponse.json(
        { error: "Weekend staff needed must be at least 1." },
        { status: 400 }
      );
    }

    if (
      Number(minimum_required_availability_days) < 0 ||
      Number(minimum_required_availability_days) > 7
    ) {
      return NextResponse.json(
        { error: "Minimum required availability days must be between 0 and 7." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabaseAdmin.from("residence_halls").insert({
      name: name.trim(),
      capacity: Number(capacity),
      weekday_staff_needed: Number(weekday_staff_needed),
      weekend_staff_needed: Number(weekend_staff_needed),
      minimum_required_availability_days: Number(minimum_required_availability_days),
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}