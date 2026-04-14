import { supabaseAdmin } from "@/lib/supabase-admin";
import { Profile } from "@/lib/types";

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as Profile[];
}

export async function getAllRAs(): Promise<Profile[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("role", "ra")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as Profile[];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Profile | null) || null;
}

export async function createProfile(profile: Omit<Profile, "created_at">) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert(profile)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function updateProfileHall(id: string, residence_hall_id: number | null) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ residence_hall_id })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function countRAsInHall(hallId: number): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ra")
    .eq("residence_hall_id", hallId);

  if (error) throw new Error(error.message);
  return count || 0;
}