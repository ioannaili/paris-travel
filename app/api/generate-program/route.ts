import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { buildProgramFromVotes } from "@/lib/program-utils";
import { ProgramType } from "@/types/database";

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as { program_type?: ProgramType };
  const programType = body?.program_type ?? "general";

  if (programType !== "general" && programType !== "user_based") {
    return NextResponse.json(
      { error: "Invalid program_type. Allowed values: general, user_based" },
      { status: 400 },
    );
  }

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, name, area, popularity, google_maps_link, latitude, longitude")
    .order("popularity", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 400 });
  }

  const activityIds = (activities ?? []).map((activity) => activity.id);

  const { data: votes, error: votesError } =
    activityIds.length > 0
      ? await supabase.from("votes").select("activity_id, user_id, vote").in("activity_id", activityIds)
      : { data: [], error: null };

  if (votesError) {
    return NextResponse.json({ error: votesError.message }, { status: 400 });
  }

  const participantUserIds = [
    ...new Set(
      (votes ?? [])
        .filter((vote) => vote.vote === "yes" || vote.vote === "maybe")
        .map((vote) => vote.user_id),
    ),
  ];

  const { data: users, error: usersError } =
    participantUserIds.length > 0
      ? await supabase.from("users").select("id, name").in("id", participantUserIds)
      : { data: [], error: null };

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 400 });
  }

  const programJson = buildProgramFromVotes({
    activities: activities ?? [],
    votes: votes ?? [],
    users: (users ?? []).map((participant) => ({
      id: participant.id,
      name: participant.name,
      avatar: null,
    })),
    programType,
  });

  const { data: program, error: saveError } = await supabase
    .from("programs")
    .insert([
      {
        created_by_user_id: user.id,
        program_type: programType,
        program_json: programJson,
      },
    ])
    .select("*")
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 400 });
  }

  return NextResponse.json(program, { status: 201 });
}
