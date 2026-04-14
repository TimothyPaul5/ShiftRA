import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export async function requireAdmin() {
  const result = await getCurrentProfile();

  if (result.error || !result.profile || result.profile.role !== "admin") {
    return { ok: false as const, error: "Admin access required." };
  }

  return { ok: true as const, profile: result.profile };
}