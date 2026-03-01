import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabase
    .from("votes")
    .select("activity_id, user_id, vote, users(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const formattedVotes = (data ?? []).map((vote) => {
    const joinedUser = Array.isArray(vote.users) ? vote.users[0] : vote.users;
    return {
      activity_id: vote.activity_id,
      user_id: vote.user_id,
      vote: vote.vote,
      user_name: joinedUser?.name ?? "Unknown",
    };
  });

  return NextResponse.json(formattedVotes);
}
