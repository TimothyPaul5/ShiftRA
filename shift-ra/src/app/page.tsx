"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-7xl flex-col justify-center px-6 py-16">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
              Campus Operations System
            </div>

            <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
              Housing Scheduling,
              <span className="block text-yellow-300">Availability, and Shift Management</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">
              A centralized system for managing residence hall staffing, RA availability,
              labeled term schedules, manual edits, and swap requests.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => router.push("/login")}
                className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-6 py-3 font-semibold text-blue-950 shadow-sm transition hover:brightness-95"
              >
                Go to Login
              </button>

              <button
                onClick={() => {
                  const section = document.getElementById("features");
                  section?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                View Features
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">What this system does</h2>
          <div className="mt-2 h-1 w-28 rounded-full bg-yellow-400" />
          <p className="mt-4 max-w-2xl text-slate-600">
            Designed for internal housing operations with tools for both administrators and resident assistants.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              Scheduling
            </div>
            <h3 className="text-xl font-bold text-slate-900">Generate and manage term schedules</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Create labeled schedules, review fairness, apply availability rules, and manually adjust shifts in a calendar view.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              Housing
            </div>
            <h3 className="text-xl font-bold text-slate-900">Manage halls, assignments, and staffing</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Control residence hall capacity, staffing needs, and RA hall placement while enforcing assignment rules.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              RA Tools
            </div>
            <h3 className="text-xl font-bold text-slate-900">Availability and swap workflow</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              RAs can manage weekly availability, view hall-wide schedules, highlight their own shifts, and request or approve swaps.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}