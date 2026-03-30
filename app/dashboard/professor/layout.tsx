import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ProfessorSidebar from "@/components/professor/Sidebar";

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "professor") redirect("/auth");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ProfessorSidebar fullName={profile.full_name} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
