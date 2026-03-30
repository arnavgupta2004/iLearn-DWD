import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CoursesGrid from "@/components/professor/CoursesGrid";

export default async function ProfessorCoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, code, credits, difficulty_level, enrollments(count)")
    .eq("professor_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <CoursesGrid courses={courses ?? []} professorId={user.id} />
    </div>
  );
}
