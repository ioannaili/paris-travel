import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { normalizeProgramJson } from "@/lib/program-utils";
import { Json, ProgramType } from "@/types/database";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(null);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = (await request.json()) as
    | { program_json?: Json; program_type?: ProgramType }
    | Json;

  const isEnvelope = typeof body === "object" && body !== null && "program_json" in body;
  const programInput = isEnvelope ? (body.program_json ?? null) : (body as Json);
  const programType =
    isEnvelope && typeof body.program_type === "string" ? body.program_type : "general";

  if (programType !== "general" && programType !== "user_based") {
    return NextResponse.json(
      { error: "Invalid program_type. Allowed values: general, user_based" },
      { status: 400 },
    );
  }

  const parsed = normalizeProgramJson(programInput);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid program_json format" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("programs")
    .insert([
      {
        created_by_user_id: user.id,
        program_type: programType,
        program_json: parsed,
      },
    ])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
