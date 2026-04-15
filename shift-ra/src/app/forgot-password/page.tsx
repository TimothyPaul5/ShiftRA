"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/ra/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit reset request.");
      }

      setMessage(
        "If that account exists, a password reset request has been submitted for admin review."
      );
      setEmail("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit request.");
    }

    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white lg:flex">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
          <div className="relative flex w-full flex-col justify-center p-10">
            <div className="inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
              Account Recovery
            </div>

            <h1 className="mt-6 text-5xl font-bold leading-tight">
              Request a
              <span className="block text-yellow-300">password reset</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Enter your account email and an admin can assign you a new temporary password.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
                Password Recovery
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Request Reset</h2>
              <p className="mt-3 text-slate-600">
                Submit your email and an admin will issue a new temporary password.
              </p>
            </div>

            <form onSubmit={handleRequest} className="space-y-5">
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

              {message ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 transition hover:brightness-95 disabled:opacity-70"
              >
                {submitting ? "Submitting..." : "Submit Reset Request"}
              </button>
            </form>

            <button
              onClick={() => router.push("/login")}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Login
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}