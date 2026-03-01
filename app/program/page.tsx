import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import ProgramClient from "@/app/program/program-client";
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

export const dynamic = "force-dynamic";

export default async function ProgramPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: users, error: usersError }, { data: activities, error: activitiesError }] =
    await Promise.all([
      supabase.from("users").select("id, name").order("name", { ascending: true }),
      supabase
        .from("activities")
        .select("id, name, area, type, popularity, google_maps_link, voting_phase")
        .eq("voting_phase", true)
        .order("popularity", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  if (usersError || activitiesError) {
    return (
      <ProgramClient
        allUsersActivities={[]}
        personalActivities={[]}
        isVotingComplete={false}
        currentUserId={user.id}
      />
    );
  }

  const votingActivities = activities ?? [];
  const activityIds = votingActivities.map((activity) => activity.id);

  const { data: votes, error: votesError } =
    activityIds.length > 0
      ? await supabase
          .from("votes")
          .select("activity_id, user_id, vote, users(name)")
          .in("activity_id", activityIds)
      : { data: [], error: null };

  if (votesError) {
    return (
      <ProgramClient
        allUsersActivities={[]}
        personalActivities={[]}
        isVotingComplete={false}
        currentUserId={user.id}
      />
    );
  }

  const votesByActivity = new Map<
    string,
    Array<{ user_id: string; user_name: string; vote: VoteValue }>
  >();

  for (const voteRow of votes ?? []) {
    const joinedUser = Array.isArray(voteRow.users) ? voteRow.users[0] : voteRow.users;
    const current = votesByActivity.get(voteRow.activity_id) ?? [];
    current.push({
      user_id: voteRow.user_id,
      user_name: joinedUser?.name ?? "Unknown",
      vote: voteRow.vote,
    });
    votesByActivity.set(voteRow.activity_id, current);
  }

  const allUsersCount = (users ?? []).length;

  const enrichedActivities: ProgramActivity[] = votingActivities.map((activity) => {
    const activityVotes = votesByActivity.get(activity.id) ?? [];
    const sortedVotes = [...activityVotes].sort((a, b) => {
      const rank = { yes: 0, maybe: 1, no: 2 } as const;
      const rankDiff = rank[a.vote] - rank[b.vote];
      if (rankDiff !== 0) return rankDiff;
      return a.user_name.localeCompare(b.user_name);
    });

    return {
      id: activity.id,
      name: activity.name,
      area: activity.area,
      type: activity.type,
      popularity: activity.popularity ?? 0,
      google_maps_link: activity.google_maps_link,
      votes: sortedVotes,
    };
  });

  const isVotingComplete =
    enrichedActivities.length > 0 &&
    allUsersCount > 0 &&
    enrichedActivities.every((activity) => {
      const uniqueUserVotes = new Set(activity.votes.map((vote) => vote.user_id));
      return uniqueUserVotes.size === allUsersCount;
    });

  const allUsersActivities = enrichedActivities
    .filter((activity) => activity.votes.filter((vote) => vote.vote === "yes").length === allUsersCount)
    .sort((a, b) => b.popularity - a.popularity);

  const personalActivities = enrichedActivities
    .filter((activity) => activity.votes.some((vote) => vote.user_id === user.id && vote.vote === "yes"))
    .sort((a, b) => b.popularity - a.popularity);

  return (
    <ProgramClient
      allUsersActivities={allUsersActivities}
      personalActivities={personalActivities}
      isVotingComplete={isVotingComplete}
      currentUserId={user.id}
    />
  );
}
