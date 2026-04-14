import { ResidenceHall, Profile } from "@/lib/types";

export function getAssignedCountForHall(hallId: number, profiles: Profile[]) {
  return profiles.filter(
    (profile) => profile.role === "ra" && profile.residence_hall_id === hallId
  ).length;
}

export function validateHallCapacityUpdate(
  hallId: number,
  newCapacity: number,
  profiles: Profile[]
) {
  const assignedCount = getAssignedCountForHall(hallId, profiles);

  if (newCapacity < assignedCount) {
    return {
      ok: false as const,
      error: `Cannot set capacity to ${newCapacity}. This hall currently has ${assignedCount} RA(s) assigned.`,
    };
  }

  return { ok: true as const };
}

export function validateRAAssignmentToHall(params: {
  hallId: number;
  profiles: Profile[];
  halls: ResidenceHall[];
  currentHallId?: number | null;
}) {
  const { hallId, profiles, halls, currentHallId = null } = params;
  const hall = halls.find((h) => h.id === hallId);

  if (!hall) {
    return { ok: false as const, error: "Selected hall not found." };
  }

  const assignedCount = getAssignedCountForHall(hallId, profiles);
  const effectiveAssigned =
    currentHallId === hallId ? assignedCount : assignedCount + 1;

  if (effectiveAssigned > hall.capacity) {
    return {
      ok: false as const,
      error: `Cannot assign RA to ${hall.name}. That hall is already at capacity (${hall.capacity}).`,
    };
  }

  return { ok: true as const, hall };
}

export function validateHallDeletion(hallId: number, profiles: Profile[]) {
  const assignedCount = getAssignedCountForHall(hallId, profiles);

  if (assignedCount > 0) {
    return {
      ok: false as const,
      error: `Cannot delete this hall. It still has ${assignedCount} RA(s) assigned.`,
    };
  }

  return { ok: true as const };
}