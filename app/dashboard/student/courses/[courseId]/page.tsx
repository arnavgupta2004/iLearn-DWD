import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import ChatInterface from "@/components/student/ChatInterface";
import CourseInfoPanel from "@/components/student/CourseInfoPanel";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function StudentCourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enrollment) notFound();

  // Fetch course details
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, name, code, credits, difficulty_level, faculty_name, assessment_weights"
    )
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  // Fetch units, materials, and chat history in parallel
  const [unitsResult, materialsResult, historyResult] = await Promise.all([
    supabase
      .from("course_units")
      .select("id, unit_number, title, hours, topics")
      .eq("course_id", courseId)
      .order("unit_number"),

    supabase
      .from("course_materials")
      .select("id, name, file_type, indexed")
      .eq("course_id", courseId)
      .order("created_at"),

    supabase
      .from("chat_messages")
      .select("id, role, content, flagged_for_prof")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .order("created_at")
      .limit(100),
  ]);

  const units = unitsResult.data ?? [];
  const materials = materialsResult.data ?? [];
  const rawHistory = historyResult.data ?? [];

  const chatHistory = rawHistory.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    flagged: m.flagged_for_prof ?? false,
  }));

  return (
    // Override student layout's overflow-y-auto — this page manages its own scroll
    <div className="flex h-full overflow-hidden">
      {/* LEFT: Chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatInterface
          courseId={courseId}
          studentId={user.id}
          courseName={course.name}
          difficultyLevel={course.difficulty_level ?? "undergraduate"}
          history={chatHistory}
        />
      </div>

      {/* RIGHT: Course info panel */}
      <CourseInfoPanel
        course={course}
        units={units}
        materials={materials}
      />
    </div>
  );
}
