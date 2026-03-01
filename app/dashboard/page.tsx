import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "Traveler";

  return (
    <main className="mx-auto w-full max-w-md p-4">
      <section className="rounded-3xl bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-sm text-[var(--text-soft)]">Dashboard</p>
        <h1 className="text-3xl font-semibold">Hi, {displayName}</h1>
      </section>
    </main>
  );
}
