import { getAllHalls } from "@/lib/data/hallRepository";
import { getAllProfiles } from "@/lib/data/profileRepository";
import { getAllAvailability } from "@/lib/data/availabilityRepository";
import {
  createScheduleRecord,
  deleteAssignmentsForHallInRange,
  insertScheduleAssignments,
} from "@/lib/data/scheduleRepository";
import { getDatesInRange, getWeekdayNumber, isWeekendDay } from "@/lib/core/dates";
import { Profile, ResidenceHall, ScheduleShift } from "@/lib/types";

type AssignmentStats = Record<
  string,
  { total: number; primary: number; secondary: number }
>;

type AvailabilityRowLike = {
  ra_id: string;
  day_of_week: number;
  is_available: boolean;
};

export type ReadinessIssue = {
  ra_id: string;
  full_name: string;
  residence_hall_id: number | null;
  submitted_days: number;
};

export type HallCoverageSummary = {
  hall_id: number;
  hall_name: string;
  active_ra_count: number;
};

export type ScheduleReadinessReport = {
  minimumRequiredDays: number;
  hallScope: "one" | "all";
  missingAvailability: ReadinessIssue[];
  belowMinimumAvailability: ReadinessIssue[];
  hallCoverage: HallCoverageSummary[];
  hasWarnings: boolean;
};

function initializeStats(ras: Profile[]): AssignmentStats {
  const stats: AssignmentStats = {};
  for (const ra of ras) {
    stats[ra.id] = { total: 0, primary: 0, secondary: 0 };
  }
  return stats;
}

export function pickBestRAForRole(
  candidates: Profile[],
  role: "Primary" | "Secondary",
  stats: AssignmentStats
) {
  const sorted = [...candidates].sort((a, b) => {
    const aStats = stats[a.id] || { total: 0, primary: 0, secondary: 0 };
    const bStats = stats[b.id] || { total: 0, primary: 0, secondary: 0 };

    if (role === "Primary" && aStats.primary !== bStats.primary) {
      return aStats.primary - bStats.primary;
    }

    if (role === "Secondary" && aStats.secondary !== bStats.secondary) {
      return aStats.secondary - bStats.secondary;
    }

    if (aStats.total !== bStats.total) {
      return aStats.total - bStats.total;
    }

    return a.full_name.localeCompare(b.full_name);
  });

  return sorted[0] || null;
}

function recordAssignment(stats: AssignmentStats, raId: string, role: "Primary" | "Secondary") {
  if (!stats[raId]) {
    stats[raId] = { total: 0, primary: 0, secondary: 0 };
  }

  stats[raId].total += 1;
  if (role === "Primary") stats[raId].primary += 1;
  if (role === "Secondary") stats[raId].secondary += 1;
}

function availableRAsForDay(
  hallId: number,
  dayNumber: number,
  ras: Profile[],
  availability: AvailabilityRowLike[]
) {
  const hallRAs = ras.filter((ra) => ra.residence_hall_id === hallId && ra.active);
  return hallRAs.filter((ra) =>
    availability.some(
      (row) => row.ra_id === ra.id && row.day_of_week === dayNumber && row.is_available
    )
  );
}

function uniqueSubmittedDaysForRA(availability: AvailabilityRowLike[], raId: string) {
  return new Set(
    availability
      .filter((row) => row.ra_id === raId && row.is_available)
      .map((row) => row.day_of_week)
  );
}

function buildEffectiveAvailability(params: {
  availability: AvailabilityRowLike[];
  ras: Profile[];
  minimumRequiredDays: number;
  overrideIncomplete: boolean;
}) {
  const { availability, ras, minimumRequiredDays, overrideIncomplete } = params;

  const effective = [...availability];
  const seen = new Set(
    effective
      .filter((row) => row.is_available)
      .map((row) => `${row.ra_id}-${row.day_of_week}`)
  );

  const missingAvailability: ReadinessIssue[] = [];
  const belowMinimumAvailability: ReadinessIssue[] = [];

  for (const ra of ras) {
    if (!ra.active || ra.role !== "ra") continue;

    const submittedDays = uniqueSubmittedDaysForRA(availability, ra.id);
    const count = submittedDays.size;

    if (count === 0) {
      missingAvailability.push({
        ra_id: ra.id,
        full_name: ra.full_name,
        residence_hall_id: ra.residence_hall_id,
        submitted_days: 0,
      });
    } else if (count < minimumRequiredDays) {
      belowMinimumAvailability.push({
        ra_id: ra.id,
        full_name: ra.full_name,
        residence_hall_id: ra.residence_hall_id,
        submitted_days: count,
      });
    }

    if (overrideIncomplete && count < minimumRequiredDays) {
      for (let day = 1; day <= 7; day++) {
        const key = `${ra.id}-${day}`;
        if (!seen.has(key)) {
          effective.push({
            ra_id: ra.id,
            day_of_week: day,
            is_available: true,
          });
          seen.add(key);
        }
      }
    }
  }

  return {
    effectiveAvailability: effective,
    missingAvailability,
    belowMinimumAvailability,
  };
}

