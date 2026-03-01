import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const fallbackName = user.email?.split("@")[0] ?? "Traveler";
    // Keep public.users aligned with auth.users for FK-referenced writes.
    await supabase.from("users").upsert(
      {
        id: user.id,
        name: fallbackName,
      },
      { onConflict: "id" },
    );
  }

  return { supabase, user };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
