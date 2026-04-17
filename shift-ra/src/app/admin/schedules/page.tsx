"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getNextMonth, getPreviousMonth } from "@/lib/core/calendar";
import { getWeekdayNumber } from "@/lib/core/dates";
import ScheduleMonthCalendar from "@/components/ScheduleMonthCalendar";
import { supabase } from "@/lib/supabase";
import { ResidenceHall } from "@/lib/types";

type ReadinessIssue = {
  ra_id: string;
  full_name: string;
  hall_name: string;
  residence_hall_id: number | null;
  submitted_days: number;
  required_days: number;
};

type HallCoverageSummary = {
  hall_id: number;
  hall_name: string;
  active_ra_count: number;
  minimum_required_availability_days: number;
};

type ScheduleReadinessReport = {
  hallScope: "one" | "all";
  missingAvailability: ReadinessIssue[];
  belowMinimumAvailability: ReadinessIssue[];
  hallCoverage: HallCoverageSummary[];
  hasWarnings: boolean;
};

type AssignmentRow = {
  id: number;
  schedule_id?: number;
  residence_hall_id: number;
  assignment_date: string;
  day_of_week: number;
  role: "Primary" | "Secondary";
  assigned_ra_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  residence_hall_id: number | null;
};

type ScheduleRow = {
  id: number;
  label: string;
  residence_hall_id: number;
  start_date: string;
  end_date: string;
};

