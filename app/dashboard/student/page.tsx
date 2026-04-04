import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import StudentCoursesGrid from "@/components/student/StudentCoursesGrid";
import PageChatbot from "@/components/shared/PageChatbot";

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
    .eq("student_id", user.id);

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
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
        My Courses
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        Browse the courses you are enrolled in
      </p>
      <StudentCoursesGrid courses={courses} studentId={user.id} />
      <PageChatbot
        scope="student_courses"
        title="My Courses"
        subtitle="Ask about your enrolled courses, teachers, and course matching."
        placeholder="Ask about your courses..."
        suggestedPrompts={[
          "What courses am I enrolled in?",
          "Which course sounds most related to machine learning?",
          "Who teaches my courses?",
        ]}
        context={{
          studentId: user.id,
          courses,
        }}
      />
    </div>
  );
}
