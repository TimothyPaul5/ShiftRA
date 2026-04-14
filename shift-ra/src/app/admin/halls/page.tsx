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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete hall.");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Manage Residence Halls</h1>
          <p className="mt-2">Add, edit, and remove halls and staffing settings.</p>
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

      <section className="mb-10 rounded-xl border p-6">
        <h2 className="text-2xl font-semibold mb-4">Add Residence Hall</h2>

        <form onSubmit={handleAddHall} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-1 text-sm font-medium">Hall Name</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New Res Hall 3"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Capacity</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-md border px-3 py-2"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Weekday Staff Needed</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-md border px-3 py-2"
              value={newWeekdayStaff}
              onChange={(e) => setNewWeekdayStaff(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Weekend Staff Needed</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-md border px-3 py-2"
              value={newWeekendStaff}
              onChange={(e) => setNewWeekendStaff(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="rounded-md border px-4 py-2 font-medium">
              Add Hall
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-2xl font-semibold mb-4">Current Residence Halls</h2>

        {loading ? (
          <p>Loading halls...</p>
        ) : halls.length === 0 ? (
          <p>No residence halls found.</p>
        ) : (
          <div className="space-y-4">
            {halls.map((hall) => {
              const assignedCount = getAssignedCount(hall.id);

              return (
                <div key={hall.id} className="rounded-lg border p-4">
                  {editingId === hall.id ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block mb-1 text-sm font-medium">Hall Name</label>
                        <input
                          className="w-full rounded-md border px-3 py-2"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium">Capacity</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-md border px-3 py-2"
                          value={editCapacity}
                          onChange={(e) => setEditCapacity(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium">Weekday Staff Needed</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-md border px-3 py-2"
                          value={editWeekdayStaff}
                          onChange={(e) => setEditWeekdayStaff(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium">Weekend Staff Needed</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-md border px-3 py-2"
                          value={editWeekendStaff}
                          onChange={(e) => setEditWeekendStaff(e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-2 flex gap-3">
                        <button onClick={() => saveEdit(hall.id)} className="rounded-md border px-4 py-2">
                          Save
                        </button>
                        <button onClick={cancelEdit} className="rounded-md border px-4 py-2">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{hall.name}</h3>
                        <p>Capacity: {hall.capacity}</p>
                        <p>Assigned RAs: {assignedCount}</p>
                        <p>Weekday Staff Needed: {hall.weekday_staff_needed}</p>
                        <p>Weekend Staff Needed: {hall.weekend_staff_needed}</p>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => startEdit(hall)} className="rounded-md border px-4 py-2">
                          Edit
                        </button>
                        <button onClick={() => deleteHallById(hall.id, hall.name)} className="rounded-md border px-4 py-2">
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
    </main>
  );
}