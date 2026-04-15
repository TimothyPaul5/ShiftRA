"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Login succeeded, but user was not found.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, must_change_password")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Could not load user profile.");
      }

      if (profile.must_change_password) {
        router.push("/change-password");
        return;
      }

      if (profile.role === "admin") {
        router.push("/admin");
        return;
      }

      if (profile.role === "ra") {
        router.push("/ra");
        return;
      }

      throw new Error("Unknown user role.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white lg:flex">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
          <div className="relative flex w-full flex-col justify-between p-10">
            <div>
              <div className="inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                Campus Operations System
              </div>

              <h1 className="mt-6 text-5xl font-bold leading-tight">
                Sign in to manage
                <span className="block text-yellow-300">housing operations</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
                Access scheduling, availability, hall assignments, calendar editing,
                and shift swap workflows in one place.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="text-sm uppercase tracking-wide text-blue-200">Scheduling</div>
                <div className="mt-2 text-2xl font-semibold">Labeled Terms & Live Edits</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="text-sm uppercase tracking-wide text-blue-200">Account Access</div>
                <div className="mt-2 text-2xl font-semibold">Manual Password Recovery</div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                Secure Access
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Login</h2>
              <p className="mt-3 text-slate-600">
                Sign in with your assigned account to access the system.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.edu"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {message ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>

              <button
                onClick={() => router.push("/forgot-password")}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Request Password Reset
              </button>

              <button
                onClick={() => router.push("/")}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Home
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}