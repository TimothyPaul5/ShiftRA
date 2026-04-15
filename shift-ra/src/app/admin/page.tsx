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

  const cards = [
    {
      title: "Users",
      description: "Create admin and RA accounts, view users, and manage who has access.",
      action: () => router.push("/admin/users"),
    },
    {
      title: "Residence Halls",
      description: "Manage halls, capacities, and staffing requirements for weekday and weekend coverage.",
      action: () => router.push("/admin/halls"),
    },
    {
      title: "RA Assignments",
      description: "Assign or move RAs between residence halls while keeping capacity rules enforced.",
      action: () => router.push("/admin/assignments"),
    },
    {
      title: "Schedules",
      description: "Generate labeled schedules, review fairness, and manually edit shifts in the calendar.",
      action: () => router.push("/admin/schedules"),
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
                Admin Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                Welcome back, {name}. Manage users, housing coverage, schedule generation,
                and shift operations from one place.
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
              <div className="mt-2 text-2xl font-semibold">Administrator</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-sm uppercase tracking-wide text-blue-200">Focus</div>
              <div className="mt-2 text-2xl font-semibold">Scheduling & Housing</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-sm uppercase tracking-wide text-blue-200">Tools</div>
              <div className="mt-2 text-2xl font-semibold">Live Calendar Editing</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Operations Menu</h2>
          <div className="mt-2 h-1 w-24 rounded-full bg-yellow-400" />
          <p className="mt-3 text-slate-600">
            Select an area to manage your campus staffing workflow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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