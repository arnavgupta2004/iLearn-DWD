import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect, notFound } from "next/navigation";
import ChatInterface from "@/components/student/ChatInterface";
import CourseInfoPanel from "@/components/student/CourseInfoPanel";
import StudentAssessmentsSection from "@/components/student/StudentAssessmentsSection";
import StudyBuddiesSection from "@/components/student/StudyBuddiesSection";

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

  // Fetch units, materials, chat history, and assessments in parallel
  const [unitsResult, materialsResult, historyResult, assessmentsResult] = await Promise.all([
    supabase
      .from("course_units")
      .select("id, unit_number, title, hours, topics")
      .eq("course_id", courseId)
      .order("unit_number"),

    supabase
      .from("course_materials")
      .select("id, file_name, file_type, file_path, indexed")
      .eq("course_id", courseId)
      .eq("indexed", true)
      .order("uploaded_at"),

    supabase
      .from("chat_messages")
      .select("id, role, content, flagged_for_prof")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .order("created_at")
      .limit(100),

    supabase
      .from("assessments")
      .select("id, title, type, description, due_date, total_marks, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false }),
  ]);

  const units = unitsResult.data ?? [];
  const rawMaterials = materialsResult.data ?? [];
  const assessments = assessmentsResult.data ?? [];

  // Fetch student's submissions for these assessments
  const assessmentIds = assessments.map((a) => a.id);
  const myAssessmentSubs =
    assessmentIds.length > 0
      ? (
          await supabaseAdmin
            .from("assessment_submissions")
            .select("id, assessment_id, ai_score, total_marks, rank, total_students, status")
            .in("assessment_id", assessmentIds)
            .eq("student_id", user.id)
        ).data ?? []
      : [];

  // Generate signed URLs for each material (1 hour expiry)
  const materials = await Promise.all(
    rawMaterials.map(async (mat) => {
      const { data } = await supabaseAdmin.storage
        .from("course-materials")
        .createSignedUrl(mat.file_path ?? "", 3600);
      return { ...mat, signedUrl: data?.signedUrl ?? null };
    })
  );
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
          courseName={course.name}
          difficultyLevel={course.difficulty_level ?? "undergraduate"}
          history={chatHistory}
        />
      </div>

      {/* RIGHT: Course info panel + assessments */}
      <div
        className="flex flex-col overflow-y-auto"
        style={{ width: 340, minWidth: 340, borderLeft: "1px solid #e5eaf5" }}
      >
        <CourseInfoPanel
          course={course}
          units={units}
          materials={materials}
        />
        <div style={{ borderTop: "1px solid #e5eaf5" }}>
          <StudentAssessmentsSection
            assessments={assessments}
            submissions={myAssessmentSubs}
            courseId={courseId}
          />
        </div>
        <StudyBuddiesSection courseId={courseId} />
      </div>
    </div>
  );
}
