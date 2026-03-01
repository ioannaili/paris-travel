import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { buildActivitiesScreenResponse, type ActivityRow, type VoteRow } from "@/lib/activities-screen";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    const now = new Date().toISOString();
    return NextResponse.json({
      user: { id: "guest", name: "Guest" },
      users: [],
      activities: [
        {
          id: "guest-1",
          created_at: now,
          name: "Luxembourg Gardens Walk",
          description: "Relaxed morning walk with coffee nearby.",
          area: "Latin Quarter",
          type: "neighborhood walk",
          duration: 75,
          price: "Free",
          booking_required: false,
          booking_link: null,
          google_maps_link: "https://maps.google.com/?q=Jardin+du+Luxembourg",
          source_type: "manual",
          notes: null,
          popularity: 1,
          voting_phase: false,
          votes: { yes: [], maybe: [], no: [] },
        },
        {
          id: "guest-2",
          created_at: now,
          name: "Le Marais Cafe Stop",
          description: "Coffee break before exploring vintage shops.",
          area: "Le Marais",
          type: "cafe",
          duration: 60,
          price: "€€",
          booking_required: false,
          booking_link: null,
          google_maps_link: "https://maps.google.com/?q=Le+Marais+Paris",
          source_type: "manual",
          notes: null,
          popularity: 1,
          voting_phase: true,
          votes: { yes: [], maybe: [], no: [] },
        },
      ],
      votes: {},
    });
  }

  const [activitiesResult, votesResult, profileResult, usersResult] = await Promise.all([
    supabase.from("activities").select("*").order("created_at", { ascending: false }),
    supabase.from("votes").select("activity_id, user_id, vote, users(name)"),
    supabase.from("users").select("id, name").eq("id", user.id).maybeSingle(),
    supabase.from("users").select("id, name").order("name", { ascending: true }),
  ]);

  if (activitiesResult.error) {
    return NextResponse.json(
      buildActivitiesScreenResponse({
        profile: null,
        users: [],
        fallbackUser: {
          id: user.id,
          name: user.email?.split("@")[0] ?? "Traveler",
        },
        activities: [],
        votes: [],
      }),
    );
  }

  return NextResponse.json(
    buildActivitiesScreenResponse({
      profile: profileResult.error ? null : (profileResult.data ?? null),
      users: usersResult.error ? [] : (usersResult.data ?? []),
      fallbackUser: {
        id: user.id,
        name: user.email?.split("@")[0] ?? "Traveler",
      },
      activities: (activitiesResult.data ?? []) as ActivityRow[],
      votes: (votesResult.error ? [] : (votesResult.data ?? [])) as VoteRow[],
    }),
  );
}
