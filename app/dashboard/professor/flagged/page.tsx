import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import FlaggedQuestionsClient from "@/components/professor/FlaggedQuestionsClient";

export default async function FlaggedQuestionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Get all courses owned by this professor
  const { data: professorCourses } = await supabase
    .from("courses")
    .select("id")
    .eq("prof_id", user.id);

  const courseIds = (professorCourses ?? []).map((c) => c.id);

  if (courseIds.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#1a2b5e" }}>
          Flagged Questions
        </h1>
        <p className="text-gray-400 text-sm">No courses yet.</p>
      </div>
    );
  }

  // Fetch all flagged questions across professor's courses
  const { data: rawQuestions } = await supabaseAdmin
    .from("flagged_questions")
    .select(
      "id, course_id, student_id, question, ai_response, prof_answer, answered_at, created_at, courses(name, code), profiles!student_id(full_name, email)"
    )
    .in("course_id", courseIds)
    .order("created_at", { ascending: false });

  // Normalise Supabase array joins → single objects
  const questions = (rawQuestions ?? []).map((q) => ({
    id: q.id as string,
    course_id: q.course_id as string,
    student_id: q.student_id as string,
    question: q.question as string,
    ai_response: q.ai_response as string | null,
    prof_answer: q.prof_answer as string | null,
    answered_at: q.answered_at as string | null,
    created_at: q.created_at as string,
    courses: (Array.isArray(q.courses) ? (q.courses[0] ?? null) : q.courses) as {
      name: string;
      code: string;
    } | null,
    profiles: (Array.isArray(q.profiles) ? (q.profiles[0] ?? null) : q.profiles) as {
      full_name: string | null;
      email: string | null;
    } | null,
  }));

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
        Flagged Questions
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        Questions the AI couldn&apos;t answer — reply to help your students
      </p>
      <FlaggedQuestionsClient questions={questions} />
    </div>
  );
}
