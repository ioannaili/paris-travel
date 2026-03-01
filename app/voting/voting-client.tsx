"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/app/components/bottom-nav";
import VoteButtons from "@/app/activities/components/vote-buttons";
import { Activity, VoteRow, VoteValue } from "@/app/activities/types";

interface ActivitiesScreenResponse {
  user: { id: string; name: string };
  users: Array<{ id: string; name: string }>;
  activities: Activity[];
  votes: Record<
    string,
    {
      yes: Array<{ user_id?: string; name?: string }>;
      maybe: Array<{ user_id?: string; name?: string }>;
      no: Array<{ user_id?: string; name?: string }>;
    }
  >;
}

const voteRank: Record<VoteValue, number> = {
  yes: 0,
  maybe: 1,
  no: 2,
};

export default function VotingClient({
  userId,
  initialUserName,
}: {
  userId: string;
  initialUserName: string;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [voteRows, setVoteRows] = useState<VoteRow[]>([]);
  const [currentUserName, setCurrentUserName] = useState(initialUserName);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);

  const votesByActivity = useMemo(() => {
    const grouped: Record<string, VoteRow[]> = {};
    for (const row of voteRows) {
      if (!grouped[row.activity_id]) {
        grouped[row.activity_id] = [];
      }
      grouped[row.activity_id].push(row);
    }

    for (const activityId of Object.keys(grouped)) {
      grouped[activityId].sort((a, b) => {
        const rankDiff = voteRank[a.vote] - voteRank[b.vote];
        if (rankDiff !== 0) return rankDiff;
        return a.user_name.localeCompare(b.user_name);
      });
    }

    return grouped;
  }, [voteRows]);

  const currentVotesByActivity = useMemo(() => {
    const ownVotes: Record<string, VoteValue> = {};
    voteRows.forEach((vote) => {
      if (vote.user_id === userId) {
        ownVotes[vote.activity_id] = vote.vote;
      }
    });
    return ownVotes;
  }, [voteRows, userId]);

  const votingActivities = useMemo(
    () => activities.filter((activity) => activity.voting_phase === true),
    [activities],
  );

  const sortedActivities = useMemo(() => {
    return [...votingActivities].sort((a, b) => {
      const aVotedByCurrent = currentVotesByActivity[a.id] ? 1 : 0;
      const bVotedByCurrent = currentVotesByActivity[b.id] ? 1 : 0;
      if (aVotedByCurrent !== bVotedByCurrent) {
        return aVotedByCurrent - bVotedByCurrent;
      }

      const aComplete = (votesByActivity[a.id]?.length ?? 0) >= allUsers.length && allUsers.length > 0 ? 1 : 0;
      const bComplete = (votesByActivity[b.id]?.length ?? 0) >= allUsers.length && allUsers.length > 0 ? 1 : 0;
      if (aComplete !== bComplete) {
        return aComplete - bComplete;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [votingActivities, currentVotesByActivity, votesByActivity, allUsers.length]);

  const loadData = useCallback(async () => {
    setError(null);

    try {
      const screenRes = await fetch("/api/activities-screen", { cache: "no-store" });

      const screenData = screenRes.ok
        ? ((await screenRes.json()) as ActivitiesScreenResponse)
        : ({ user: { id: userId, name: initialUserName }, users: [], activities: [], votes: {} } as ActivitiesScreenResponse);

      const nextVoteRows: VoteRow[] = [];

      for (const activity of screenData.activities) {
        const groupedVotes = screenData.votes[activity.id] ?? { yes: [], maybe: [], no: [] };

        groupedVotes.yes.forEach((vote) => {
          nextVoteRows.push({
            activity_id: activity.id,
            user_id: vote.user_id ?? vote.name ?? "unknown",
            vote: "yes",
            user_name: vote.name ?? "Unknown",
          });
        });

        groupedVotes.maybe.forEach((vote) => {
          nextVoteRows.push({
            activity_id: activity.id,
            user_id: vote.user_id ?? vote.name ?? "unknown",
            vote: "maybe",
            user_name: vote.name ?? "Unknown",
          });
        });

        groupedVotes.no.forEach((vote) => {
          nextVoteRows.push({
            activity_id: activity.id,
            user_id: vote.user_id ?? vote.name ?? "unknown",
            vote: "no",
            user_name: vote.name ?? "Unknown",
          });
        });
      }

      setActivities(screenData.activities ?? []);
      setVoteRows(nextVoteRows);
      setAllUsers(screenData.users ?? []);
      setCurrentUserName(screenData.user?.name ?? initialUserName);

      if (!screenRes.ok) {
        setError("Could not load voting data from server.");
      }
    } catch {
      setActivities([]);
      setVoteRows([]);
      setAllUsers([]);
      setError("Network issue while loading voting data.");
    } finally {
      setLoading(false);
    }
  }, [initialUserName, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadData]);

  async function submitVote(activityId: string, vote: VoteValue) {
    setVoteLoadingId(activityId);
    setError(null);

    const previousRows = voteRows;

    setVoteRows((prev) => {
      const withoutCurrent = prev.filter(
        (item) => !(item.activity_id === activityId && item.user_id === userId),
      );

      return [
        ...withoutCurrent,
        { activity_id: activityId, user_id: userId, vote, user_name: currentUserName },
      ];
    });

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activityId, vote }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setVoteRows(previousRows);
        setError(payload?.error ?? "Failed to save vote.");
        return;
      }

      await loadData();
    } catch {
      setVoteRows(previousRows);
      setError("Network issue while saving vote.");
    } finally {
      setVoteLoadingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="mb-4 rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
        <h1 className="text-3xl font-semibold leading-tight">Voting Phase</h1>
        <p className="mt-1 text-sm text-[var(--text-soft)]">
          {votingActivities.length} Activities in Voting
        </p>
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
              <h2 className="text-lg font-semibold">No activities in voting yet</h2>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                Open Activities and add items to voting.
              </p>
            </article>
          ) : null}

          {sortedActivities.map((activity) => {
            const usersVotes = votesByActivity[activity.id] ?? [];
            const votedUserIds = new Set(usersVotes.map((row) => row.user_id));
            const missingUsers = allUsers.filter((user) => !votedUserIds.has(user.id));
            const isComplete = allUsers.length > 0 && usersVotes.length >= allUsers.length;

            return (
              <article key={activity.id} className="rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
                <h2 className="text-xl font-semibold leading-tight">{activity.name}</h2>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {activity.area || "Unknown area"} • {activity.type || "other"}
                </p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  {activity.description || "No description"}
                </p>

                <div className="mt-3 rounded-2xl bg-[var(--bg-main)] p-3 text-sm">
                  <p className="font-semibold text-[var(--text-main)]">
                    Votes: {usersVotes.length} / {allUsers.length} users voted
                  </p>

                  {isComplete ? (
                    <p className="mt-1 font-semibold text-[var(--sky-blue)]">Voting Complete</p>
                  ) : missingUsers.length > 0 ? (
                    <div className="mt-1">
                      <p className="font-medium text-[var(--text-soft)]">Waiting:</p>
                      <div className="mt-1 grid gap-1 text-[var(--text-soft)]">
                        {missingUsers.map((user) => (
                          <p key={user.id}>{user.name}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-2xl bg-[var(--bg-main)] p-3 text-sm">
                  {usersVotes.length === 0 ? (
                    <p className="text-[var(--text-soft)]">No votes yet</p>
                  ) : (
                    <div className="grid gap-1">
                      {usersVotes.map((vote, index) => (
                        <p key={`${vote.user_id}-${index}`} className="text-[var(--text-main)]">
                          {vote.user_name} {vote.vote.toUpperCase()}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {activity.google_maps_link ? (
                    <a
                      href={activity.google_maps_link}
                      target="_blank"
                      rel="noreferrer"
                      className="grid min-h-12 place-items-center rounded-full bg-[var(--aqua)] px-4 text-sm font-semibold text-[var(--text-main)]"
                    >
                      Open Maps
                    </a>
                  ) : null}
                </div>

                <div className="mt-3">
                  <VoteButtons
                    selectedVote={currentVotesByActivity[activity.id]}
                    disabled={voteLoadingId === activity.id}
                    onVote={(vote) => void submitVote(activity.id, vote)}
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}

      <BottomNav />
    </main>
  );
}
