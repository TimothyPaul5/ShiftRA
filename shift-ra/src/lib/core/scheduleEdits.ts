import {
  createManualAssignment,
  deleteAssignment,
  getAssignmentById,
  updateAssignment,
} from "@/lib/data/scheduleRepository";
import { getAllHalls } from "@/lib/data/hallRepository";
import { getAllProfiles } from "@/lib/data/profileRepository";
import { validateRAAssignmentToHall } from "@/lib/core/halls";

export async function reassignShift(assignmentId: number, assigned_ra_id: string | null) {
  const existing = await getAssignmentById(assignmentId);
  if (!existing) throw new Error("Shift not found.");

  if (assigned_ra_id) {
    const [profiles, halls] = await Promise.all([getAllProfiles(), getAllHalls()]);
    const validation = validateRAAssignmentToHall({
      hallId: existing.residence_hall_id,
      profiles,
      halls,
      currentHallId: existing.residence_hall_id,
    });

    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const assignee = profiles.find((p) => p.id === assigned_ra_id);
    if (!assignee || assignee.role !== "ra") {
      throw new Error("Selected assignee is not a valid RA.");
    }

    if (assignee.residence_hall_id !== existing.residence_hall_id) {
      throw new Error("RA must belong to the same residence hall.");
    }
  }

  return await updateAssignment(assignmentId, { assigned_ra_id });
}

export async function clearShiftAssignment(assignmentId: number) {
  return await updateAssignment(assignmentId, { assigned_ra_id: null });
}

export async function changeShiftRole(assignmentId: number, role: "Primary" | "Secondary") {
  return await updateAssignment(assignmentId, { role });
}

export async function addManualShift(input: {
  schedule_id?: number;
  residence_hall_id: number;
  assignment_date: string;
  day_of_week: number;
  role: "Primary" | "Secondary";
  assigned_ra_id: string | null;
}) {
  if (input.assigned_ra_id) {
    const profiles = await getAllProfiles();
    const assignee = profiles.find((p) => p.id === input.assigned_ra_id);

    if (!assignee || assignee.role !== "ra") {
      throw new Error("Selected assignee is not a valid RA.");
    }

    if (assignee.residence_hall_id !== input.residence_hall_id) {
      throw new Error("RA must belong to the same residence hall.");
    }
  }

  return await createManualAssignment(input);
}

export async function removeManualShift(assignmentId: number) {
  const existing = await getAssignmentById(assignmentId);
  if (!existing) throw new Error("Shift not found.");
  await deleteAssignment(assignmentId);
}