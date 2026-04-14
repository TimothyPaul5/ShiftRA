import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-xl">
        <h1 className="text-5xl font-bold">Shift RA</h1>
        <p className="mt-4 text-lg">
          Residence hall scheduling system for admins and RAs.
        </p>

        <div className="mt-8">
          <Link
            href="/login"
            className="inline-block rounded-lg border px-6 py-3 font-medium"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </main>
  );
}