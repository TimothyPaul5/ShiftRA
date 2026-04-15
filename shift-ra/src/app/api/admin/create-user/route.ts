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
      email,
      password,
      full_name,
      role,
      residence_hall_id = null,
    } = body as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: "admin" | "ra";
      residence_hall_id?: number | null;
    };

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Email, password, full name, and role are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Temporary password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "ra") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (role === "ra" && residence_hall_id) {
      const { data: hall } = await supabaseAdmin
        .from("residence_halls")
        .select("id, capacity")
        .eq("id", residence_hall_id)
        .single();

      if (!hall) {
        return NextResponse.json({ error: "Residence hall not found." }, { status: 404 });
      }

      const { count } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "ra")
        .eq("residence_hall_id", residence_hall_id);

      if ((count || 0) >= hall.capacity) {
        return NextResponse.json(
          { error: "That residence hall is already full." },
          { status: 400 }
        );
      }
    }

    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
        },
      });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const userId = createdUser.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User was created, but user ID was not returned." },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name,
      email,
      role,
      residence_hall_id: role === "ra" ? residence_hall_id : null,
      active: true,
      must_change_password: true,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "User created successfully.",
      user_id: userId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    );
  }
}