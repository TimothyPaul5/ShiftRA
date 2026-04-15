"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function initializeInvite() {
      try {
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const errorFromUrl = searchParams.get("error");

        if (errorFromUrl) {
          throw new Error(errorFromUrl);
        }

        if (!tokenHash || type !== "invite") {
          throw new Error("This invite link is invalid or missing required information.");
        }

        // Very important:
        // clear any currently logged-in session first so we do not overwrite
        // the password of whoever is already signed in.
        await supabase.auth.signOut();

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        if (error) {
          throw new Error(error.message);
        }

        setReady(true);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to verify invite.");
      }

      setInitializing(false);
    }

    initializeInvite();
  }, [searchParams]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Invite session not found. Please reopen the invite email.");
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      await supabase.auth.signOut();
      setMessage("Account setup complete. Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to set password.");
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white lg:flex">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
          <div className="relative flex w-full flex-col justify-center p-10">
            <div className="inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
              Account Setup
            </div>

            <h1 className="mt-6 text-5xl font-bold leading-tight">
              Accept your
              <span className="block text-yellow-300">invite</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Finish setting up your account by choosing a password.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                Accept Invite
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Set Your Password
              </h2>
              <p className="mt-3 text-slate-600">
                Choose a password to activate your account.
              </p>
            </div>

            {initializing ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Verifying invite link...
              </div>
            ) : !ready ? (
              <div className="space-y-4">
                {message ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {message}
                  </div>
                ) : null}

                <button
                  onClick={() => router.push("/login")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {message ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 transition hover:brightness-95 disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Set Password"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}