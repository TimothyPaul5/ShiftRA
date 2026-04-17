import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProfileById } from "@/lib/data/profileRepository";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
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
    const { profileId, residence_hall_id } = body as {
      profileId?: string;
      residence_hall_id?: number | null;
    };

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required." }, { status: 400 });
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: "Target profile not found." }, { status: 404 });
    }

    if (targetProfile.role !== "ra") {
      return NextResponse.json(
        { error: "Only RAs can be assigned to residence halls." },
        { status: 400 }
      );
    }

    const currentHallId = targetProfile.residence_hall_id ?? null;
    const nextHallId = residence_hall_id ?? null;

    const hallIsChanging = currentHallId !== nextHallId;

    if (hallIsChanging) {
      const { data: assignedShifts, error: assignedShiftError } = await supabaseAdmin
        .from("schedule_assignments")
        .select("id")
        .eq("assigned_ra_id", profileId)
        .limit(1);

      if (assignedShiftError) {
        return NextResponse.json({ error: assignedShiftError.message }, { status: 400 });
      }

      if (assignedShifts && assignedShifts.length > 0) {
        return NextResponse.json(
          {
            error:
              "This RA still has scheduled shifts. Clear or reassign those shifts before changing residence halls.",
            code: "USER_HAS_SCHEDULES",
          },
          { status: 400 }
        );
      }
    }

    if (nextHallId) {
      const { data: hall, error: hallError } = await supabaseAdmin
        .from("residence_halls")
        .select("id, capacity")
        .eq("id", nextHallId)
        .single();

      if (hallError || !hall) {
        return NextResponse.json({ error: "Residence hall not found." }, { status: 404 });
      }

      const { count, error: countError } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "ra")
        .eq("residence_hall_id", nextHallId)
        .neq("id", profileId);

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 400 });
      }

      if ((count || 0) >= hall.capacity) {
        return NextResponse.json(
          { error: "That residence hall is already full." },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ residence_hall_id: nextHallId })
      .eq("id", profileId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}