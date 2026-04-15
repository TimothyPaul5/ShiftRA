import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProfileById } from "@/lib/data/profileRepository";
import { approveSwap, rejectSwap } from "@/lib/core/swaps";

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

    if (!callerProfile || callerProfile.role !== "ra") {
      return NextResponse.json({ error: "RA access required." }, { status: 403 });
    }

    const body = await req.json();
    const { swapRequestId, action } = body;

    if (!swapRequestId || !action) {
      return NextResponse.json(
        { error: "swapRequestId and action are required." },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const updated = await approveSwap(Number(swapRequestId), callerUser.id);
      return NextResponse.json({ success: true, swap: updated });
    }

    if (action === "reject") {
      const updated = await rejectSwap(Number(swapRequestId), callerUser.id);
      return NextResponse.json({ success: true, swap: updated });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}