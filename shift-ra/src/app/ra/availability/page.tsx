"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";
import { AvailabilityRow } from "@/lib/types";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

export default function RAAvailabilityPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [savedAvailability, setSavedAvailability] = useState<AvailabilityRow[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    async function checkRAAndLoad() {
      const result = await getCurrentProfile();

      if (result.error || !result.profile || result.profile.role !== "ra") {
        router.push("/login");
        return;
      }

      setProfileId(result.profile.id);
      await loadAvailability(result.profile.id);
    }

    checkRAAndLoad();
  }, [router]);

  async function loadAvailability(raId: string) {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("ra_id", raId)
      .order("day_of_week", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as AvailabilityRow[];
    setSavedAvailability(rows);
    setSelectedDays(rows.map((row) => row.day_of_week));
    setLoading(false);
  }

  const savedDaySet = useMemo(
    () => new Set(savedAvailability.map((row) => row.day_of_week)),
    [savedAvailability]
  );

  function toggleDay(dayNumber: number) {
    setSelectedDays((prev) =>
      prev.includes(dayNumber)
        ? prev.filter((d) => d !== dayNumber)
        : [...prev, dayNumber].sort((a, b) => a - b)
    );
  }

  async function saveSelectedDays() {
    setSaving(true);
    setMessage("");

    try {
      const unsavedDays = selectedDays.filter((day) => !savedDaySet.has(day));

      if (unsavedDays.length === 0) {
        throw new Error("No new days selected to save.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/ra/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dayNumbers: unsavedDays,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save availability.");
      }

      if (!profileId) throw new Error("Missing profile ID.");
      setMessage("Availability saved.");
      await loadAvailability(profileId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save availability.");
    }

    setSaving(false);
  }

  async function removeSelectedDays() {
    setSaving(true);
    setMessage("");

    try {
      const removableDays = selectedDays.filter((day) => savedDaySet.has(day));

      if (removableDays.length === 0) {
        throw new Error("No saved days selected to remove.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/ra/availability", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dayNumbers: removableDays,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to remove availability.");
      }

      if (!profileId) throw new Error("Missing profile ID.");
      setMessage("Availability removed.");
      await loadAvailability(profileId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to remove availability.");
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                Weekly Availability
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">My Availability</h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                Select the weekly days you are available so schedules can be generated more accurately and fairly.
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

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Choose Days</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            {loading ? (
              <p className="text-slate-600">Loading availability...</p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {DAYS.map((day) => {
                    const checked = selectedDays.includes(day.value);
                    const alreadySaved = savedDaySet.has(day.value);

                    return (
                      <label
                        key={day.value}
                        className={`cursor-pointer rounded-2xl border p-5 transition ${
                          checked
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-slate-50 hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-lg font-bold text-slate-900">{day.label}</div>
                            {alreadySaved ? (
                              <div className="mt-2 inline-flex rounded-lg bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                                Saved
                              </div>
                            ) : null}
                          </div>

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDay(day.value)}
                            className="h-5 w-5"
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={saveSelectedDays}
                    disabled={saving}
                    className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                  >
                    {saving ? "Saving..." : "Save Selected Days"}
                  </button>

                  <button
                    onClick={removeSelectedDays}
                    disabled={saving}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                  >
                    {saving ? "Removing..." : "Remove Selected Saved Days"}
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Saved Availability</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            {loading ? (
              <p className="text-slate-600">Loading...</p>
            ) : savedAvailability.length === 0 ? (
              <p className="text-slate-600">No availability saved yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {savedAvailability.map((row) => {
                  const day = DAYS.find((d) => d.value === row.day_of_week);
                  return (
                    <div
                      key={row.id}
                      className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-900"
                    >
                      {day?.label || `Day ${row.day_of_week}`}
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