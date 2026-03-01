"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/app/components/bottom-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function ProfileClient({ name }: { name: string }) {
  const router = useRouter();
  const [freeTime, setFreeTime] = useState<"YES" | "NO">(() => {
    if (typeof window === "undefined") {
      return "YES";
    }
    const saved = window.localStorage.getItem("free-time-preference");
    if (saved === "YES" || saved === "NO") {
      return saved;
    }
    return "YES";
  });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("free-time-preference", freeTime);
  }, [freeTime]);

  async function logout() {
    setLoggingOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="mb-4 rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
        <p className="text-sm text-[var(--text-soft)]">Profile</p>
        <h1 className="text-3xl font-semibold leading-tight">{name}</h1>
      </header>

      <section className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Free Time Preference</h2>
        <p className="mt-1 text-sm text-[var(--text-soft)]">Include &quot;Ελεύθερος χρόνος&quot; blocks in generated program.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFreeTime("YES")}
            className={[
              "min-h-12 rounded-full text-sm font-semibold",
              freeTime === "YES"
                ? "bg-[var(--lime)] text-[var(--text-main)]"
                : "bg-[var(--bg-main)] text-[var(--text-soft)]",
            ].join(" ")}
          >
            YES
          </button>
          <button
            type="button"
            onClick={() => setFreeTime("NO")}
            className={[
              "min-h-12 rounded-full text-sm font-semibold",
              freeTime === "NO"
                ? "bg-[var(--light-purple)] text-[var(--text-main)]"
                : "bg-[var(--bg-main)] text-[var(--text-soft)]",
            ].join(" ")}
          >
            NO
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void logout()}
        disabled={loggingOut}
        className="mt-4 w-full min-h-12 rounded-full bg-[var(--sunset)] px-4 text-sm font-semibold text-white"
      >
        {loggingOut ? "Signing out..." : "Logout"}
      </button>

      <BottomNav />
    </main>
  );
}
