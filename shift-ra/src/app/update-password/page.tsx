"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (!code) {
          setMessage("This password reset link is missing its recovery code.");
          setInitializing(false);
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw new Error(error.message);
        }

        setReady(true);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to initialize password reset session."
        );
      }

      setInitializing(false);
    }

    initRecoverySession();
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
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

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessage("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update password."
      );
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
              Account Security
            </div>

            <h1 className="mt-6 text-5xl font-bold leading-tight">
              Create a new
              <span className="block text-yellow-300">password</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Choose a new password to restore access to your account.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                Update Password
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Set New Password
              </h2>
              <p className="mt-3 text-slate-600">
                Enter your new password below.
              </p>
            </div>

            {initializing ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Verifying reset link...
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
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    New Password
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
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}