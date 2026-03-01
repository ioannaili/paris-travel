"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/app/components/bottom-nav";
import { Activity } from "@/app/activities/types";
import DiscoveryActivityCard from "@/app/activities/components/discovery-activity-card";

interface ActivitiesScreenResponse {
  activities: Activity[];
}

interface AddToVotingResponse {
  ok?: boolean;
  guest?: boolean;
  activity_id?: string;
  warning?: string;
  error?: string;
}

export default function ActivitiesClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [activities],
  );

  async function loadData() {
    setError(null);

    try {
      const activitiesRes = await fetch("/api/activities-screen", { cache: "no-store" });

      const activitiesData = activitiesRes.ok
        ? ((await activitiesRes.json()) as ActivitiesScreenResponse)
        : { activities: [] };

      setActivities(activitiesData.activities ?? []);

      if (!activitiesRes.ok) {
        setError("Could not load activities from server.");
      }
    } catch {
      setActivities([]);
      setError("Network issue while loading activities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadData();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addToVoting(activityId: string) {
    setAddingId(activityId);
    setError(null);

    try {
      const response = await fetch("/api/add-to-voting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activityId }),
      });

      const payload = (await response.json().catch(() => null)) as AddToVotingResponse | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to add activity to voting phase.");
        return;
      }

      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === activityId ? { ...activity, voting_phase: true } : activity,
        ),
      );

      if (payload?.warning) {
        setError(payload.warning);
      } else if (!payload?.guest) {
        await loadData();
      }
    } catch {
      setError("Network issue while adding to voting phase.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-36 pt-4">
      <header className="mb-4 rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
        <p className="text-sm text-[var(--text-soft)]">Paris Planner</p>
        <h1 className="text-3xl font-semibold leading-tight">Activities</h1>
        <p className="mt-1 text-sm text-[var(--text-soft)]">Discover activities and move them to Voting.</p>
      </header>

      {error && (
        <p className="mb-3 rounded-2xl bg-[var(--electric-rose)]/10 px-4 py-3 text-sm font-medium text-[var(--electric-rose)]">
          {error}
        </p>
      )}

      {loading && <p className="mb-3 text-sm font-medium text-[var(--text-soft)]">Refreshing...</p>}

      {!loading && (
        <section className="grid gap-4">
          {sortedActivities.length === 0 ? (
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
              <h2 className="text-lg font-semibold">No activities yet</h2>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                Add your first activity from the + button.
              </p>
            </article>
          ) : null}

          {sortedActivities.map((activity) => {
            return (
              <DiscoveryActivityCard
                key={activity.id}
                activity={activity}
                adding={addingId === activity.id}
                onAddToVoting={(activityId) => void addToVoting(activityId)}
              />
            );
          })}
        </section>
      )}

      <Link
        href="/add-activity"
        className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-[var(--sunset)] text-2xl font-semibold text-white shadow-md"
        aria-label="Add Activity"
      >
        +
      </Link>

      <BottomNav />
    </main>
  );
}
