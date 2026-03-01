import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { Database } from "@/types/database";
import { coerceSourceType, createActivityWithDedup } from "@/lib/activity-utils";

type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = (await request.json()) as Partial<ActivityInsert>;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await createActivityWithDedup(
    supabase,
    {
      ...body,
      source_type: coerceSourceType(body.source_type ?? "manual"),
      voting_phase: true,
    },
    user.id,
    "manual",
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const activityId = (result.activity as { id?: string } | null)?.id;
  if (!activityId) {
    return NextResponse.json({ error: "Failed to resolve activity id" }, { status: 400 });
  }

  const { error: phaseError } = await supabase
    .from("activities")
    .update({ voting_phase: true })
    .eq("id", activityId);

  if (phaseError) {
    return NextResponse.json({ error: phaseError.message }, { status: 400 });
  }

  return NextResponse.json({ duplicate: result.duplicate, activity: result.activity }, { status: result.duplicate ? 200 : 201 });
}
