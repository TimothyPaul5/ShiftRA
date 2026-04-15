import { supabaseAdmin } from "@/lib/supabase-admin";
import { ScheduleRecord, ScheduleShift } from "@/lib/types";

export async function createScheduleRecord(input: {
  label: string;
  residence_hall_id: number;
  start_date: string;
  end_date: string;
  created_by: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("schedules")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduleRecord;
}

export async function getSchedulesByLabel(label: string) {
  const { data, error } = await supabaseAdmin
    .from("schedules")
    .select("*")
    .eq("label", label)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as ScheduleRecord[];
}

export async function getDistinctScheduleLabels() {
  const { data, error } = await supabaseAdmin
    .from("schedules")
    .select("label")
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);

  return [...new Set((data || []).map((row) => row.label))];
}

export async function deleteSchedulesByLabel(label: string) {
  const schedules = await getSchedulesByLabel(label);
  const ids = schedules.map((s) => s.id);

  if (ids.length > 0) {
    const { error: assignmentError } = await supabaseAdmin
      .from("schedule_assignments")
      .delete()
      .in("schedule_id", ids);

    if (assignmentError) throw new Error(assignmentError.message);
  }

  const { error } = await supabaseAdmin
    .from("schedules")
    .delete()
    .eq("label", label);

  if (error) throw new Error(error.message);
}

export async function insertScheduleAssignments(rows: Omit<ScheduleShift, "id" | "created_at">[]) {
  if (rows.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("schedule_assignments")
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return (data || []) as ScheduleShift[];
}

export async function getAssignmentsForHall(hallId: number) {
  const { data, error } = await supabaseAdmin
    .from("schedule_assignments")
    .select("*")
    .eq("residence_hall_id", hallId)
    .order("assignment_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ScheduleShift[];
}

export async function getAssignmentsForDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabaseAdmin
    .from("schedule_assignments")
    .select("*")
    .gte("assignment_date", startDate)
    .lte("assignment_date", endDate)
    .order("assignment_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ScheduleShift[];
}

export async function getAssignmentsForDate(date: string, hallId?: number | null) {
  let query = supabaseAdmin
    .from("schedule_assignments")
    .select("*")
    .eq("assignment_date", date)
    .order("role", { ascending: true });

  if (hallId) {
    query = query.eq("residence_hall_id", hallId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data || []) as ScheduleShift[];
}

export async function getAssignmentById(id: number) {
  const { data, error } = await supabaseAdmin
    .from("schedule_assignments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduleShift;
}

export async function updateAssignment(
  id: number,
  updates: Partial<Pick<ScheduleShift, "assigned_ra_id" | "role">>
) {
  const { data, error } = await supabaseAdmin
    .from("schedule_assignments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduleShift;
}

export async function createManualAssignment(input: Omit<ScheduleShift, "id" | "created_at">) {
  const { data, error } = await supabaseAdmin
    .from("schedule_assignments")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduleShift;
}

export async function deleteAssignment(id: number) {
  const { error } = await supabaseAdmin
    .from("schedule_assignments")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteAssignmentsForHallInRange(
  hallId: number,
  startDate: string,
  endDate: string
) {
  const { error } = await supabaseAdmin
    .from("schedule_assignments")
    .delete()
    .eq("residence_hall_id", hallId)
    .gte("assignment_date", startDate)
    .lte("assignment_date", endDate);

  if (error) throw new Error(error.message);
}