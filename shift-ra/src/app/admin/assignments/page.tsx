"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";
import { Profile, ResidenceHall } from "@/lib/types";

type ErrorModalState = {
  title: string;
  description: string;
};

export default function AdminAssignmentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [halls, setHalls] = useState<ResidenceHall[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const result = await getCurrentProfile();

      if (result.error || !result.profile || result.profile.role !== "admin") {
        router.push("/login");
        return;
      }

      await loadData();
    }

    checkAdminAndLoad();
  }, [router]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [{ data: profileData, error: profileError }, { data: hallData, error: hallError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "ra")
          .order("full_name", { ascending: true }),
        supabase
          .from("residence_halls")
          .select("*")
          .order("name", { ascending: true }),
      ]);

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (hallError) {
      setMessage(hallError.message);
      setLoading(false);
      return;
    }

    setProfiles((profileData || []) as Profile[]);
    setHalls((hallData || []) as ResidenceHall[]);
    setLoading(false);
  }

  function getHallName(hallId: number | null) {
    if (!hallId) return "Unassigned";
    return halls.find((hall) => hall.id === hallId)?.name || "Unknown Hall";
  }

  function getAssignedCount(hallId: number) {
    return profiles.filter((profile) => profile.residence_hall_id === hallId).length;
  }

  async function updateRAHall(profileId: string, hallIdValue: string) {
    setSavingId(profileId);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/admin/assign-ra", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          profileId,
          residence_hall_id: hallIdValue === "" ? null : Number(hallIdValue),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "USER_HAS_SCHEDULES") {
          setErrorModal({
            title: "Residence Hall Change Blocked",
            description:
              "This RA still has scheduled shifts. Clear or reassign those shifts before changing their residence hall.",
          });
          return;
        }

        throw new Error(result.error || "Failed to update hall assignment.");
      }

      await loadData();
      setMessage("RA assignment updated.");
    } catch (error) {
      setErrorModal({
        title: "Update Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update residence hall assignment.",
      });
    }

    setSavingId(null);
  }

  const summary = useMemo(() => {
    return halls.map((hall) => ({
      ...hall,
      assigned: getAssignedCount(hall.id),
    }));
  }, [halls, profiles]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                RA Placement
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                RA Assignments
              </h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                Move RAs between halls, unassign them when needed, and review hall capacity at a glance.
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
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-800 shadow-sm">
            {message}
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((hall) => (
            <div
              key={hall.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 inline-flex rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                {hall.name}
              </div>
              <div className="space-y-1 text-sm text-slate-700">
                <p>Capacity: {hall.capacity}</p>
                <p>Assigned: {hall.assigned}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Current RA Assignments</h2>
            <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
          </div>

          {loading ? (
            <p className="text-slate-600">Loading RA assignments...</p>
          ) : profiles.length === 0 ? (
            <p className="text-slate-600">No RAs found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-2 inline-flex rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                    RA
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{profile.full_name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{profile.email}</p>
                  <p className="mt-3 text-sm text-slate-700">
                    Current Hall: {getHallName(profile.residence_hall_id)}
                  </p>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Assign Residence Hall
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={profile.residence_hall_id ?? ""}
                      onChange={(e) => updateRAHall(profile.id, e.target.value)}
                      disabled={savingId === profile.id}
                    >
                      <option value="">Unassigned</option>
                      {halls.map((hall) => (
                        <option key={hall.id} value={hall.id}>
                          {hall.name} (capacity {hall.capacity}, assigned {getAssignedCount(hall.id)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {savingId === profile.id ? (
                    <p className="mt-3 text-sm font-medium text-blue-800">Saving...</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {errorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
              Action Blocked
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