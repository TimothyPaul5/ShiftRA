import { supabase } from "@/lib/supabase";
import { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<{
  userId: string | null;
  profile: Profile | null;
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: null, profile: null, error: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { userId: user.id, profile: null, error: "Profile not found." };
  }

  return { userId: user.id, profile: profile as Profile, error: null };
}