"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";
import { Profile, ResidenceHall } from "@/lib/types";

export default function AdminAssignmentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [halls, setHalls] = useState<ResidenceHall[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

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
        supabase.from("profiles").select("*").eq("role", "ra").order("full_name", { ascending: true }),
        supabase.from("residence_halls").select("*").order("name", { ascending: true }),
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
        throw new Error(result.error || "Failed to update hall assignment.");
      }

      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update hall assignment.");
    }

    setSavingId(null);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">RA Hall Assignments</h1>
          <p className="mt-2">Move RAs between residence halls or remove assignments.</p>
        </div>

        <button onClick={() => router.push("/admin")} className="rounded-md border px-4 py-2">
          Back to Admin
        </button>
      </div>

      {message ? (
        <div className="mb-6 rounded-md border border-red-400 bg-red-50 p-3 text-red-700">
          {message}
        </div>
      ) : null}

      <section className="rounded-xl border p-6">
        <h2 className="text-2xl font-semibold mb-4">Current RA Assignments</h2>

        {loading ? (
          <p>Loading RA assignments...</p>
        ) : profiles.length === 0 ? (
          <p>No RAs found.</p>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg border p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-xl font-semibold">{profile.full_name}</h3>
                  <p>{profile.email}</p>
                  <p>Status: {profile.active ? "Active" : "Inactive"}</p>
                  <p>Current Hall: {getHallName(profile.residence_hall_id)}</p>
                </div>

                <div className="flex flex-col gap-2 md:min-w-[320px]">
                  <label className="text-sm font-medium">Assign Residence Hall</label>
                  <select
                    className="rounded-md border px-3 py-2"
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

                  {savingId === profile.id ? <p className="text-sm text-gray-600">Saving...</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}