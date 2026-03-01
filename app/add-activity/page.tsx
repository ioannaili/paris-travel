import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import AddActivityClient from "@/app/add-activity/add-activity-client";

export const dynamic = "force-dynamic";

export default async function AddActivityPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AddActivityClient />;
}
