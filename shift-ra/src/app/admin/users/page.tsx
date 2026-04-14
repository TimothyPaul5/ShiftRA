"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";
import { Profile, ResidenceHall } from "@/lib/types";

export default function AdminUsersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [halls, setHalls] = useState<ResidenceHall[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "ra">("ra");
  const [residenceHallId, setResidenceHallId] = useState("");

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
        supabase.from("profiles").select("*").order("full_name", { ascending: true }),
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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          residence_hall_id: role === "ra" && residenceHallId ? Number(residenceHallId) : null,
          active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user.");
      }

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("ra");
      setResidenceHallId("");
      setMessage("User created successfully.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create user.");
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Manage Users</h1>
          <p className="mt-2">Create admin and RA accounts.</p>
        </div>

        <button onClick={() => router.push("/admin")} className="rounded-md border px-4 py-2">
          Back to Admin
        </button>
      </div>

      {message ? <div className="mb-6 rounded-md border p-3">{message}</div> : null}

      <section className="mb-10 rounded-xl border p-6">
        <h2 className="text-2xl font-semibold mb-4">Create User</h2>

        <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-1 text-sm font-medium">Full Name</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full rounded-md border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Role</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "ra")}
            >
              <option value="ra">RA</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === "ra" ? (
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium">Residence Hall</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={residenceHallId}
                onChange={(e) => setResidenceHallId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {halls.map((hall) => (
                  <option key={hall.id} value={hall.id}>
                    {hall.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="rounded-md border px-4 py-2 font-medium">
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-2xl font-semibold mb-4">Current Users</h2>

        {loading ? (
          <p>Loading users...</p>
        ) : profiles.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="rounded-lg border p-4">
                <h3 className="text-xl font-semibold">{profile.full_name}</h3>
                <p>{profile.email}</p>
                <p>Role: {profile.role}</p>
                <p>Status: {profile.active ? "Active" : "Inactive"}</p>
                <p>Hall: {profile.role === "ra" ? getHallName(profile.residence_hall_id) : "N/A"}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}