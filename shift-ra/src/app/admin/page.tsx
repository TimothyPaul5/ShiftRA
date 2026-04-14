"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const [name, setName] = useState("Loading...");

  useEffect(() => {
    async function loadAdmin() {
      const result = await getCurrentProfile();

      if (result.error || !result.profile || result.profile.role !== "admin") {
        router.push("/login");
        return;
      }

      setName(result.profile.full_name);
    }

    loadAdmin();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="mt-2">Welcome, {name}</p>
        </div>

        <button onClick={handleLogout} className="rounded-md border px-4 py-2">
          Logout
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => router.push("/admin/users")}
          className="rounded-xl border p-5 text-left"
        >
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <p>Create admin and RA accounts.</p>
        </button>

        <button
          onClick={() => router.push("/admin/halls")}
          className="rounded-xl border p-5 text-left"
        >
          <h2 className="text-xl font-semibold mb-2">Residence Halls</h2>
          <p>Manage halls, capacity, and staffing needs.</p>
        </button>

        <button
          onClick={() => router.push("/admin/assignments")}
          className="rounded-xl border p-5 text-left"
        >
          <h2 className="text-xl font-semibold mb-2">RA Assignments</h2>
          <p>Move RAs between residence halls.</p>
        </button>

        <button
          onClick={() => router.push("/admin/schedules")}
          className="rounded-xl border p-5 text-left"
        >
          <h2 className="text-xl font-semibold mb-2">Schedule Generation</h2>
          <p>Generate schedules for all halls or one hall.</p>
        </button>
      </div>
    </main>
  );
}