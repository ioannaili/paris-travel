import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { normalizeProgramJson } from "@/lib/program-utils";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { data: latestProgram, error: programError } = await supabase
    .from("programs")
    .select("id, program_type, program_json, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (programError) {
    return NextResponse.json({ error: programError.message }, { status: 400 });
  }

  if (!latestProgram) {
    return NextResponse.json({ program: null, days: [] });
  }

  const parsed = normalizeProgramJson(latestProgram.program_json);
  if (!parsed) {
    return NextResponse.json({ program: latestProgram, days: [] });
  }

  return NextResponse.json({
    program: latestProgram,
    days: parsed.days,
  });
}
