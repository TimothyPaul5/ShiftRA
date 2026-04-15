"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getNextMonth, getPreviousMonth } from "@/lib/core/calendar";
import ScheduleMonthCalendar from "@/components/ScheduleMonthCalendar";
import { supabase } from "@/lib/supabase";

type AssignmentRow = {
  id: number;
  schedule_id?: number;
  residence_hall_id: number;
  assignment_date: string;
  day_of_week: number;
  role: "Primary" | "Secondary";
  assigned_ra_id: string | null;
};

type HallRow = {
  id: number;
  name: string;
};

type RAProfile = {
  id: string;
  full_name: string;
  residence_hall_id: number | null;
};

type SwapRequestRow = {
  id: number;
  requester_ra_id: string;
  target_ra_id: string;
  requester_assignment_id: number;
  target_assignment_id: number;
  residence_hall_id: number;
  status: string;
  created_at: string;
};

export default function RASchedulePage() {
  const router = useRouter();

  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [profileId, setProfileId] = useState<string | null>(null);
  const [hallId, setHallId] = useState<number | null>(null);
  const [hallName, setHallName] = useState("Unassigned");

  const [hallAssignments, setHallAssignments] = useState<AssignmentRow[]>([]);
  const [hallRAs, setHallRAs] = useState<RAProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<SwapRequestRow[]>([]);
  const [allMyRequests, setAllMyRequests] = useState<SwapRequestRow[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMyShiftId, setSelectedMyShiftId] = useState<number | null>(null);
  const [selectedTargetShiftId, setSelectedTargetShiftId] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      const result = await getCurrentProfile();

      if (result.error || !result.profile || result.profile.role !== "ra") {
        router.push("/login");
        return;
      }

      setProfileId(result.profile.id);
      setHallId(result.profile.residence_hall_id);

      if (result.profile.residence_hall_id) {
        const [{ data: hallData }, { data: raData }] = await Promise.all([
          supabase
            .from("residence_halls")
            .select("id, name")
            .eq("id", result.profile.residence_hall_id)
            .single(),
          supabase
            .from("profiles")
            .select("id, full_name, residence_hall_id")
            .eq("role", "ra")
            .eq("residence_hall_id", result.profile.residence_hall_id)
            .order("full_name", { ascending: true }),
        ]);

        if (hallData) {
          setHallName((hallData as HallRow).name);
        }

        setHallRAs((raData || []) as RAProfile[]);
      }

      await loadData(
        result.profile.id,
        result.profile.residence_hall_id,
        calendarYear,
        calendarMonth
      );
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadData(
    raId: string,
    residenceHallId: number | null,
    year: number,
    month: number
  ) {
    if (!residenceHallId) {
      setHallAssignments([]);
      setPendingRequests([]);
      setAllMyRequests([]);
      return;
    }

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDateObj = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, "0")}-${String(
      endDateObj.getDate()
    ).padStart(2, "0")}`;

    const hallAssignmentsPromise = supabase
      .from("schedule_assignments")
      .select("*")
      .eq("residence_hall_id", residenceHallId)
      .gte("assignment_date", start)
      .lte("assignment_date", end)
      .order("assignment_date", { ascending: true });

    const pendingPromise = supabase
      .from("swap_requests")
      .select("*")
      .eq("target_ra_id", raId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const allPromise = supabase
      .from("swap_requests")
      .select("*")
      .or(`requester_ra_id.eq.${raId},target_ra_id.eq.${raId}`)
      .order("created_at", { ascending: false });

    const [hall, pending, all] = await Promise.all([
      hallAssignmentsPromise,
      pendingPromise,
      allPromise,
    ]);

    if (hall.error) throw new Error(hall.error.message);
    if (pending.error) throw new Error(pending.error.message);
    if (all.error) throw new Error(all.error.message);

    setHallAssignments((hall.data || []) as AssignmentRow[]);
    setPendingRequests((pending.data || []) as SwapRequestRow[]);
    setAllMyRequests((all.data || []) as SwapRequestRow[]);
  }

  useEffect(() => {
    if (profileId) {
      loadData(profileId, hallId, calendarYear, calendarMonth).catch((error) =>
        setMessage(error instanceof Error ? error.message : "Failed to load schedule.")
      );
    }
  }, [calendarYear, calendarMonth, profileId, hallId]);

  function getRAName(raId: string | null) {
    if (!raId) return "Unassigned";
    return hallRAs.find((ra) => ra.id === raId)?.full_name || `User ${raId}`;
  }

  function getAssignmentById(id: number) {
    return hallAssignments.find((assignment) => assignment.id === id) || null;
  }

  function formatFriendlyDate(dateString: string) {
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  function formatAssignmentLabel(assignmentId: number) {
    const assignment = getAssignmentById(assignmentId);
    if (!assignment) return "Shift not found";
    return `${formatFriendlyDate(assignment.assignment_date)} — ${assignment.role}`;
  }

  const calendarShifts = useMemo(
    () =>
      hallAssignments.map((row) => ({
        id: row.id,
        assignment_date: row.assignment_date,
        role: row.role,
        assigned_ra_name: getRAName(row.assigned_ra_id),
        hall_name: hallName,
        isMine: row.assigned_ra_id === profileId,
      })),
    [hallAssignments, hallName, profileId, hallRAs]
  );

  const selectedDayAssignments = useMemo(() => {
    if (!selectedDate) return [];
    return hallAssignments.filter((row) => row.assignment_date === selectedDate);
  }, [hallAssignments, selectedDate]);

  const selectedMyShift = useMemo(
    () => hallAssignments.find((row) => row.id === selectedMyShiftId) || null,
    [hallAssignments, selectedMyShiftId]
  );

  const selectedTargetShift = useMemo(
    () => hallAssignments.find((row) => row.id === selectedTargetShiftId) || null,
    [hallAssignments, selectedTargetShiftId]
  );

  const swapStatusMessage = useMemo(() => {
    if (!selectedMyShift || !selectedTargetShift) return "";

    if (selectedMyShift.id === selectedTargetShift.id) {
      return "Select a different target shift.";
    }

    if (selectedTargetShift.assigned_ra_id === profileId) {
      return "Target shift must belong to another RA.";
    }

    if (!selectedTargetShift.assigned_ra_id) {
      return "Cannot swap with an unassigned shift.";
    }

    if (selectedMyShift.residence_hall_id !== selectedTargetShift.residence_hall_id) {
      return "Swaps must stay in the same residence hall.";
    }

    if (selectedMyShift.role !== selectedTargetShift.role) {
      return "Swaps must be between the same role type.";
    }

    return "Ready to submit swap request.";
  }, [selectedMyShift, selectedTargetShift, profileId]);

  function handleShiftClick(shiftId?: number) {
    if (!shiftId) return;

    const shift = hallAssignments.find((row) => row.id === shiftId);
    if (!shift) return;

    setSelectedDate(shift.assignment_date);

    if (shift.assigned_ra_id === profileId) {
      setSelectedMyShiftId(shift.id);
      if (selectedTargetShiftId === shift.id) {
        setSelectedTargetShiftId(null);
      }
      return;
    }

    if (selectedMyShiftId) {
      setSelectedTargetShiftId(shift.id);
    }
  }

  async function submitSwapRequest() {
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");
      if (!selectedMyShift || !selectedTargetShift) {
        throw new Error("Select your shift and a target shift.");
      }

      if (selectedMyShift.role !== selectedTargetShift.role) {
        throw new Error("Swaps must be between the same role type.");
      }

      if (!selectedTargetShift.assigned_ra_id) {
        throw new Error("Target shift must have an assigned RA.");
      }

      const response = await fetch("/api/ra/request-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requester_assignment_id: selectedMyShift.id,
          target_assignment_id: selectedTargetShift.id,
          target_ra_id: selectedTargetShift.assigned_ra_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit swap request.");
      }

      setMessage("Swap request submitted.");
      setSelectedTargetShiftId(null);

      if (profileId) {
        await loadData(profileId, hallId, calendarYear, calendarMonth);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit swap request.");
    }

    setSaving(false);
  }

  async function respondToSwap(swapRequestId: number, action: "approve" | "reject") {
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/ra/respond-swap", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          swapRequestId,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to respond to swap request.");
      }

      setMessage(action === "approve" ? "Swap approved." : "Swap rejected.");

      if (profileId) {
        await loadData(profileId, hallId, calendarYear, calendarMonth);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to respond to swap request.");
    }

    setSaving(false);
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
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                Schedule & Swaps
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">My Schedule</h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                View the whole hall schedule, see your highlighted shifts, and request or approve swaps in one place.
              </p>
            </div>

            <button
              onClick={() => router.push("/ra")}
              className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 transition hover:brightness-95"
            >
              Back to Dashboard
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

        <div className="grid gap-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {loading ? (
              <p className="text-slate-600">Loading schedule...</p>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={goToPreviousMonth}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                  >
                    Previous Month
                  </button>

                  <div className="text-sm text-slate-600">
                    Whole hall schedule — your shifts are highlighted
                  </div>

                  <button
                    onClick={goToNextMonth}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                  >
                    Next Month
                  </button>
                </div>

                <ScheduleMonthCalendar
                  year={calendarYear}
                  month={calendarMonth}
                  shifts={calendarShifts}
                  onDayClick={(date) => setSelectedDate(date)}
                  onShiftClick={handleShiftClick}
                  selectedMyShiftId={selectedMyShiftId}
                  selectedTargetShiftId={selectedTargetShiftId}
                />
              </>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Selected Swap</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">My Selected Shift</div>
                {selectedMyShift ? (
                  <div className="text-slate-900">
                    {formatFriendlyDate(selectedMyShift.assignment_date)} — {selectedMyShift.role}
                  </div>
                ) : (
                  <div className="text-slate-600">No shift selected yet.</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Target Shift</div>
                {selectedTargetShift ? (
                  <div className="text-slate-900">
                    {formatFriendlyDate(selectedTargetShift.assignment_date)} — {selectedTargetShift.role} —{" "}
                    {getRAName(selectedTargetShift.assigned_ra_id)}
                  </div>
                ) : (
                  <div className="text-slate-600">No target selected yet.</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Status</div>
                <div className="text-slate-900">{swapStatusMessage || "Select shifts to begin."}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={submitSwapRequest}
                disabled={
                  saving ||
                  !selectedMyShift ||
                  !selectedTargetShift ||
                  swapStatusMessage !== "Ready to submit swap request."
                }
                className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 disabled:opacity-70"
              >
                Submit Swap Request
              </button>

              <button
                onClick={() => {
                  setSelectedMyShiftId(null);
                  setSelectedTargetShiftId(null);
                }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                Clear Selection
              </button>
            </div>
          </section>

          {selectedDate ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Shifts for {formatFriendlyDate(selectedDate)}
                </h2>
                <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
              </div>

              {selectedDayAssignments.length === 0 ? (
                <p className="text-slate-600">No shifts on this date.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedDayAssignments.map((assignment) => {
                    const mine = assignment.assigned_ra_id === profileId;
                    const selected =
                      assignment.id === selectedMyShiftId || assignment.id === selectedTargetShiftId;

                    return (
                      <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-lg font-bold text-slate-900">
                          {assignment.role} {mine ? "— My Shift" : ""}
                        </div>
                        <div className="mt-2 text-slate-700">{getRAName(assignment.assigned_ra_id)}</div>
                        <div className="mt-2 text-sm text-slate-500">
                          {selected ? "Selected" : "Click on the calendar entry to select"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Incoming Requests</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-slate-600">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((swap) => (
                  <div key={swap.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-lg font-bold text-slate-900">
                      Incoming request from {getRAName(swap.requester_ra_id)}
                    </div>
                    <div className="mt-3 space-y-1 text-slate-700">
                      <div>They want your shift: {formatAssignmentLabel(swap.target_assignment_id)}</div>
                      <div>In exchange for: {formatAssignmentLabel(swap.requester_assignment_id)}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      Created: {new Date(swap.created_at).toLocaleString()}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => respondToSwap(swap.id, "approve")}
                        disabled={saving}
                        className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => respondToSwap(swap.id, "reject")}
                        disabled={saving}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">My Swap History</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            {allMyRequests.length === 0 ? (
              <p className="text-slate-600">No swap history yet.</p>
            ) : (
              <div className="space-y-4">
                {allMyRequests.map((swap) => {
                  const direction = swap.requester_ra_id === profileId ? "Outgoing" : "Incoming";

                  return (
                    <div key={swap.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="text-lg font-bold text-slate-900">
                        {direction} — Status: {swap.status}
                      </div>
                      <div className="mt-3 space-y-1 text-slate-700">
                        <div>Offered shift: {formatAssignmentLabel(swap.requester_assignment_id)}</div>
                        <div>Requested shift: {formatAssignmentLabel(swap.target_assignment_id)}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        Other RA:{" "}
                        {swap.requester_ra_id === profileId
                          ? getRAName(swap.target_ra_id)
                          : getRAName(swap.requester_ra_id)}
                      </div>
                      <div className="text-sm text-slate-500">
                        Created: {new Date(swap.created_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}