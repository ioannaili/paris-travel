import { NextRequest, NextResponse } from "next/server";
import { createProxySupabaseClient } from "@/lib/supabase";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  try {
    const supabase = createProxySupabaseClient(request, response);
    await supabase.auth.getUser();
  } catch {
    // Keep app reachable even when env/config is missing in local development.
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
