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
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">My Availability</h1>
          <p className="mt-2">Select one or more weekly days you are available.</p>
        </div>

        <button
          onClick={() => router.push("/ra")}
          className="rounded-md border px-4 py-2"
        >
          Back to RA Dashboard
        </button>
      </div>

      {message ? <div className="mb-6 rounded-md border p-3">{message}</div> : null}

      <section className="mb-8 rounded-xl border p-6">
        <h2 className="text-2xl font-semibold mb-4">Choose Days</h2>

        {loading ? (
          <p>Loading availability...</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {DAYS.map((day) => {
                const checked = selectedDays.includes(day.value);
                const alreadySaved = savedDaySet.has(day.value);

                return (
                  <label
                    key={day.value}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer"
                  >
                    <span>{day.label}</span>
                    <div className="flex items-center gap-3">
                      {alreadySaved ? (
                        <span className="text-xs border rounded px-2 py-1">Saved</span>
                      ) : null}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDay(day.value)}
                      />
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={saveSelectedDays}
                disabled={saving}
                className="rounded-md border px-4 py-2"
              >
                {saving ? "Saving..." : "Save Selected Days"}
              </button>

              <button
                onClick={removeSelectedDays}
                disabled={saving}
                className="rounded-md border px-4 py-2"
              >
                {saving ? "Removing..." : "Remove Selected Saved Days"}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-2xl font-semibold mb-4">Currently Saved Availability</h2>

        {loading ? (
          <p>Loading...</p>
        ) : savedAvailability.length === 0 ? (
          <p>No availability saved yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {savedAvailability.map((row) => {
              const day = DAYS.find((d) => d.value === row.day_of_week);
              return (
                <div key={row.id} className="rounded-full border px-4 py-2">
                  {day?.label || `Day ${row.day_of_week}`}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}