export type VoteBucket = {
  user_id: string;
  name: string;
};

export type VoteValue = "yes" | "maybe" | "no";

export type VoteRow = {
  activity_id: string;
  user_id: string;
  vote: VoteValue;
  users: { name: string } | { name: string }[] | null;
};

export type ActivityRow = {
  id: string;
  name: string;
  description: string | null;
  area: string | null;
  type: string | null;
  duration: number | null;
  price: string | null;
  booking_required: boolean;
  booking_link: string | null;
  google_maps_link: string | null;
  source_type: string | null;
  notes?: string | null;
  popularity: number;
  voting_phase: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export function buildActivitiesScreenResponse(params: {
  profile: { id: string; name: string } | null;
  users: Array<{ id: string; name: string }>;
  fallbackUser?: { id: string; name: string };
  activities: ActivityRow[];
  votes: VoteRow[];
}) {
  const votesByActivity = new Map<string, { yes: VoteBucket[]; maybe: VoteBucket[]; no: VoteBucket[] }>();

  for (const vote of params.votes) {
    if (!votesByActivity.has(vote.activity_id)) {
      votesByActivity.set(vote.activity_id, { yes: [], maybe: [], no: [] });
    }

    const voteGroup = votesByActivity.get(vote.activity_id);
    if (!voteGroup) {
      continue;
    }

    const joinedUser = Array.isArray(vote.users) ? vote.users[0] : vote.users;

    voteGroup[vote.vote].push({
      user_id: vote.user_id,
      name: joinedUser?.name ?? "Unknown",
    });
  }

  const activities = params.activities.map((activity) => ({
    id: activity.id,
    name: activity.name,
    description: activity.description,
    area: activity.area,
    type: activity.type,
    duration: activity.duration,
    price: activity.price,
    booking_required: activity.booking_required,
    booking_link: activity.booking_link,
    google_maps_link: activity.google_maps_link,
    source_type: activity.source_type,
    notes: activity.notes,
    popularity: activity.popularity,
    voting_phase: activity.voting_phase,
    latitude: activity.latitude,
    longitude: activity.longitude,
    created_at: activity.created_at,
    votes: votesByActivity.get(activity.id) ?? { yes: [], maybe: [], no: [] },
  }));

  const votes: Record<string, { yes: VoteBucket[]; maybe: VoteBucket[]; no: VoteBucket[] }> = {};
  for (const [activityId, grouped] of votesByActivity.entries()) {
    votes[activityId] = grouped;
  }

  return {
    user: {
      id: params.profile?.id ?? params.fallbackUser?.id ?? "unknown",
      name: params.profile?.name ?? params.fallbackUser?.name ?? "Traveler",
    },
    users: params.users,
    activities,
    votes,
  };
}
