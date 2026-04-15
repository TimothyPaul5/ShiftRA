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

  const cards = [
    {
      title: "Availability",
      description: "Submit and update your weekly availability so scheduling is more accurate and fair.",
      action: () => router.push("/ra/availability"),
    },
    {
      title: "My Schedule",
      description: "View the hall schedule, see your highlighted shifts, and manage swaps.",
      action: () => router.push("/ra/schedule"),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                Campus Operations Dashboard
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                RA Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                Welcome back, {name}. Stay on top of your availability, hall schedule,
                and swap activity.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 shadow-sm transition hover:brightness-95"
            >
              Logout
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-sm uppercase tracking-wide text-blue-200">Role</div>
              <div className="mt-2 text-2xl font-semibold">Resident Assistant</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-sm uppercase tracking-wide text-blue-200">Residence Hall</div>
              <div className="mt-2 text-2xl font-semibold">{hall}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-sm uppercase tracking-wide text-blue-200">Tools</div>
              <div className="mt-2 text-2xl font-semibold">Availability & Swaps</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Quick Actions</h2>
          <div className="mt-2 h-1 w-24 rounded-full bg-yellow-400" />
          <p className="mt-3 text-slate-600">
            Access the parts of the system you use most often.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={card.action}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                {card.title}
              </div>

              <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>

              <div className="mt-6 flex items-center gap-2 font-semibold text-blue-800">
                Open
                <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}