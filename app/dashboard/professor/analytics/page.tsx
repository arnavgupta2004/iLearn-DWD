import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import AnalyticsClient from "@/components/professor/AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Professor's courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, code")
    .eq("prof_id", user.id)
    .order("created_at", { ascending: false });

  if (!courses?.length) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#1a2b5e" }}>
          Analytics
        </h1>
        <p className="text-gray-400 text-sm">Create a course to see analytics.</p>
      </div>
    );
  }

  const courseIds = courses.map((c) => c.id);

  // Fetch all data in parallel
  const [enrollmentsResult, chatsResult, submissionsResult, strugglesResult] =
    await Promise.all([
      supabaseAdmin
        .from("enrollments")
        .select("course_id, student_id, profiles!student_id(full_name, email)")
        .in("course_id", courseIds),

      supabaseAdmin
        .from("chat_messages")
        .select("course_id, student_id")
        .in("course_id", courseIds)
        .eq("role", "user"),

      supabaseAdmin
        .from("submissions")
        .select("course_id, student_id, overall_score")
        .in("course_id", courseIds)
        .not("overall_score", "is", null),

      supabaseAdmin
        .from("student_topic_struggles")
        .select("student_id, topic, count")
        .in(
          "student_id",
          // Will be re-filtered below; fetch broadly for now
          []
        ),
    ]);

  const enrollments = enrollmentsResult.data ?? [];
  const chats = chatsResult.data ?? [];
  const submissions = submissionsResult.data ?? [];

  // Fetch struggles for enrolled students
  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
  let struggles: { student_id: string; topic: string; count: number }[] = [];
  if (studentIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("student_topic_struggles")
      .select("student_id, topic, count")
      .in("student_id", studentIds);
    struggles = data ?? [];
  }

  // Build per-course analytics
  const courseData = courses.map((course) => {
    const courseEnrollments = enrollments.filter((e) => e.course_id === course.id);

    const students = courseEnrollments.map((e) => {
      const profile = (
        Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
      ) as { full_name: string | null; email: string | null } | null;

      const interactionCount = chats.filter(
        (c) => c.course_id === course.id && c.student_id === e.student_id
      ).length;

      const studentSubs = submissions.filter(
        (s) => s.course_id === course.id && s.student_id === e.student_id
      );
      const avgScore =
        studentSubs.length > 0
          ? Math.round(
              studentSubs.reduce((sum, s) => sum + ((s.overall_score as number) ?? 0), 0) /
                studentSubs.length
            )
          : null;

      const topStruggles = struggles
        .filter((s) => s.student_id === e.student_id)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((s) => s.topic);

      return {
        studentId: e.student_id,
        fullName: profile?.full_name ?? "Unknown",
        email: profile?.email ?? "",
        interactionCount,
        avgScore,
        topStruggles,
      };
    });

    // Aggregate struggle topics across all students in this course
    const topicFreq: Record<string, number> = {};
    for (const s of students) {
      for (const topic of s.topStruggles) {
        topicFreq[topic] = (topicFreq[topic] ?? 0) + 1;
      }
    }
    const aggregateTopics = Object.entries(topicFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) as [string, number][];

    return { ...course, students, aggregateTopics };
  });

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
        Analytics
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        Student performance and engagement across your courses
      </p>
      <AnalyticsClient courses={courseData} />
    </div>
  );
}
