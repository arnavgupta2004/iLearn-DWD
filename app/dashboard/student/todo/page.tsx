import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import TodoClient from "@/components/student/TodoClient";
import PageChatbot from "@/components/shared/PageChatbot";

export default async function TodoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Get enrolled courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id);

  const courseIds = (enrollments ?? []).map((e) => e.course_id).filter(Boolean);

  if (courseIds.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-8">
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
          To Do
        </h1>
        <p className="text-gray-400 text-sm mb-6">Track pending assessments across all your courses</p>
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-semibold text-gray-500">You are not enrolled in any courses yet.</p>
        </div>
      </div>
    );
  }

  // Fetch all assessments for enrolled courses
  const { data: assessments } = await supabaseAdmin
    .from("assessments")
    .select("id, title, type, description, due_date, total_marks, created_at, course_id")
    .in("course_id", courseIds)
    .order("due_date", { ascending: true, nullsFirst: false });

  // Fetch student's submissions for these assessments
  const assessmentIds = (assessments ?? []).map((a) => a.id);
  const { data: mySubmissions } =
    assessmentIds.length > 0
      ? await supabaseAdmin
          .from("assessment_submissions")
          .select("id, assessment_id, ai_score, total_marks, rank, total_students, status, submitted_at")
          .in("assessment_id", assessmentIds)
          .eq("student_id", user.id)
      : { data: [] };

  // Fetch course names
  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select("id, name, code")
    .in("id", courseIds);

  const courseMap: Record<string, { name: string; code: string }> = {};
  for (const c of courses ?? []) {
    courseMap[c.id] = { name: c.name, code: c.code };
  }

  const submittedIds = new Set((mySubmissions ?? []).map((s) => s.assessment_id));

  // Enrich assessments with course info and submission status
  const enriched = (assessments ?? []).map((a) => ({
    ...a,
    courseName: courseMap[a.course_id]?.name ?? "Course",
    courseCode: courseMap[a.course_id]?.code ?? "",
    submitted: submittedIds.has(a.id),
    submission: (mySubmissions ?? []).find((s) => s.assessment_id === a.id) ?? null,
  }));

  const pending = enriched.filter((a) => !a.submitted);
  const completed = enriched.filter((a) => a.submitted);

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
        To Do
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        Track pending assessments across all your courses
      </p>
      <TodoClient
        pending={pending}
        completed={completed}
      />
      <PageChatbot
        scope="student_todo"
        title="To Do"
        subtitle="Ask how to prioritize and plan your pending tasks."
        placeholder="Ask about what to do next..."
        suggestedPrompts={[
          "What should I do today first?",
          "How should I order my pending tasks?",
          "Which deadline looks most urgent?",
        ]}
        context={{
          studentId: user.id,
          pending: pending.map((item) => ({
            title: item.title,
            type: item.type,
            due_date: item.due_date,
            total_marks: item.total_marks,
            courseName: item.courseName,
            courseCode: item.courseCode,
          })),
          completed: completed.map((item) => ({
            title: item.title,
            type: item.type,
            submitted_at: item.submission?.submitted_at ?? null,
            courseName: item.courseName,
            courseCode: item.courseCode,
          })),
        }}
      />
    </div>
  );
}
