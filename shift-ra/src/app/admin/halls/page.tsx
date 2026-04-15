"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";
import { Profile, ResidenceHall } from "@/lib/types";

export default function AdminHallsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [halls, setHalls] = useState<ResidenceHall[]>([]);
  const [raProfiles, setRAProfiles] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState("1");
  const [newWeekdayStaff, setNewWeekdayStaff] = useState("1");
  const [newWeekendStaff, setNewWeekendStaff] = useState("1");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editWeekdayStaff, setEditWeekdayStaff] = useState("");
  const [editWeekendStaff, setEditWeekendStaff] = useState("");

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

    const [{ data: hallData, error: hallError }, { data: profileData, error: profileError }] =
      await Promise.all([
        supabase.from("residence_halls").select("*").order("id", { ascending: true }),
        supabase.from("profiles").select("*").eq("role", "ra"),
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

    setHalls((hallData || []) as ResidenceHall[]);
    setRAProfiles((profileData || []) as Profile[]);
    setLoading(false);
  }

  function getAssignedCount(hallId: number) {
    return raProfiles.filter((profile) => profile.residence_hall_id === hallId).length;
  }

  async function handleAddHall(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/admin/create-hall", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          capacity: Number(newCapacity),
          weekday_staff_needed: Number(newWeekdayStaff),
          weekend_staff_needed: Number(newWeekendStaff),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add hall.");
      }

      setNewName("");
      setNewCapacity("1");
      setNewWeekdayStaff("1");
      setNewWeekendStaff("1");
      await loadData();
      setMessage("Residence hall added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to add hall.");
    }
  }

  function startEdit(hall: ResidenceHall) {
    setEditingId(hall.id);
    setEditName(hall.name);
    setEditCapacity(String(hall.capacity));
    setEditWeekdayStaff(String(hall.weekday_staff_needed));
    setEditWeekendStaff(String(hall.weekend_staff_needed));
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCapacity("");
    setEditWeekdayStaff("");
    setEditWeekendStaff("");
  }

  async function saveEdit(id: number) {
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/admin/update-hall", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          capacity: Number(editCapacity),
          weekday_staff_needed: Number(editWeekdayStaff),
          weekend_staff_needed: Number(editWeekendStaff),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update hall.");
      }

      cancelEdit();
      await loadData();
      setMessage("Residence hall updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update hall.");
    }
  }

  async function deleteHallById(id: number, name: string) {
    const confirmed = window.confirm(`Delete ${name}?`);
    if (!confirmed) return;

    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch(`/api/admin/delete-hall?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete hall.");
      }

      await loadData();
      setMessage("Residence hall deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete hall.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                Residence Hall Operations
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Manage Residence Halls</h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                Add, edit, and remove halls while managing capacity and staffing requirements.
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

        <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add Residence Hall</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            <form onSubmit={handleAddHall} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Hall Name</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New Hall"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Capacity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Weekday Staff Needed</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={newWeekdayStaff}
                  onChange={(e) => setNewWeekdayStaff(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Weekend Staff Needed</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={newWeekendStaff}
                  onChange={(e) => setNewWeekendStaff(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 transition hover:brightness-95"
              >
                Add Hall
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Current Residence Halls</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            {loading ? (
              <p className="text-slate-600">Loading halls...</p>
            ) : halls.length === 0 ? (
              <p className="text-slate-600">No residence halls found.</p>
            ) : (
              <div className="space-y-4">
                {halls.map((hall) => {
                  const assignedCount = getAssignedCount(hall.id);

                  return (
                    <div key={hall.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      {editingId === hall.id ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Hall Name</label>
                            <input
                              className="w-full rounded-xl border border-slate-300 px-4 py-3"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Capacity</label>
                            <input
                              type="number"
                              min="1"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3"
                              value={editCapacity}
                              onChange={(e) => setEditCapacity(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Weekday Staff Needed</label>
                            <input
                              type="number"
                              min="1"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3"
                              value={editWeekdayStaff}
                              onChange={(e) => setEditWeekdayStaff(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Weekend Staff Needed</label>
                            <input
                              type="number"
                              min="1"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3"
                              value={editWeekendStaff}
                              onChange={(e) => setEditWeekendStaff(e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2 flex gap-3">
                            <button
                              onClick={() => saveEdit(hall.id)}
                              className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="mb-2 inline-flex rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                              {hall.name}
                            </div>
                            <div className="space-y-1 text-sm text-slate-700">
                              <p>Capacity: {hall.capacity}</p>
                              <p>Assigned RAs: {assignedCount}</p>
                              <p>Weekday Staff Needed: {hall.weekday_staff_needed}</p>
                              <p>Weekend Staff Needed: {hall.weekend_staff_needed}</p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => startEdit(hall)}
                              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteHallById(hall.id, hall.name)}
                              className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
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