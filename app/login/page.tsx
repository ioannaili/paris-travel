import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import LoginForm from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/activities");
  }

  return <LoginForm />;
}
