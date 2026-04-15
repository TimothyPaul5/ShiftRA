import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProfileById } from "@/lib/data/profileRepository";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (userId === callerUser.id) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account from here." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileLookupError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileLookupError || !profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const { data: assignedShifts, error: assignedShiftError } = await supabaseAdmin
      .from("schedule_assignments")
      .select("id")
      .eq("assigned_ra_id", userId)
      .limit(1);

    if (assignedShiftError) {
      return NextResponse.json({ error: assignedShiftError.message }, { status: 400 });
    }

    if (assignedShifts && assignedShifts.length > 0) {
      return NextResponse.json(
        {
          error:
            "This user still has scheduled shifts. Remove or clear those shifts before deleting the user.",
          code: "USER_HAS_SCHEDULES",
        },
        { status: 400 }
      );
    }

    const cleanupErrors: string[] = [];

    const { error: availabilityDeleteError } = await supabaseAdmin
      .from("availability")
      .delete()
      .eq("ra_id", userId);

    if (availabilityDeleteError) {
      cleanupErrors.push(`availability: ${availabilityDeleteError.message}`);
    }

    const { error: incomingSwapDeleteError } = await supabaseAdmin
      .from("swap_requests")
      .delete()
      .eq("target_ra_id", userId);

    if (incomingSwapDeleteError) {
      cleanupErrors.push(`incoming swaps: ${incomingSwapDeleteError.message}`);
    }

    const { error: outgoingSwapDeleteError } = await supabaseAdmin
      .from("swap_requests")
      .delete()
      .eq("requester_ra_id", userId);

    if (outgoingSwapDeleteError) {
      cleanupErrors.push(`outgoing swaps: ${outgoingSwapDeleteError.message}`);
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      cleanupErrors.push(`profile: ${profileDeleteError.message}`);
    }

    if (cleanupErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Failed to remove all app data: " + cleanupErrors.join(" | "),
        },
        { status: 400 }
      );
    }

    let authDeleteErrorMessage: string | null = null;

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      authDeleteErrorMessage = authDeleteError.message;
    }

    if (authDeleteErrorMessage && authDeleteErrorMessage !== "User not found") {
      return NextResponse.json(
        {
          error:
            "Profile data was removed, but auth user deletion failed: " +
            authDeleteErrorMessage,
        },
        { status: 400 }
      );
    }

    if (authDeleteErrorMessage === "User not found" && profile.email) {
      const { data: listedUsers, error: listUsersError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (listUsersError) {
        return NextResponse.json(
          {
            error:
              "Profile data was removed, but auth fallback lookup failed: " +
              listUsersError.message,
          },
          { status: 400 }
        );
      }

      const matchingAuthUser = listedUsers.users.find(
        (user) => user.email?.toLowerCase() === profile.email.toLowerCase()
      );

      if (matchingAuthUser) {
        const { error: fallbackDeleteError } =
          await supabaseAdmin.auth.admin.deleteUser(matchingAuthUser.id);

        if (fallbackDeleteError && fallbackDeleteError.message !== "User not found") {
          return NextResponse.json(
            {
              error:
                "Profile data was removed, but auth fallback delete failed: " +
                fallbackDeleteError.message,
            },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}