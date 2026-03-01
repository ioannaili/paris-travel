import { createServerSupabaseClient } from "@/lib/supabase";
import VotingClient from "@/app/voting/voting-client";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <VotingClient userId="guest" initialUserName="Guest" />;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <VotingClient
      userId={user.id}
      initialUserName={profile?.name ?? user.email?.split("@")[0] ?? "Traveler"}
    />
  );
}
