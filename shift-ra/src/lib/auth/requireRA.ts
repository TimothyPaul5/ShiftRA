import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export async function requireRA() {
  const result = await getCurrentProfile();

  if (result.error || !result.profile || result.profile.role !== "ra") {
    return { ok: false as const, error: "RA access required." };
  }

  return { ok: true as const, profile: result.profile };
}