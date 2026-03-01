import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

interface AddToVotingPayload {
  activity_id?: string;
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  const body = (await request.json()) as AddToVotingPayload;

  if (!body.activity_id) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  if (!user) {
    return NextResponse.json({ ok: true, guest: true, activity_id: body.activity_id }, { status: 200 });
  }

  const { error } = await supabase
    .from("activities")
    .update({ voting_phase: true })
    .eq("id", body.activity_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
