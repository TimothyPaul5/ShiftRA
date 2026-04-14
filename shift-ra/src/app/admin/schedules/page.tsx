"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";
import { ResidenceHall } from "@/lib/types";

type ReadinessIssue = {
  ra_id: string;
  full_name: string;
  residence_hall_id: number | null;
  submitted_days: number;
};

type HallCoverageSummary = {
  hall_id: number;
  hall_name: string;
  active_ra_count: number;
};

type ScheduleReadinessReport = {
  minimumRequiredDays: number;
  hallScope: "one" | "all";
  missingAvailability: ReadinessIssue[];
  belowMinimumAvailability: ReadinessIssue[];
  hallCoverage: HallCoverageSummary[];
  hasWarnings: boolean;
};

export default function AdminSchedulesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [halls, setHalls] = useState<ResidenceHall[]>([]);

  const [mode, setMode] = useState<"all" | "one">("all");
  const [hallId, setHallId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minimumRequiredDays, setMinimumRequiredDays] = useState("2");
  const [readinessReport, setReadinessReport] = useState<ScheduleReadinessReport | null>(null);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const result = await getCurrentProfile();

      if (result.error || !result.profile || result.profile.role !== "admin") {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("residence_halls")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setHalls((data || []) as ResidenceHall[]);
      setLoading(false);
    }

    checkAdminAndLoad();
  }, [router]);

  async function checkReadiness() {
    setChecking(true);
    setMessage("");
    setReadinessReport(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You are not logged in.");
      }

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
          minimumRequiredDays: Number(minimumRequiredDays),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to check readiness.");
      }

      setReadinessReport(result.report as ScheduleReadinessReport);

      if (!result.report.hasWarnings) {
        setMessage("No availability warnings found. You can generate normally.");
      } else {
        setMessage("Warnings found. Review them below, then choose how to generate.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to check readiness.");
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

      if (!session) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch("/api/admin/generate-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          startDate,
          endDate,
          hallId: mode === "one" ? Number(hallId) : null,
          mode,
          action: "generate",
          overrideIncomplete,
          minimumRequiredDays: Number(minimumRequiredDays),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate schedule.");
      }

      if (mode === "one") {
        setMessage(
          overrideIncomplete
            ? `Schedule generated for ${result.result.hall.name} with incomplete availability override.`
            : `Schedule generated for ${result.result.hall.name} as-is.`
        );
      } else {
        setMessage(
          overrideIncomplete
            ? `Schedules generated for ${result.results.length} hall(s) with incomplete availability override.`
            : `Schedules generated for ${result.results.length} hall(s) as-is.`
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate schedule.");
    }

    setGenerating(false);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Generate Schedules</h1>
          <p className="mt-2">
            Check readiness first, then generate as-is or override incomplete availability.
          </p>
        </div>

        <button
          onClick={() => router.push("/admin")}
          className="rounded-md border px-4 py-2"
        >
          Back to Admin
        </button>
      </div>

      {message ? <div className="mb-6 rounded-md border p-3">{message}</div> : null}

      <section className="mb-8 rounded-xl border p-6">
        {loading ? (
          <p>Loading halls...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium">Generation Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "all"}
                    onChange={() => setMode("all")}
                  />
                  <span>All Residence Halls</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "one"}
                    onChange={() => setMode("one")}
                  />
                  <span>One Residence Hall</span>
                </label>
              </div>
            </div>

            {mode === "one" ? (
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium">Residence Hall</label>
                <select
                  className="w-full rounded-md border px-3 py-2"
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
              <label className="block mb-1 text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium">End Date</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium">
                Minimum Required Availability Days
              </label>
              <input
                type="number"
                min="1"
                max="7"
                className="w-full rounded-md border px-3 py-2"
                value={minimumRequiredDays}
                onChange={(e) => setMinimumRequiredDays(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                onClick={checkReadiness}
                disabled={checking || (mode === "one" && !hallId)}
                className="rounded-md border px-4 py-2 font-medium"
              >
                {checking ? "Checking..." : "Check Readiness"}
              </button>

              <button
                onClick={() => generateSchedule(false)}
                disabled={generating || !startDate || !endDate || (mode === "one" && !hallId)}
                className="rounded-md border px-4 py-2 font-medium"
              >
                {generating ? "Generating..." : "Generate As-Is"}
              </button>

              <button
                onClick={() => generateSchedule(true)}
                disabled={generating || !startDate || !endDate || (mode === "one" && !hallId)}
                className="rounded-md border px-4 py-2 font-medium"
              >
                {generating ? "Generating..." : "Generate With Override"}
              </button>
            </div>
          </div>
        )}
      </section>

      {readinessReport ? (
        <section className="rounded-xl border p-6">
          <h2 className="text-2xl font-semibold mb-4">Readiness Report</h2>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Hall Coverage</h3>
            <div className="space-y-2">
              {readinessReport.hallCoverage.map((hall) => (
                <div key={hall.hall_id} className="rounded-md border px-4 py-3">
                  {hall.hall_name} — Active RAs: {hall.active_ra_count}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">No Availability Submitted</h3>
            {readinessReport.missingAvailability.length === 0 ? (
              <p>None.</p>
            ) : (
              <div className="space-y-2">
                {readinessReport.missingAvailability.map((ra) => (
                  <div key={ra.ra_id} className="rounded-md border px-4 py-3">
                    {ra.full_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Below Minimum ({readinessReport.minimumRequiredDays} day(s))
            </h3>
            {readinessReport.belowMinimumAvailability.length === 0 ? (
              <p>None.</p>
            ) : (
              <div className="space-y-2">
                {readinessReport.belowMinimumAvailability.map((ra) => (
                  <div key={ra.ra_id} className="rounded-md border px-4 py-3">
                    {ra.full_name} — Submitted: {ra.submitted_days} day(s)
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}