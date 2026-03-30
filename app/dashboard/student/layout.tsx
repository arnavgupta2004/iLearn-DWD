import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/student/StudentSidebar";

export default async function StudentLayout({
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

  if (profile?.role !== "student") redirect("/auth");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <StudentSidebar fullName={profile.full_name} />
      {/* overflow-hidden so the chat page can manage its own scroll */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
