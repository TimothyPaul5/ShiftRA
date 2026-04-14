"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Hall = {
  id: number;
  name: string;
  capacity: number;
};

export default function Home() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadHalls() {
      const { data, error } = await supabase
        .from("residence_halls")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        const details = [
          `message: ${error.message ?? "none"}`,
          `details: ${error.details ?? "none"}`,
          `hint: ${error.hint ?? "none"}`,
          `code: ${error.code ?? "none"}`
        ].join(" | ");

        console.log("SUPABASE ERROR:", details);
        setErrorText(details);
      } else {
        setHalls(data || []);
      }

      setLoading(false);
    }

    loadHalls();
  }, []);

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-4xl font-bold mb-4">Shift RA</h1>
      <p className="mb-6">Supabase connection test</p>

      {loading ? (
        <p>Loading halls...</p>
      ) : errorText ? (
        <div className="border border-red-500 rounded p-4">
          <p className="font-semibold text-red-600 mb-2">Error loading halls:</p>
          <p>{errorText}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-semibold mb-3">Residence Halls</h2>
          {halls.length === 0 ? (
            <p>No halls found.</p>
          ) : (
            <ul className="space-y-2">
              {halls.map((hall) => (
                <li key={hall.id} className="border rounded p-3">
                  <strong>{hall.name}</strong> — Capacity: {hall.capacity}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}