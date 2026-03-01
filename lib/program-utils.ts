import { Json, ProgramType, VoteValue } from "@/types/database";

export type ProgramTimeSlot = "morning" | "lunch" | "afternoon" | "dinner" | "evening";

export interface ProgramUser {
  id: string;
  name: string;
  avatar: string | null;
  vote: Extract<VoteValue, "yes" | "maybe">;
}

export interface ProgramActivity {
  id: string;
  name: string;
  area: string | null;
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ProgramItem {
  time: ProgramTimeSlot;
  activity: ProgramActivity;
  users: ProgramUser[];
}

export interface ProgramDay {
  day: number;
  date: string;
  items: ProgramItem[];
}

export interface ProgramJson {
  days: ProgramDay[];
}

export interface ProgramActivityInput {
  id: string;
  name: string;
  area: string | null;
  popularity: number;
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ProgramVoteInput {
  activity_id: string;
  user_id: string;
  vote: VoteValue;
}

export interface ProgramUserInput {
  id: string;
  name: string;
  avatar?: string | null;
}

const TRIP_DATES = [
  "2026-03-19",
  "2026-03-20",
  "2026-03-21",
  "2026-03-22",
  "2026-03-23",
];

const TIME_SLOTS: ProgramTimeSlot[] = ["morning", "lunch", "afternoon", "dinner", "evening"];

const MAX_ACTIVITIES_PER_DAY = 5;

export function buildProgramFromVotes({
  activities,
  votes,
  users,
  programType,
}: {
  activities: ProgramActivityInput[];
  votes: ProgramVoteInput[];
  users: ProgramUserInput[];
  programType: ProgramType;
}): ProgramJson {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const votesByActivity = new Map<string, ProgramVoteInput[]>();

  for (const vote of votes) {
    const current = votesByActivity.get(vote.activity_id) ?? [];
    current.push(vote);
    votesByActivity.set(vote.activity_id, current);
  }

  const eligibleActivities = activities
    .filter((activity) => {
      const activityVotes = votesByActivity.get(activity.id) ?? [];
      const yesCount = activityVotes.filter((vote) => vote.vote === "yes").length;
      return yesCount >= 2;
    })
    .sort((a, b) => b.popularity - a.popularity);

  const dayBuckets: ProgramItem[][] = Array.from({ length: TRIP_DATES.length }, () => []);

  for (let idx = 0; idx < eligibleActivities.length; idx += 1) {
    const activity = eligibleActivities[idx];
    const dayIndex = idx % TRIP_DATES.length;
    const currentDayItems = dayBuckets[dayIndex];

    if (currentDayItems.length >= MAX_ACTIVITIES_PER_DAY) {
      continue;
    }

    const slot = TIME_SLOTS[currentDayItems.length];
    if (!slot) {
      continue;
    }

    const rawVotes = votesByActivity.get(activity.id) ?? [];
    const relevantVotes =
      programType === "general"
        ? rawVotes.filter((vote) => vote.vote === "yes")
        : rawVotes.filter((vote) => vote.vote === "yes" || vote.vote === "maybe");

    const usersForActivity = relevantVotes
      .map((vote) => {
        const user = usersById.get(vote.user_id);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar ?? null,
          vote: vote.vote as Extract<VoteValue, "yes" | "maybe">,
        };
      })
      .filter((user): user is ProgramUser => user !== null)
      .sort((a, b) => {
        if (a.vote !== b.vote) {
          return a.vote === "yes" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    currentDayItems.push({
      time: slot,
      activity: {
        id: activity.id,
        name: activity.name,
        area: activity.area,
        google_maps_link: activity.google_maps_link,
        latitude: activity.latitude,
        longitude: activity.longitude,
      },
      users: usersForActivity,
    });
  }

  return {
    days: TRIP_DATES.map((date, index) => ({
      day: index + 1,
      date,
      items: dayBuckets[index],
    })),
  };
}

export function normalizeProgramJson(value: Json | null | undefined): ProgramJson | null {
  if (!value || typeof value !== "object" || !("days" in value)) {
    return null;
  }

  const days = (value as { days?: unknown }).days;
  if (!Array.isArray(days)) {
    return null;
  }

  const parsedDays: ProgramDay[] = [];

  for (const day of days) {
    if (!day || typeof day !== "object") continue;

    const maybeDay = day as {
      day?: unknown;
      date?: unknown;
      items?: unknown;
    };

    if (typeof maybeDay.day !== "number" || typeof maybeDay.date !== "string") continue;
    if (!Array.isArray(maybeDay.items)) continue;

    const parsedItems: ProgramItem[] = [];

    for (const item of maybeDay.items) {
      if (!item || typeof item !== "object") continue;

      const maybeItem = item as {
        time?: unknown;
        activity?: unknown;
        users?: unknown;
      };

      if (typeof maybeItem.time !== "string") continue;
      if (!TIME_SLOTS.includes(maybeItem.time as ProgramTimeSlot)) continue;
      if (!maybeItem.activity || typeof maybeItem.activity !== "object") continue;
      if (!Array.isArray(maybeItem.users)) continue;

      const maybeActivity = maybeItem.activity as {
        id?: unknown;
        name?: unknown;
        area?: unknown;
        google_maps_link?: unknown;
        latitude?: unknown;
        longitude?: unknown;
      };

      if (typeof maybeActivity.id !== "string" || typeof maybeActivity.name !== "string") continue;

      const users: ProgramUser[] = [];
      for (const user of maybeItem.users) {
        if (!user || typeof user !== "object") continue;
        const maybeUser = user as {
          id?: unknown;
          name?: unknown;
          avatar?: unknown;
          vote?: unknown;
        };

        if (typeof maybeUser.id !== "string" || typeof maybeUser.name !== "string") continue;
        if (maybeUser.vote !== "yes" && maybeUser.vote !== "maybe") continue;

        users.push({
          id: maybeUser.id,
          name: maybeUser.name,
          avatar: typeof maybeUser.avatar === "string" ? maybeUser.avatar : null,
          vote: maybeUser.vote,
        });
      }

      parsedItems.push({
        time: maybeItem.time as ProgramTimeSlot,
        activity: {
          id: maybeActivity.id,
          name: maybeActivity.name,
          area: typeof maybeActivity.area === "string" ? maybeActivity.area : null,
          google_maps_link:
            typeof maybeActivity.google_maps_link === "string" ? maybeActivity.google_maps_link : null,
          latitude: typeof maybeActivity.latitude === "number" ? maybeActivity.latitude : null,
          longitude: typeof maybeActivity.longitude === "number" ? maybeActivity.longitude : null,
        },
        users,
      });
    }

    parsedDays.push({
      day: maybeDay.day,
      date: maybeDay.date,
      items: parsedItems,
    });
  }

  if (parsedDays.length === 0) {
    return null;
  }

  return { days: parsedDays };
}
