"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BottomNav from "@/app/components/bottom-nav";
import { VoteValue } from "@/app/activities/types";

type ProgramActivity = {
  id: string;
  name: string;
  area: string | null;
  type: string | null;
  popularity: number;
  google_maps_link: string | null;
  votes: Array<{ user_id: string; user_name: string; vote: VoteValue }>;
};

export default function ProgramClient({
  allUsersActivities,
  personalActivities,
  isVotingComplete,
  currentUserId,
}: {
  allUsersActivities: ProgramActivity[];
  personalActivities: ProgramActivity[];
  isVotingComplete: boolean;
  currentUserId: string;
}) {
  const [mode, setMode] = useState<"all" | "personal">("all");

  const shownActivities = useMemo(
    () => (mode === "all" ? allUsersActivities : personalActivities),
    [mode, allUsersActivities, personalActivities],
  );

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="mb-4 rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
        <h1 className="text-3xl font-semibold leading-tight">Program</h1>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--bg-main)] p-1">
          <button
            type="button"
            onClick={() => setMode("all")}
            className={[
              "min-h-12 rounded-xl px-3 text-sm font-semibold",
              mode === "all"
                ? "bg-[var(--light-purple)] text-[var(--text-main)]"
                : "bg-transparent text-[var(--text-soft)]",
            ].join(" ")}
          >
            All Users
          </button>
          <button
            type="button"
            onClick={() => setMode("personal")}
            className={[
              "min-h-12 rounded-xl px-3 text-sm font-semibold",
              mode === "personal"
                ? "bg-[var(--light-purple)] text-[var(--text-main)]"
                : "bg-transparent text-[var(--text-soft)]",
            ].join(" ")}
          >
            Personal
          </button>
        </div>
      </header>

      {!isVotingComplete ? (
        <section className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-sm font-medium text-[var(--text-main)]">Voting not finished yet.</p>
          <Link
            href="/voting"
            className="mt-3 inline-grid min-h-12 place-items-center rounded-full bg-[var(--sunset)] px-5 text-sm font-semibold text-white"
          >
            Go to Voting
          </Link>
        </section>
      ) : (
        <section className="grid gap-4">
          {shownActivities.length === 0 ? (
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
              <p className="text-sm text-[var(--text-soft)]">
                {mode === "all"
                  ? "No activities agreed yet."
                  : "You have no YES votes yet."}
              </p>
            </article>
          ) : (
            shownActivities.map((activity) => (
              <article key={activity.id} className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
                <h2 className="text-xl font-semibold leading-tight">{activity.name}</h2>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {activity.area || "Unknown area"} • {activity.type || "other"}
                </p>

                <div className="mt-3 rounded-2xl bg-[var(--bg-main)] p-3 text-sm">
                  <div className="grid gap-1">
                    {activity.votes.map((vote, index) => {
                      const isCurrent = vote.user_id === currentUserId;
                      return (
                        <p key={`${vote.user_id}-${index}`} className={isCurrent ? "font-semibold text-[var(--text-main)]" : "text-[var(--text-main)]"}>
                          {vote.user_name} {vote.vote.toUpperCase()}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {activity.google_maps_link ? (
                  <a
                    href={activity.google_maps_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-grid min-h-12 place-items-center rounded-full bg-[var(--aqua)] px-4 text-sm font-semibold text-[var(--text-main)]"
                  >
                    Open Maps
                  </a>
                ) : null}
              </article>
            ))
          )}
        </section>
      )}

      <BottomNav />
    </main>
  );
}
