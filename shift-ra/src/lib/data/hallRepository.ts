import { supabaseAdmin } from "@/lib/supabase-admin";
import { ResidenceHall } from "@/lib/types";

export async function getAllHalls(): Promise<ResidenceHall[]> {
  const { data, error } = await supabaseAdmin
    .from("residence_halls")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ResidenceHall[];
}

export async function getHallById(id: number): Promise<ResidenceHall | null> {
  const { data, error } = await supabaseAdmin
    .from("residence_halls")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ResidenceHall | null) || null;
}

export async function getHallByName(name: string): Promise<ResidenceHall | null> {
  const { data, error } = await supabaseAdmin
    .from("residence_halls")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ResidenceHall | null) || null;
}

export async function createHall(input: {
  name: string;
  capacity: number;
  weekday_staff_needed: number;
  weekend_staff_needed: number;
}) {
  const { data, error } = await supabaseAdmin
    .from("residence_halls")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ResidenceHall;
}

export async function updateHall(
  id: number,
  updates: Partial<Pick<ResidenceHall, "name" | "capacity" | "weekday_staff_needed" | "weekend_staff_needed">>
) {
  const { data, error } = await supabaseAdmin
    .from("residence_halls")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ResidenceHall;
}

export async function deleteHall(id: number) {
  const { error } = await supabaseAdmin
    .from("residence_halls")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}