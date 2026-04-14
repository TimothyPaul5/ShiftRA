"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RAPage() {
  const router = useRouter();
  const [name, setName] = useState("Loading...");
  const [hall, setHall] = useState("Loading...");

  useEffect(() => {
    async function loadRA() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "ra") {
        router.push("/login");
        return;
      }

      setName(profile.full_name);

      if (profile.residence_hall_id) {
        const { data: hallData } = await supabase
          .from("residence_halls")
          .select("name")
          .eq("id", profile.residence_hall_id)
          .single();

        setHall(hallData?.name || "Unassigned");
      } else {
        setHall("Unassigned");
      }
    }

    loadRA();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">RA Dashboard</h1>
          <p className="mt-2">Welcome, {name}</p>
          <p className="mt-1">Residence Hall: {hall}</p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md border px-4 py-2"
        >
          Logout
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => router.push("/ra/availability")}
          className="rounded-xl border p-5 text-left"
        >
          <h2 className="text-xl font-semibold mb-2">Availability</h2>
          <p>Submit and manage weekly availability.</p>
        </button>

        <div className="rounded-xl border p-5">
          <h2 className="text-xl font-semibold mb-2">My Schedule</h2>
          <p>View date-based shift assignments.</p>
        </div>

        <div className="rounded-xl border p-5">
          <h2 className="text-xl font-semibold mb-2">Shift Swaps</h2>
          <p>Request and respond to swaps within your hall.</p>
        </div>
      </div>
    </main>
  );
}