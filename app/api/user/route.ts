import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, created_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    id: user.id,
    name: profile?.name ?? user.email?.split("@")[0] ?? null,
    email: user.email,
    profile,
  });
}
