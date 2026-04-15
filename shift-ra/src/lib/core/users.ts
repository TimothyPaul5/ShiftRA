import { supabaseAdmin } from "@/lib/supabase-admin";
import { createProfile, getAllProfiles, updateProfileHall } from "@/lib/data/profileRepository";
import { getAllHalls } from "@/lib/data/hallRepository";
import { validateRAAssignmentToHall } from "@/lib/core/halls";
import { UserRole } from "@/lib/types";

export async function createAppUser(input: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  residence_hall_id?: number | null;
  active?: boolean;
}) {
  const { email, password, full_name, role, residence_hall_id = null, active = true } = input;

  if (!email || !password || !full_name || !role) {
    throw new Error("Email, password, full name, and role are required.");
  }

  let validatedHallId: number | null = null;

  if (role === "ra" && residence_hall_id) {
    const [profiles, halls] = await Promise.all([getAllProfiles(), getAllHalls()]);
    const validation = validateRAAssignmentToHall({
      hallId: residence_hall_id,
      profiles,
      halls,
      currentHallId: null,
    });

    if (!validation.ok) {
      throw new Error(validation.error);
    }

    validatedHallId = residence_hall_id;
  }

  const { data: createdAuthUser, error: createAuthError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    });

  if (createAuthError || !createdAuthUser.user) {
    throw new Error(createAuthError?.message || "Could not create auth user.");
  }

  try {
  const profile = await createProfile({
    id: createdAuthUser.user.id,
    full_name,
    email,
    role,
    residence_hall_id,
    active: true,
    must_change_password: true,
  });

    return profile;
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(createdAuthUser.user.id);
    throw error;
  }
}

export async function assignRAToHall(profileId: string, newHallId: number | null) {
  const profiles = await getAllProfiles();
  const halls = await getAllHalls();

  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error("User not found.");
  if (profile.role !== "ra") throw new Error("Only RA users can be assigned to halls.");

  if (newHallId !== null) {
    const validation = validateRAAssignmentToHall({
      hallId: newHallId,
      profiles,
      halls,
      currentHallId: profile.residence_hall_id,
    });

    if (!validation.ok) {
      throw new Error(validation.error);
    }
  }

  return await updateProfileHall(profileId, newHallId);
}

export async function unassignRA(profileId: string) {
  return await assignRAToHall(profileId, null);
}