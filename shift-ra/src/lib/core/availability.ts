import {
  deleteAvailabilityRows,
  getAvailabilityForRA,
  insertAvailabilityRows,
} from "@/lib/data/availabilityRepository";

function normalizeDayNumbers(dayNumbers: number[]) {
  return [...new Set(dayNumbers)]
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);
}

export async function setRAAvailability(raId: string, dayNumbers: number[]) {
  if (!raId) {
    throw new Error("RA ID is required.");
  }

  const normalized = normalizeDayNumbers(dayNumbers);

  if (normalized.length === 0) {
    throw new Error("At least one valid day is required.");
  }

  const rows = normalized.map((day_of_week) => ({
    ra_id: raId,
    day_of_week,
    is_available: true,
  }));

  return await insertAvailabilityRows(rows);
}

export async function removeRAAvailability(raId: string, dayNumbers: number[]) {
  if (!raId) {
    throw new Error("RA ID is required.");
  }

  const normalized = normalizeDayNumbers(dayNumbers);

  if (normalized.length === 0) {
    throw new Error("At least one valid day is required.");
  }

  await deleteAvailabilityRows(raId, normalized);
}

export async function getRAWeeklyAvailability(raId: string) {
  if (!raId) {
    throw new Error("RA ID is required.");
  }

  return await getAvailabilityForRA(raId);
}