import { deleteAssignment, getAssignmentById, updateAssignment } from "@/lib/data/scheduleRepository";

export async function reassignShift(assignmentId: number, assigned_ra_id: string | null) {
  return await updateAssignment(assignmentId, { assigned_ra_id });
}

export async function clearShiftAssignment(assignmentId: number) {
  return await updateAssignment(assignmentId, { assigned_ra_id: null });
}

export async function changeShiftRole(assignmentId: number, role: "Primary" | "Secondary") {
  return await updateAssignment(assignmentId, { role });
}

export async function removeManualShift(assignmentId: number) {
  const existing = await getAssignmentById(assignmentId);
  if (!existing) throw new Error("Shift not found.");
  await deleteAssignment(assignmentId);
}