export async function assessScheduleReadiness(params: {
  hallId?: number | null;
  minimumRequiredDays?: number;
}) {
  const { hallId = null, minimumRequiredDays = 2 } = params;

  const [halls, profiles, availability] = await Promise.all([
    getAllHalls(),
    getAllProfiles(),
    getAllAvailability(),
  ]);

  const scopedHalls = hallId
    ? halls.filter((hall) => hall.id === hallId)
    : halls;

  if (scopedHalls.length === 0) {
    throw new Error("No matching residence halls found.");
  }

  const scopedHallIds = new Set(scopedHalls.map((hall) => hall.id));

  const scopedRAs = profiles.filter(
    (profile) =>
      profile.role === "ra" &&
      profile.active &&
      profile.residence_hall_id !== null &&
      scopedHallIds.has(profile.residence_hall_id)
  );

  const { missingAvailability, belowMinimumAvailability } = buildEffectiveAvailability({
    availability,
    ras: scopedRAs,
    minimumRequiredDays,
    overrideIncomplete: false,
  });

  const hallCoverage: HallCoverageSummary[] = scopedHalls.map((hall) => ({
    hall_id: hall.id,
    hall_name: hall.name,
    active_ra_count: scopedRAs.filter((ra) => ra.residence_hall_id === hall.id).length,
  }));

  return {
    minimumRequiredDays,
    hallScope: hallId ? "one" : "all",
    missingAvailability,
    belowMinimumAvailability,
    hallCoverage,
    hasWarnings:
      missingAvailability.length > 0 || belowMinimumAvailability.length > 0,
  } satisfies ScheduleReadinessReport;
}

export async function generateScheduleForHall(params: {
  hallId: number;
  startDate: string;
  endDate: string;
  createdBy: string | null;
  overrideIncomplete?: boolean;
  minimumRequiredDays?: number;
}) {
  const {
    hallId,
    startDate,
    endDate,
    createdBy,
    overrideIncomplete = false,
    minimumRequiredDays = 2,
  } = params;

  const [halls, profiles, availability] = await Promise.all([
    getAllHalls(),
    getAllProfiles(),
    getAllAvailability(),
  ]);

  const hall = halls.find((h) => h.id === hallId);
  if (!hall) throw new Error("Residence hall not found.");

  const ras = profiles.filter((p) => p.role === "ra");
  const hallRAs = ras.filter((ra) => ra.residence_hall_id === hall.id && ra.active);

  if (hallRAs.length === 0) {
    throw new Error(`No active RAs assigned to ${hall.name}.`);
  }

  const { effectiveAvailability } = buildEffectiveAvailability({
    availability,
    ras: hallRAs,
    minimumRequiredDays,
    overrideIncomplete,
  });

  await deleteAssignmentsForHallInRange(hall.id, startDate, endDate);

  const stats = initializeStats(hallRAs);
  const dates = getDatesInRange(startDate, endDate);

  const scheduleRecord = await createScheduleRecord({
    residence_hall_id: hall.id,
    start_date: startDate,
    end_date: endDate,
    created_by: createdBy,
  });

  const rows: Omit<ScheduleShift, "id" | "created_at">[] = [];

  for (const date of dates) {
    const dayNumber = getWeekdayNumber(date);
    const needed = isWeekendDay(dayNumber)
      ? hall.weekend_staff_needed
      : hall.weekday_staff_needed;

    const availableRAs = availableRAsForDay(hall.id, dayNumber, hallRAs, effectiveAvailability);
    const remaining = [...availableRAs];

    for (let slot = 0; slot < needed; slot++) {
      const role = slot === 0 ? "Primary" : "Secondary";
      const chosen = pickBestRAForRole(remaining, role, stats);

      rows.push({
        schedule_id: scheduleRecord.id,
        residence_hall_id: hall.id,
        assignment_date: date,
        day_of_week: dayNumber,
        role,
        assigned_ra_id: chosen ? chosen.id : null,
      });

      if (chosen) {
        recordAssignment(stats, chosen.id, role);
        const idx = remaining.findIndex((r) => r.id === chosen.id);
        if (idx !== -1) remaining.splice(idx, 1);
      }
    }
  }

  const inserted = await insertScheduleAssignments(rows);

  return {
    hall,
    scheduleRecord,
    assignments: inserted,
  };
}

export async function generateScheduleForAllHalls(params: {
  startDate: string;
  endDate: string;
  createdBy: string | null;
  overrideIncomplete?: boolean;
  minimumRequiredDays?: number;
}) {
  const {
    startDate,
    endDate,
    createdBy,
    overrideIncomplete = false,
    minimumRequiredDays = 2,
  } = params;

  const halls = await getAllHalls();
  const results = [];

  for (const hall of halls) {
    const generated = await generateScheduleForHall({
      hallId: hall.id,
      startDate,
      endDate,
      createdBy,
      overrideIncomplete,
      minimumRequiredDays,
    });
    results.push(generated);
  }

  return results;
}