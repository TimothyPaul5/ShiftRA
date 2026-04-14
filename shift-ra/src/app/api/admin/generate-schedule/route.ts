import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProfileById } from "@/lib/data/profileRepository";
import {
  assessScheduleReadiness,
  generateScheduleForAllHalls,
  generateScheduleForHall,
} from "@/lib/core/scheduler";

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
      startDate,
      endDate,
      hallId,
      mode,
      action = "generate",
      overrideIncomplete = false,
      minimumRequiredDays = 2,
    } = body;

    if (action === "check") {
      const report = await assessScheduleReadiness({
        hallId: mode === "one" ? Number(hallId) : null,
        minimumRequiredDays: Number(minimumRequiredDays),
      });

      return NextResponse.json({
        success: true,
        action: "check",
        report,
      });
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required." },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date must be on or before end date." },
        { status: 400 }
      );
    }

    if (mode === "one") {
      if (!hallId) {
        return NextResponse.json(
          { error: "Hall ID is required for single-hall generation." },
          { status: 400 }
        );
      }

      const result = await generateScheduleForHall({
        hallId: Number(hallId),
        startDate,
        endDate,
        createdBy: callerUser.id,
        overrideIncomplete: Boolean(overrideIncomplete),
        minimumRequiredDays: Number(minimumRequiredDays),
      });

      return NextResponse.json({
        success: true,
        action: "generate",
        mode: "one",
        result,
      });
    }

    const results = await generateScheduleForAllHalls({
      startDate,
      endDate,
      createdBy: callerUser.id,
      overrideIncomplete: Boolean(overrideIncomplete),
      minimumRequiredDays: Number(minimumRequiredDays),
    });

    return NextResponse.json({
      success: true,
      action: "generate",
      mode: "all",
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}