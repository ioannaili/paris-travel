import { createServerSupabaseClient } from "@/lib/supabase";
import ProfileClient from "@/app/profile/profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ProfileClient name="Guest" />;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const name = profile?.name ?? "Traveler";

  return <ProfileClient name={name} />;
}
