"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const USERNAME_TO_EMAIL: Record<string, string> = {
  eva: "evafelek@gmail.com",
  evafelek: "evafelek@gmail.com",
  ioanna: "ioanna@parisplanner.com",
  marilena: "marilena@parisplanner.com",
  katerina: "katerina@parisplanner.com",
  charoula: "charoula@parisplanner.com",
};

function resolveLoginEmail(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  return USERNAME_TO_EMAIL[normalized] ?? `${normalized}@parisplanner.com`;
}

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const email = resolveLoginEmail(username);
      const loginResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginResult.error) {
        setLoading(false);
        setError(loginResult.error.message);
        return;
      }

      const sessionResult = await supabase.auth.getSession();
      if (!sessionResult.data.session) {
        setLoading(false);
        setError("Login succeeded but session is not ready. Please try again.");
        return;
      }

      window.location.assign("/activities");
      setLoading(false);
    } catch {
      setLoading(false);
      setError(
        "Supabase config missing or invalid. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      );
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center px-4 py-6">
      <section className="rounded-3xl bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-6">
          <p className="inline-flex rounded-full bg-[var(--aqua)] px-4 py-2 text-xs font-semibold text-[var(--text-main)]">
            Paris Planner
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label htmlFor="username" className="text-sm font-semibold">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="min-h-12 rounded-2xl border-0 bg-[var(--bg-main)] px-4"
          />

          <label htmlFor="password" className="text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 rounded-2xl border-0 bg-[var(--bg-main)] px-4"
          />

          {error && (
            <p className="rounded-2xl bg-[var(--electric-rose)]/10 px-4 py-3 text-sm font-medium text-[var(--electric-rose)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 min-h-12 rounded-full bg-[var(--sunset)] px-6 font-semibold text-white"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
