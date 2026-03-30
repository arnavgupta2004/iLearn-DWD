import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import StudentCoursesGrid from "@/components/student/StudentCoursesGrid";

export default async function StudentCoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Fetch enrolled courses via the enrollments join
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "course_id, courses(id, name, code, credits, difficulty_level, faculty_name)"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  type CourseRow = {
    id: string;
    name: string;
    code: string;
    credits: number;
    difficulty_level: string | null;
    faculty_name: string | null;
  };

  // Supabase infers the join as array; flatten and cast safely
  const courses: CourseRow[] = (enrollments ?? [])
    .flatMap((e) => (Array.isArray(e.courses) ? e.courses : [e.courses]))
    .filter((c): c is CourseRow => c !== null && typeof c === "object");

  return (
    <div className="h-full overflow-y-auto p-8">
      <StudentCoursesGrid courses={courses} studentId={user.id} />
    </div>
  );
}
