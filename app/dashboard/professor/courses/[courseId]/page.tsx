import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import CourseDetailClient from "@/components/professor/CourseDetailClient";
import type { AiFeedback } from "@/components/student/FeedbackCard";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Verify ownership
  const { data: course } = await supabase
    .from("courses")
    .select("id, name, code, credits, difficulty_level, faculty_name")
    .eq("id", courseId)
    .eq("prof_id", user.id)
    .single();

  if (!course) notFound();

  // Fetch materials and submissions in parallel
  const [materialsResult, submissionsResult] = await Promise.all([
    supabase
      .from("course_materials")
      .select("id, name, file_type, file_size, indexed, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false }),

    // Use admin client to read all students' submissions
    supabaseAdmin
      .from("submissions")
      .select("id, title, status, overall_score, professor_score, professor_notes, ai_feedback, created_at, profiles!student_id(full_name, email)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false }),
  ]);

  const materials = materialsResult.data ?? [];

  // Normalise the profiles join (Supabase returns array for to-one joins)
  const submissions = (submissionsResult.data ?? []).map((s) => ({
    ...s,
    ai_feedback: s.ai_feedback as AiFeedback | null,
    profiles: Array.isArray(s.profiles) ? (s.profiles[0] ?? null) : s.profiles,
  }));

  const level = course.difficulty_level ?? "undergraduate";

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/professor" className="hover:underline" style={{ color: "#1a2b5e" }}>
          My Courses
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">{course.name}</span>
      </div>

      {/* Course header */}
      <div
        className="rounded-2xl p-6 mb-6 border"
        style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ background: "rgba(201,168,76,0.15)", color: "#92400e" }}
              >
                {course.code}
              </span>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ background: "#eef1f9", color: "#1a2b5e" }}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "#1a2b5e" }}>
              {course.name}
            </h1>
            {course.faculty_name && (
              <p className="text-sm text-gray-500 mt-1">{course.faculty_name}</p>
            )}
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: "#1a2b5e" }}>{course.credits}</p>
              <p className="text-xs text-gray-400 mt-0.5">Credits</p>
            </div>
            <div className="w-px" style={{ background: "#e5eaf5" }} />
            <div className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: "#1a2b5e" }}>{materials.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Materials</p>
            </div>
            <div className="w-px" style={{ background: "#e5eaf5" }} />
            <div className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: "#1a2b5e" }}>{submissions.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Submissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <CourseDetailClient
        courseId={courseId}
        materials={materials}
        submissions={submissions as Parameters<typeof CourseDetailClient>[0]["submissions"]}
      />
    </div>
  );
}
