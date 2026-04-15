"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { supabase } from "@/lib/supabase";
import { Profile, ResidenceHall } from "@/lib/types";

type DeleteBlockState = {
  title: string;
  description: string;
};

type PasswordResetRequestRow = {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [halls, setHalls] = useState<ResidenceHall[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequestRow[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [role, setRole] = useState<"admin" | "ra">("ra");
  const [residenceHallId, setResidenceHallId] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleteBlockedModal, setDeleteBlockedModal] = useState<DeleteBlockState | null>(null);

  const [resetModal, setResetModal] = useState<{
    userId: string;
    requestId?: number;
    fullName: string;
  } | null>(null);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState("");

  useEffect(() => {
    async function checkAdminAndLoad() {
      const result = await getCurrentProfile();

      if (result.error || !result.profile || result.profile.role !== "admin") {
        router.push("/login");
        return;
      }

      await loadData();
    }

    checkAdminAndLoad();
  }, [router]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [
      { data: profileData, error: profileError },
      { data: hallData, error: hallError },
      { data: resetData, error: resetError },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name", { ascending: true }),
      supabase.from("residence_halls").select("*").order("name", { ascending: true }),
      supabase
        .from("password_reset_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (hallError) {
      setMessage(hallError.message);
      setLoading(false);
      return;
    }

    if (resetError) {
      setMessage(resetError.message);
      setLoading(false);
      return;
    }

    setProfiles((profileData || []) as Profile[]);
    setHalls((hallData || []) as ResidenceHall[]);
    setResetRequests((resetData || []) as PasswordResetRequestRow[]);
    setLoading(false);
  }

  function getHallName(hallId: number | null) {
    if (!hallId) return "Unassigned";
    return halls.find((hall) => hall.id === hallId)?.name || "Unknown Hall";
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          password: temporaryPassword,
          full_name: fullName,
          role,
          residence_hall_id: role === "ra" && residenceHallId ? Number(residenceHallId) : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user.");
      }

      setFullName("");
      setEmail("");
      setTemporaryPassword("");
      setRole("ra");
      setResidenceHallId("");
      setMessage("User created with a temporary password.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create user.");
    }

    setSaving(false);
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch(`/api/admin/delete-user?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "USER_HAS_SCHEDULES") {
          setDeleteTarget(null);
          setDeleteBlockedModal({
            title: "User Cannot Be Deleted",
            description:
              "This user still has scheduled shifts. Remove or clear those shifts from the schedule first, then try deleting the user again.",
          });
          return;
        }

        throw new Error(result.error || "Failed to delete user.");
      }

      setMessage("User deleted.");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete user.");
    }

    setDeletingId(null);
  }

  async function handleAdminPasswordReset() {
    if (!resetModal) return;

    setResettingUserId(resetModal.userId);
    setMessage("");

    try {
      if (newTemporaryPassword.length < 6) {
        throw new Error("Temporary password must be at least 6 characters long.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("/api/admin/reset-user-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: resetModal.userId,
          requestId: resetModal.requestId,
          temporaryPassword: newTemporaryPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reset password.");
      }

      setMessage("Temporary password set successfully.");
      setResetModal(null);
      setNewTemporaryPassword("");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to reset password.");
    }

    setResettingUserId(null);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
                User Administration
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Manage Users</h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                Create users with temporary passwords, review reset requests, and manage existing accounts.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin")}
              className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 transition hover:brightness-95"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
            {message}
          </div>
        ) : null}

        <div className="grid gap-8">
          <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Create User</h2>
                <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
              </div>

              <form onSubmit={handleCreateUser} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Temporary Password</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "ra")}
                  >
                    <option value="ra">RA</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {role === "ra" ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Residence Hall</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={residenceHallId}
                      onChange={(e) => setResidenceHallId(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {halls.map((hall) => (
                        <option key={hall.id} value={hall.id}>
                          {hall.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 transition hover:brightness-95 disabled:opacity-70"
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Current Users</h2>
                <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
              </div>

              {loading ? (
                <p className="text-slate-600">Loading users...</p>
              ) : profiles.length === 0 ? (
                <p className="text-slate-600">No users found.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="mb-2 inline-flex rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                        {profile.role.toUpperCase()}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{profile.full_name}</h3>
                      <p className="mt-2 text-sm text-slate-600">{profile.email}</p>
                      <div className="mt-4 space-y-1 text-sm text-slate-700">
                        <p>Hall: {profile.role === "ra" ? getHallName(profile.residence_hall_id) : "N/A"}</p>
                        <p>Must Change Password: {profile.must_change_password ? "Yes" : "No"}</p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() =>
                            setResetModal({
                              userId: profile.id,
                              fullName: profile.full_name,
                            })
                          }
                          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Set Temp Password
                        </button>

                        <button
                          onClick={() => setDeleteTarget(profile)}
                          disabled={deletingId === profile.id}
                          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
                        >
                          {deletingId === profile.id ? "Deleting..." : "Delete User"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Password Reset Requests</h2>
              <div className="mt-2 h-1 w-20 rounded-full bg-yellow-400" />
            </div>

            {loading ? (
              <p className="text-slate-600">Loading requests...</p>
            ) : resetRequests.length === 0 ? (
              <p className="text-slate-600">No reset requests found.</p>
            ) : (
              <div className="space-y-4">
                {resetRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-lg font-bold text-slate-900">{request.full_name}</div>
                        <div className="text-sm text-slate-600">{request.email}</div>
                        <div className="mt-2 text-sm text-slate-700">
                          Status: {request.status}
                        </div>
                        <div className="text-sm text-slate-500">
                          Requested: {new Date(request.created_at).toLocaleString()}
                        </div>
                      </div>

                      {request.status === "pending" ? (
                        <button
                          onClick={() =>
                            setResetModal({
                              userId: request.user_id,
                              requestId: request.id,
                              fullName: request.full_name,
                            })
                          }
                          className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
                        >
                          Set Temp Password
                        </button>
                      ) : (
                        <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
              Confirm Delete
            </div>

            <h2 className="text-2xl font-bold text-slate-900">Delete User?</h2>
            <p className="mt-3 text-slate-600">
              This will delete <span className="font-semibold text-slate-900">{deleteTarget.full_name}</span>.
              This cannot be undone from the app.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={confirmDeleteUser}
                disabled={deletingId === deleteTarget.id}
                className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 disabled:opacity-70"
              >
                {deletingId === deleteTarget.id ? "Deleting..." : "Yes, Delete"}
              </button>

              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteBlockedModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
              Delete Blocked
            </div>

            <h2 className="text-2xl font-bold text-slate-900">{deleteBlockedModal.title}</h2>
            <p className="mt-3 text-slate-600">{deleteBlockedModal.description}</p>

            <div className="mt-6">
              <button
                onClick={() => setDeleteBlockedModal(null)}
                className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700">
              Temporary Password
            </div>

            <h2 className="text-2xl font-bold text-slate-900">Set Temporary Password</h2>
            <p className="mt-3 text-slate-600">
              Set a new temporary password for{" "}
              <span className="font-semibold text-slate-900">{resetModal.fullName}</span>.
              They will be forced to change it on next login.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Temporary Password
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                value={newTemporaryPassword}
                onChange={(e) => setNewTemporaryPassword(e.target.value)}
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAdminPasswordReset}
                disabled={resettingUserId === resetModal.userId}
                className="rounded-xl border border-yellow-400/40 bg-yellow-400 px-5 py-3 font-semibold text-blue-950 disabled:opacity-70"
              >
                {resettingUserId === resetModal.userId ? "Saving..." : "Save Temp Password"}
              </button>

              <button
                onClick={() => {
                  setResetModal(null);
                  setNewTemporaryPassword("");
                }}
                disabled={resettingUserId === resetModal.userId}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}