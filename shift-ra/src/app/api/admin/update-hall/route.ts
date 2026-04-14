import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProfileById, getAllProfiles } from "@/lib/data/profileRepository";
import { updateHall } from "@/lib/data/hallRepository";
import { validateHallCapacityUpdate } from "@/lib/core/halls";

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
    const { id, name, capacity, weekday_staff_needed, weekend_staff_needed } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Hall ID and name are required." }, { status: 400 });
    }

    const profiles = await getAllProfiles();
    const capacityValidation = validateHallCapacityUpdate(Number(id), Number(capacity), profiles);

    if (!capacityValidation.ok) {
      return NextResponse.json({ error: capacityValidation.error }, { status: 400 });
    }

    const updated = await updateHall(Number(id), {
      name: String(name).trim(),
      capacity: Number(capacity),
      weekday_staff_needed: Number(weekday_staff_needed),
      weekend_staff_needed: Number(weekend_staff_needed),
    });

    return NextResponse.json({ success: true, hall: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}