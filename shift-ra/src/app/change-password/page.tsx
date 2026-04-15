"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, must_change_password")
        .eq("id", user.id)
        .single();

      if (!profile) {
        router.push("/login");
        return;
      }

      if (!profile.must_change_password) {
        router.push(profile.role === "admin" ? "/admin" : "/ra");
        return;
      }

      setChecking(false);
    }

    checkSession();
  }, [router]);

  async function handleChangePassword(e: React.FormEvent) {
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
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const { error: authError } = await supabase.auth.updateUser({
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id)
        .select("role")
        .single();

      if (profileError || !profile) {
        throw new Error(profileError?.message || "Failed to update profile.");
      }

      setMessage("Password updated successfully.");

      setTimeout(() => {
        router.push(profile.role === "admin" ? "/admin" : "/ra");
      }, 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to change password.");
    }

    setSaving(false);
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          Checking account...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white lg:flex">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
          <div className="relative flex w-full flex-col justify-center p-10">
            <div className="inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
              First Login Required
            </div>

            <h1 className="mt-6 text-5xl font-bold leading-tight">
              Set your
              <span className="block text-yellow-300">new password</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
              For security, you need to replace your temporary password before continuing.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                Change Password
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Set New Password</h2>
              <p className="mt-3 text-slate-600">
                You must do this before using the system.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
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
                {saving ? "Saving..." : "Update Password"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}