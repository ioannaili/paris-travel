import { NextResponse } from "next/server";

export async function GET() {
  // Deprecated: activities now enter voting exactly once via activities.voting_phase.
  return NextResponse.json([]);
}
