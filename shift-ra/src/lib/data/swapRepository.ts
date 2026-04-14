import { supabaseAdmin } from "@/lib/supabase-admin";
import { SwapRequest, SwapStatus } from "@/lib/types";

export async function createSwapRequest(input: {
  requester_ra_id: string;
  target_ra_id: string;
  requester_assignment_id: number;
  target_assignment_id: number;
  residence_hall_id: number;
  status?: SwapStatus;
}) {
  const { data, error } = await supabaseAdmin
    .from("swap_requests")
    .insert({
      ...input,
      status: input.status || "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SwapRequest;
}

export async function getSwapRequestById(id: number) {
  const { data, error } = await supabaseAdmin
    .from("swap_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as SwapRequest;
}

export async function getPendingSwapRequestsForRA(raId: string) {
  const { data, error } = await supabaseAdmin
    .from("swap_requests")
    .select("*")
    .eq("target_ra_id", raId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as SwapRequest[];
}

export async function getAllSwapRequestsForRA(raId: string) {
  const { data, error } = await supabaseAdmin
    .from("swap_requests")
    .select("*")
    .or(`requester_ra_id.eq.${raId},target_ra_id.eq.${raId}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as SwapRequest[];
}

export async function updateSwapRequestStatus(id: number, status: SwapStatus) {
  const { data, error } = await supabaseAdmin
    .from("swap_requests")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SwapRequest;
}