import { supabaseAdmin } from "@/lib/supabase-admin";
import { AvailabilityRow } from "@/lib/types";

export async function getAvailabilityForRA(raId: string): Promise<AvailabilityRow[]> {
  const { data, error } = await supabaseAdmin
    .from("availability")
    .select("*")
    .eq("ra_id", raId)
    .order("day_of_week", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as AvailabilityRow[];
}

export async function getAllAvailability(): Promise<AvailabilityRow[]> {
  const { data, error } = await supabaseAdmin
    .from("availability")
    .select("*");

  if (error) throw new Error(error.message);
  return (data || []) as AvailabilityRow[];
}

export async function insertAvailabilityRows(rows: Omit<AvailabilityRow, "id" | "created_at">[]) {
  if (rows.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("availability")
    .upsert(rows, { onConflict: "ra_id,day_of_week" })
    .select();

  if (error) throw new Error(error.message);
  return (data || []) as AvailabilityRow[];
}

export async function deleteAvailabilityRows(raId: string, dayNumbers: number[]) {
  if (dayNumbers.length === 0) return;

  const { error } = await supabaseAdmin
    .from("availability")
    .delete()
    .eq("ra_id", raId)
    .in("day_of_week", dayNumbers);

  if (error) throw new Error(error.message);
}