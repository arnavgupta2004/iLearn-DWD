import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import StudentCoursesGrid from "@/components/student/StudentCoursesGrid";

export default async function StudentCoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  type CourseRow = {
    id: string;
    name: string;
    code: string;
    credits: number;
    difficulty_level: string | null;
    faculty_name: string | null;
  };

  // Step 1 — get enrolled course IDs
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const courseIds = (enrollments ?? []).map((e) => e.course_id).filter(Boolean);

  // Step 2 — fetch course details separately (avoids needing a FK relationship)
  let courses: CourseRow[] = [];
  if (courseIds.length > 0) {
    const { data } = await supabase
      .from("courses")
      .select("id, name, code, credits, difficulty_level, faculty_name")
      .in("id", courseIds);
    courses = (data ?? []) as CourseRow[];
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <StudentCoursesGrid courses={courses} studentId={user.id} />
    </div>
  );
}