type AvailabilityRow = {
  id: number;
  ra_id: string;
  day_of_week?: number | null;
  day?: string | null;
  weekday?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type ErrorModalState = {
  title: string;
  description: string;
};

const HALL_COLORS = [
  "border-sky-300 bg-sky-50",
  "border-emerald-300 bg-emerald-50",
  "border-amber-300 bg-amber-50",
  "border-violet-300 bg-violet-50",
  "border-rose-300 bg-rose-50",
  "border-cyan-300 bg-cyan-50",
  "border-lime-300 bg-lime-50",
  "border-fuchsia-300 bg-fuchsia-50",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatAvailabilityRow(row: AvailabilityRow) {
  let dayLabel = "Day";

  if (typeof row.day === "string" && row.day.trim()) {
    dayLabel = row.day;
  } else if (typeof row.weekday === "string" && row.weekday.trim()) {
    dayLabel = row.weekday;
  } else if (typeof row.day_of_week === "number") {
    dayLabel = WEEKDAY_LABELS[row.day_of_week] || `Day ${row.day_of_week}`;
  }

  if (row.start_time && row.end_time) {
    return `${dayLabel} ${row.start_time}-${row.end_time}`;
  }

  return dayLabel;
}

export default function AdminSchedulesPage() {
  const router = useRouter();

  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [halls, setHalls] = useState<ResidenceHall[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>([]);

  const [mode, setMode] = useState<"all" | "one">("all");
  const [hallId, setHallId] = useState("");
  const [label, setLabel] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [readinessReport, setReadinessReport] = useState<ScheduleReadinessReport | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);

  const [newShiftRole, setNewShiftRole] = useState<"Primary" | "Secondary">("Secondary");
  const [newShiftHallId, setNewShiftHallId] = useState("");
  const [newShiftRAId, setNewShiftRAId] = useState("");

  const [showControlsModal, setShowControlsModal] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [availabilityHallFilter, setAvailabilityHallFilter] = useState("all");
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const result = await getCurrentProfile();

      if (result.error || !result.profile || result.profile.role !== "admin") {
        router.push("/login");
        return;
      }

      await loadBaseData();
      await loadCalendarData(calendarYear, calendarMonth, selectedLabel);
    }

    checkAdminAndLoad();
  }, [router]);

  async function loadBaseData() {
    const [
      { data: hallData, error: hallError },
      { data: profileData, error: profileError },
      { data: scheduleData, error: scheduleError },
      { data: availabilityData, error: availabilityError },
    ] = await Promise.all([
      supabase.from("residence_halls").select("*").order("name", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, residence_hall_id")
        .eq("role", "ra")
        .order("full_name", { ascending: true }),
      supabase.from("schedules").select("*").order("created_at", { ascending: false }),
      supabase.from("availability").select("*"),
    ]);

    if (hallError) {
      setMessage(hallError.message);
      setLoading(false);
      return;
    }

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (scheduleError) {
      setMessage(scheduleError.message);
      setLoading(false);
      return;
    }

    if (availabilityError) {
      setMessage(availabilityError.message);
      setLoading(false);
      return;
    }

    setHalls((hallData || []) as ResidenceHall[]);
    setProfiles((profileData || []) as ProfileRow[]);
    setSchedules((scheduleData || []) as ScheduleRow[]);
    setAvailabilityRows((availabilityData || []) as AvailabilityRow[]);
    setLoading(false);
  }

  async function loadCalendarData(year: number, month: number, labelFilter: string) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDateObj = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("schedule_assignments")
      .select("*")
      .gte("assignment_date", start)
      .lte("assignment_date", end)
      .order("assignment_date", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    let rows = (data || []) as AssignmentRow[];

    if (labelFilter) {
      const matchingScheduleIds = schedules
        .filter((schedule) => schedule.label === labelFilter)
        .map((schedule) => schedule.id);

      rows = rows.filter(
        (row) => row.schedule_id && matchingScheduleIds.includes(row.schedule_id)
      );
    }

    setAssignments(rows);
  }

  useEffect(() => {
    if (!loading) {
      loadCalendarData(calendarYear, calendarMonth, selectedLabel);
    }
  }, [calendarYear, calendarMonth, selectedLabel, schedules, loading]);

  function getHallName(hallIdValue: number) {
    return halls.find((hall) => hall.id === hallIdValue)?.name || "Unknown Hall";
  }

  function getRAName(raId: string | null) {
    if (!raId) return "Unassigned";
    return profiles.find((profile) => profile.id === raId)?.full_name || "Unassigned";
  }

  function getHallColorClass(hallIdValue: number) {
    return HALL_COLORS[hallIdValue % HALL_COLORS.length];
  }

  const scheduleLabels = useMemo(
    () => [...new Set(schedules.map((schedule) => schedule.label))],
    [schedules]
  );

  const filteredAssignments = useMemo(() => {
    return mode === "one" && hallId
      ? assignments.filter((row) => row.residence_hall_id === Number(hallId))
      : assignments;
  }, [assignments, mode, hallId]);

  const calendarShifts = useMemo(() => {
    return filteredAssignments.map((row) => ({
      id: row.id,
      assignment_date: row.assignment_date,
      role: row.role,
      assigned_ra_name: getRAName(row.assigned_ra_id),
      hall_name: getHallName(row.residence_hall_id),
      colorClassName: getHallColorClass(row.residence_hall_id),
    }));
  }, [filteredAssignments, profiles, halls]);

  const fairnessSummary = useMemo(() => {
    const map = new Map<string, { name: string; total: number; primary: number; secondary: number }>();

    for (const row of filteredAssignments) {
      if (!row.assigned_ra_id) continue;

      const current = map.get(row.assigned_ra_id) || {
        name: getRAName(row.assigned_ra_id),
        total: 0,
        primary: 0,
        secondary: 0,
      };

      current.total += 1;
      if (row.role === "Primary") current.primary += 1;
      if (row.role === "Secondary") current.secondary += 1;

      map.set(row.assigned_ra_id, current);
    }

    return [...map.values()].sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });
  }, [filteredAssignments, profiles]);

  const selectedDayAssignments = useMemo(() => {
    if (!selectedDate) return [];
    return filteredAssignments
      .filter((row) => row.assignment_date === selectedDate)
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [filteredAssignments, selectedDate]);

  const selectedAssignment =
    selectedAssignmentId
      ? selectedDayAssignments.find((row) => row.id === selectedAssignmentId) || null
      : null;

  const eligibleRAsForSelectedHall = profiles.filter((profile) => {
    const targetHallId =
      mode === "one" && hallId
        ? Number(hallId)
        : newShiftHallId
          ? Number(newShiftHallId)
          : null;

    if (!targetHallId) return true;
    return profile.residence_hall_id === targetHallId;
  });

  const availabilityByRA = useMemo(() => {
    const map = new Map<string, AvailabilityRow[]>();

    for (const row of availabilityRows) {
      const existing = map.get(row.ra_id) || [];
      existing.push(row);
      map.set(row.ra_id, existing);
    }

    return map;
  }, [availabilityRows]);

  const availabilityRowsForModal = useMemo(() => {
    return profiles
      .filter((profile) => {
        if (availabilityHallFilter === "all") return true;
        return String(profile.residence_hall_id ?? "") === availabilityHallFilter;
      })
      .map((profile) => {
        const rows = availabilityByRA.get(profile.id) || [];
        return {
          id: profile.id,
          full_name: profile.full_name,
          hall_name: profile.residence_hall_id ? getHallName(profile.residence_hall_id) : "Unassigned",
          count: rows.length,
          summary: rows.length === 0 ? "No availability submitted." : rows.map(formatAvailabilityRow).join(", "),
        };
      });
  }, [profiles, availabilityHallFilter, availabilityByRA, halls]);

  async function checkReadiness() {
    setChecking(true);
    setReadinessReport(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/admin/generate-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode,
          hallId: mode === "one" ? Number(hallId) : null,
          action: "check",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to check readiness.");
      }

      setReadinessReport(result.report as ScheduleReadinessReport);
      setShowReadinessModal(true);
    } catch (error) {
      setErrorModal({
        title: "Readiness Check Failed",
        description:
          error instanceof Error ? error.message : "Failed to check readiness.",
      });
    }

    setChecking(false);
  }

  async function generateSchedule(overrideIncomplete: boolean) {
    setGenerating(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/admin/generate-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          label,
          startDate,
          endDate,
          hallId: mode === "one" ? Number(hallId) : null,
          mode,
          action: "generate",
          overrideIncomplete,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate schedule.");
      }

      setSelectedLabel(label);
      setMessage(
        overrideIncomplete
          ? `Schedule ${label} generated with incomplete availability override.`
          : `Schedule ${label} generated as-is.`
      );

      await loadBaseData();
      await loadCalendarData(calendarYear, calendarMonth, label);
      setShowControlsModal(false);
    } catch (error) {
      setErrorModal({
        title: "Schedule Generation Failed",
        description:
          error instanceof Error ? error.message : "Failed to generate schedule.",
      });
    }

    setGenerating(false);
  }

  async function clearSelectedSchedule() {
    if (!selectedLabel) {
      setErrorModal({
        title: "No Schedule Selected",
        description: "Select a schedule label first.",
      });
      return;
    }

    setClearing(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/admin/generate-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "clear",
          label: selectedLabel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to clear schedule.");
      }

      setMessage(`Schedule ${selectedLabel} cleared.`);
      setSelectedDate(null);
      setSelectedAssignmentId(null);
      await loadBaseData();
      await loadCalendarData(calendarYear, calendarMonth, selectedLabel);
      setShowControlsModal(false);
    } catch (error) {
      setErrorModal({
        title: "Clear Schedule Failed",
        description:
          error instanceof Error ? error.message : "Failed to clear schedule.",
      });
    }

    setClearing(false);
  }

  async function runEditRequest(
    method: "PATCH" | "POST" | "DELETE",
    payload?: Record<string, unknown>,
    query?: string
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("You are not logged in.");

    const response = await fetch(`/api/admin/edit-schedule${query || ""}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: method === "DELETE" ? undefined : JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to update schedule.");
    }
  }

  async function handleReassign(assignmentId: number, assignedRaId: string) {
    setSavingEdit(true);
    setMessage("");

    try {
      await runEditRequest("PATCH", {
        action: "reassign",
        assignmentId,
        assigned_ra_id: assignedRaId || null,
      });

      await loadCalendarData(calendarYear, calendarMonth, selectedLabel);
      setMessage("Shift reassigned.");
    } catch (error) {
      setErrorModal({
        title: "Reassign Failed",
        description:
          error instanceof Error ? error.message : "Failed to reassign shift.",
      });
    }

    setSavingEdit(false);
  }

  async function handleClear(assignmentId: number) {
    setSavingEdit(true);
    setMessage("");

    try {
      await runEditRequest("PATCH", {
        action: "clear",
        assignmentId,
      });

      await loadCalendarData(calendarYear, calendarMonth, selectedLabel);
      setMessage("Shift cleared.");
    } catch (error) {
      setErrorModal({
        title: "Clear Assignment Failed",
        description:
          error instanceof Error ? error.message : "Failed to clear shift.",
      });
    }

    setSavingEdit(false);
  }

  async function handleRoleChange(assignmentId: number, role: "Primary" | "Secondary") {
    setSavingEdit(true);
    setMessage("");

    try {
      await runEditRequest("PATCH", {
        action: "changeRole",
        assignmentId,
        role,
      });

      await loadCalendarData(calendarYear, calendarMonth, selectedLabel);
      setMessage("Shift role updated.");
    } catch (error) {
      setErrorModal({
        title: "Role Update Failed",
        description:
          error instanceof Error ? error.message : "Failed to update role.",
      });
    }

    setSavingEdit(false);
  }

  async function handleDeleteShift(assignmentId: number) {
    setSavingEdit(true);
    setMessage("");

    try {
      await runEditRequest("DELETE", undefined, `?assignmentId=${assignmentId}`);

      await loadCalendarData(calendarYear, calendarMonth, selectedLabel);
      setSelectedAssignmentId(null);
      setMessage("Shift deleted.");
    } catch (error) {
      setErrorModal({
        title: "Delete Shift Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete shift.",
      });
    }

    setSavingEdit(false);
  }

  async function handleAddManualShift() {
    if (!selectedDate) return;

    setSavingEdit(true);
    setMessage("");

    try {
      const hallValue = mode === "one" && hallId ? Number(hallId) : Number(newShiftHallId);

      if (!hallValue) {
        throw new Error("Select a residence hall first.");
      }

      const matchingSchedule = schedules.find(
        (schedule) =>
          schedule.label === selectedLabel && schedule.residence_hall_id === hallValue
      );

      await runEditRequest("POST", {
        schedule_id: matchingSchedule?.id ?? undefined,
        residence_hall_id: hallValue,
        assignment_date: selectedDate,
        day_of_week: getWeekdayNumber(selectedDate),
        role: newShiftRole,
        assigned_ra_id: newShiftRAId || null,
      });

      await loadCalendarData(calendarYear, calendarMonth, selectedLabel);
      setMessage("Shift added.");
    } catch (error) {
      setErrorModal({
        title: "Add Shift Failed",
        description:
          error instanceof Error ? error.message : "Failed to add manual shift.",
      });
    }

    setSavingEdit(false);
  }

  function goToPreviousMonth() {
    const prev = getPreviousMonth(calendarYear, calendarMonth);
    setCalendarYear(prev.year);
    setCalendarMonth(prev.month);
  }

  function goToNextMonth() {
    const next = getNextMonth(calendarYear, calendarMonth);
    setCalendarYear(next.year);
    setCalendarMonth(next.month);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                Schedule Operations
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Schedules</h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                Generate labeled schedules, review fairness, check availability, and edit shifts directly on the calendar.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin")}
              className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 transition hover:brightness-95"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
            {message}
          </div>
        ) : null}

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setShowControlsModal(true)}
            className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
          >
            Schedule Controls
          </button>

          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm"
          >
            Availability
          </button>

          <button
            onClick={() => setShowFairnessModal(true)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm"
          >
            Fairness Summary
          </button>

          <button
            onClick={() => {
              if (readinessReport) {
                setShowReadinessModal(true);
              } else {
                checkReadiness();
              }
            }}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm"
          >
            Readiness Report
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <button
              onClick={goToPreviousMonth}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
            >
              Previous Month
            </button>

            <div className="text-sm text-slate-600">
              {selectedLabel ? `Label: ${selectedLabel}` : "Label: All"}{" "}
              {mode === "one" && hallId
                ? `| Hall: ${halls.find((hall) => hall.id === Number(hallId))?.name || "Selected Hall"}`
                : "| Hall: All"}
            </div>

            <button
              onClick={goToNextMonth}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
            >
              Next Month
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {halls.map((hall) => (
              <div
                key={hall.id}
                className={`rounded-xl border px-3 py-2 text-sm font-medium text-slate-900 ${getHallColorClass(hall.id)}`}
              >
                {hall.name}
              </div>
            ))}
          </div>

          <ScheduleMonthCalendar
            year={calendarYear}
            month={calendarMonth}
            shifts={calendarShifts}
            onDayClick={(date) => {
              setSelectedDate(date);
              setSelectedAssignmentId(null);
              if (mode !== "one") setNewShiftHallId("");
              setNewShiftRAId("");
            }}
            onShiftClick={(shiftId) => {
              if (!shiftId) return;
              const shift = filteredAssignments.find((row) => row.id === shiftId);
              if (!shift) return;
              setSelectedDate(shift.assignment_date);
              setSelectedAssignmentId(shiftId);
            }}
            selectedShiftId={selectedAssignmentId}
          />
        </section>

        {selectedDate ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Edit Day: {selectedDate}</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Quick Add Shift</h3>

              <div className="grid gap-3 md:grid-cols-4">
                {mode !== "one" ? (
                  <select
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                    value={newShiftHallId}
                    onChange={(e) => setNewShiftHallId(e.target.value)}
                  >
                    <option value="">Select Hall</option>
                    {halls.map((hall) => (
                      <option key={hall.id} value={hall.id}>
                        {hall.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                    {halls.find((hall) => hall.id === Number(hallId))?.name || "Selected Hall"}
                  </div>
                )}

                <select
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                  value={newShiftRole}
                  onChange={(e) => setNewShiftRole(e.target.value as "Primary" | "Secondary")}
                >
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                </select>

                <select
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                  value={newShiftRAId}
                  onChange={(e) => setNewShiftRAId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {eligibleRAsForSelectedHall.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAddManualShift}
                  disabled={savingEdit || !selectedLabel}
                  className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                >
                  Add Shift
                </button>
              </div>
            </div>

            {selectedDayAssignments.length === 0 ? (
              <p className="text-slate-600">No shifts currently on this date.</p>
            ) : (
              <div className="space-y-4">
                {selectedDayAssignments.map((assignment) => {
                  const eligibleRAs = profiles.filter(
                    (profile) => profile.residence_hall_id === assignment.residence_hall_id
                  );
                  const isSelected = selectedAssignment?.id === assignment.id;

                  return (
                    <div
                      key={assignment.id}
                      className={`rounded-2xl border p-5 ${
                        isSelected ? "ring-2 ring-black" : ""
                      } ${getHallColorClass(assignment.residence_hall_id)}`}
                    >
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-lg font-bold text-slate-900">
                            {assignment.role} — {getHallName(assignment.residence_hall_id)}
                          </div>
                          <div className="text-sm text-slate-700">
                            {getRAName(assignment.assigned_ra_id)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteShift(assignment.id)}
                          disabled={savingEdit}
                          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <select
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                          value={assignment.assigned_ra_id ?? ""}
                          onChange={(e) => handleReassign(assignment.id, e.target.value)}
                          disabled={savingEdit}
                        >
                          <option value="">Unassigned</option>
                          {eligibleRAs.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.full_name}
                            </option>
                          ))}
                        </select>

                        <select
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                          value={assignment.role}
                          onChange={(e) =>
                            handleRoleChange(assignment.id, e.target.value as "Primary" | "Secondary")
                          }
                          disabled={savingEdit}
                        >
                          <option value="Primary">Primary</option>
                          <option value="Secondary">Secondary</option>
                        </select>

                        <button
                          onClick={() => handleClear(assignment.id)}
                          disabled={savingEdit}
                          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                        >
                          Clear Assignment
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </section>

      {showControlsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                  Schedule Controls
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Generate and Manage Schedules</h2>
              </div>

              <button
                onClick={() => setShowControlsModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Schedule Label</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="SP26"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">View Existing Label</label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                >
                  <option value="">All Labels</option>
                  {scheduleLabels.map((scheduleLabel) => (
                    <option key={scheduleLabel} value={scheduleLabel}>
                      {scheduleLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Generation Mode</label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-slate-700">
                    <input type="radio" checked={mode === "all"} onChange={() => setMode("all")} />
                    <span>All Residence Halls</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700">
                    <input type="radio" checked={mode === "one"} onChange={() => setMode("one")} />
                    <span>One Residence Hall</span>
                  </label>
                </div>
              </div>

              {mode === "one" ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Residence Hall</label>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                    value={hallId}
                    onChange={(e) => setHallId(e.target.value)}
                  >
                    <option value="">Select a hall</option>
                    {halls.map((hall) => (
                      <option key={hall.id} value={hall.id}>
                        {hall.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Start Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">End Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  onClick={checkReadiness}
                  disabled={checking || (mode === "one" && !hallId)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                >
                  {checking ? "Checking..." : "Check Readiness"}
                </button>

                <button
                  onClick={() => generateSchedule(false)}
                  disabled={generating || !label || !startDate || !endDate || (mode === "one" && !hallId)}
                  className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                >
                  {generating ? "Generating..." : "Generate As-Is"}
                </button>

                <button
                  onClick={() => generateSchedule(true)}
                  disabled={generating || !label || !startDate || !endDate || (mode === "one" && !hallId)}
                  className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                >
                  {generating ? "Generating..." : "Generate With Override"}
                </button>

                <button
                  onClick={clearSelectedSchedule}
                  disabled={clearing || !selectedLabel}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                >
                  {clearing ? "Clearing..." : "Clear Selected Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showReadinessModal && readinessReport ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                  Readiness Report
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Availability Warnings and Coverage</h2>
              </div>

              <button
                onClick={() => setShowReadinessModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Hall Coverage</h3>
                <div className="space-y-2">
                  {readinessReport.hallCoverage.map((hall) => (
                    <div key={hall.hall_id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {hall.hall_name} — Active RAs: {hall.active_ra_count} — Required: {hall.minimum_required_availability_days}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-900">No Availability Submitted</h3>
                {readinessReport.missingAvailability.length === 0 ? (
                  <p className="text-slate-600">None.</p>
                ) : (
                  <div className="space-y-2">
                    {readinessReport.missingAvailability.map((ra) => (
                      <div key={ra.ra_id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {ra.full_name} — {ra.hall_name} — Submitted {ra.submitted_days} / Required {ra.required_days}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-900">
                  Below Hall Minimum
                </h3>
                {readinessReport.belowMinimumAvailability.length === 0 ? (
                  <p className="text-slate-600">None.</p>
                ) : (
                  <div className="space-y-2">
                    {readinessReport.belowMinimumAvailability.map((ra) => (
                      <div key={ra.ra_id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {ra.full_name} — {ra.hall_name} — Submitted {ra.submitted_days} / Required {ra.required_days}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAvailabilityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                  Availability
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Availability by Hall</h2>
              </div>

              <div className="flex gap-3">
                <select
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                  value={availabilityHallFilter}
                  onChange={(e) => setAvailabilityHallFilter(e.target.value)}
                >
                  <option value="all">All Residence Halls</option>
                  {halls.map((hall) => (
                    <option key={hall.id} value={String(hall.id)}>
                      {hall.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAvailabilityModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availabilityRowsForModal.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 ${
                    item.count === 0
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="mb-2 inline-flex rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                    {item.hall_name}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{item.full_name}</h3>

                  <div className={`mt-4 text-sm ${item.count === 0 ? "text-red-800" : "text-slate-700"}`}>
                    <div className="font-semibold">
                      {item.count === 0 ? "0 availability entries" : `${item.count} availability entr${item.count === 1 ? "y" : "ies"}`}
                    </div>
                    <div className="mt-2">{item.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showFairnessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                  Fairness Summary
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Current View Shift Breakdown</h2>
              </div>

              <button
                onClick={() => setShowFairnessModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            {fairnessSummary.length === 0 ? (
              <p className="text-slate-600">No assigned shifts in the current view.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {fairnessSummary.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                    <div className="mt-3 space-y-1 text-sm text-slate-700">
                      <p>Total: {item.total}</p>
                      <p>Primary: {item.primary}</p>
                      <p>Secondary: {item.secondary}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {errorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700">
              Error
            </div>

            <h2 className="text-2xl font-bold text-slate-900">{errorModal.title}</h2>
            <p className="mt-3 text-slate-700">{errorModal.description}</p>

            <div className="mt-6">
              <button
                onClick={() => setErrorModal(null)}
                className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}