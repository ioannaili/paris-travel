import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { VoteValue } from "@/types/database";

const validVotes: VoteValue[] = ["yes", "maybe", "no"];

interface VotePayload {
  activity_id?: string;
  vote?: VoteValue;
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = (await request.json()) as VotePayload;

  if (!body.activity_id) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  if (!body.vote || !validVotes.includes(body.vote)) {
    return NextResponse.json({ error: "vote must be yes, maybe, or no" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("votes")
    .upsert(
      {
        activity_id: body.activity_id,
        user_id: user.id,
        vote: body.vote,
      },
      { onConflict: "activity_id,user_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
