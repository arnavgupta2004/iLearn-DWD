import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateCourseLearningIntelligence } from "@/lib/learning-intelligence";
import { redirect } from "next/navigation";
import AnalyticsClient from "@/components/professor/AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, code, objectives, learning_outcomes")
    .eq("prof_id", user.id)
    .order("created_at", { ascending: false });

  if (!courses?.length) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#1a2b5e" }}>Analytics</h1>
        <p className="text-gray-400 text-sm">Create a course to see analytics.</p>
      </div>
    );
  }

  const courseIds = courses.map((c) => c.id);

  const [enrollmentsResult, chatsResult, submissionsResult, assessmentsResult, unitsResult] =
    await Promise.all([
      supabaseAdmin
        .from("enrollments")
        .select("course_id, student_id, profiles!student_id(full_name, email)")
        .in("course_id", courseIds),
      supabaseAdmin
        .from("chat_messages")
        .select("course_id, student_id, created_at")
        .in("course_id", courseIds)
        .eq("role", "user"),
      supabaseAdmin
        .from("submissions")
        .select("course_id, student_id, overall_score")
        .in("course_id", courseIds)
        .not("overall_score", "is", null),
      supabaseAdmin
        .from("assessments")
        .select("id, title, type, course_id, total_marks")
        .in("course_id", courseIds),
      supabaseAdmin
        .from("course_units")
        .select("course_id, title, topics")
        .in("course_id", courseIds)
        .order("unit_number"),
    ]);

  const enrollments = enrollmentsResult.data ?? [];
  const chats = chatsResult.data ?? [];
  const submissions = submissionsResult.data ?? [];
  const assessments = assessmentsResult.data ?? [];
  const units = unitsResult.data ?? [];

  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
  const assessmentIds = assessments.map((a) => a.id);

  // Fetch struggles and assessment submissions in parallel
  const [strugglesResult, asmSubsResult] = await Promise.all([
    studentIds.length > 0
      ? supabaseAdmin
          .from("student_topic_struggles")
          .select("student_id, course_id, topic, count")
          .in("student_id", studentIds)
          .in("course_id", courseIds)
          .order("count", { ascending: false })
      : { data: [] },
    assessmentIds.length > 0
      ? supabaseAdmin
          .from("assessment_submissions")
          .select("assessment_id, student_id, ai_score, total_marks, rank, total_students, status, submitted_at")
          .in("assessment_id", assessmentIds)
          .eq("status", "evaluated")
      : { data: [] },
  ]);

  const struggles = strugglesResult.data ?? [];
  const asmSubs = asmSubsResult.data ?? [];

  const assessmentMap: Record<string, { title: string; type: string; course_id: string; total_marks: number }> = {};
  for (const a of assessments) {
    assessmentMap[a.id] = { title: a.title, type: a.type, course_id: a.course_id, total_marks: a.total_marks };
  }

  const courseData = await Promise.all(courses.map(async (course) => {
    const courseEnrollments = enrollments.filter((e) => e.course_id === course.id);
    const courseAssessments = assessments.filter((a) => a.course_id === course.id);
    const courseUnits = units
      .filter((unit) => unit.course_id === course.id)
      .map((unit) => ({
        title: unit.title ?? "Unit",
        topics: Array.isArray(unit.topics) ? unit.topics : [],
      }));

    const students = courseEnrollments.map((e) => {
      const profile = (
        Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
      ) as { full_name: string | null; email: string | null } | null;

      const interactionCount = chats.filter(
        (c) => c.course_id === course.id && c.student_id === e.student_id
      ).length;

      // Old submission scores
      const studentSubs = submissions.filter(
        (s) => s.course_id === course.id && s.student_id === e.student_id
      );

      // Assessment submissions for this student in this course
      const studentAsmSubs = asmSubs.filter(
        (s) => s.student_id === e.student_id &&
          assessmentMap[s.assessment_id]?.course_id === course.id
      );

      // Combined avg score (assessment submissions take priority, fall back to old submissions)
      let avgScore: number | null = null;
      if (studentAsmSubs.length > 0) {
        const pcts = studentAsmSubs.map((s) =>
          (s.total_marks ?? 100) > 0 ? (s.ai_score / (s.total_marks ?? 100)) * 100 : 0
        );
        avgScore = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
      } else if (studentSubs.length > 0) {
        avgScore = Math.round(
          studentSubs.reduce((sum, s) => sum + ((s.overall_score as number) ?? 0), 0) /
            studentSubs.length
        );
      }

      const allStruggles = struggles
        .filter((s) => s.student_id === e.student_id && s.course_id === course.id)
        .map((s) => ({ topic: s.topic, count: s.count }));

      const topStruggles = allStruggles.slice(0, 3).map((s) => s.topic);

      const enrichedAsmSubs = studentAsmSubs.map((s) => ({
        title: assessmentMap[s.assessment_id]?.title ?? "Assessment",
        type: assessmentMap[s.assessment_id]?.type ?? "quiz",
        ai_score: s.ai_score,
        total_marks: s.total_marks ?? assessmentMap[s.assessment_id]?.total_marks ?? 100,
        rank: s.rank ?? null,
        total_students: s.total_students ?? null,
        submitted_at: s.submitted_at as string,
      })).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

      const completionRate = courseAssessments.length > 0
        ? Math.round((studentAsmSubs.length / courseAssessments.length) * 100)
        : 0;

      // Chat activity for last 14 days
      const dayMap: Record<string, number> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      for (const msg of chats.filter(c => c.course_id === course.id && c.student_id === e.student_id)) {
        const day = (msg.created_at as string).slice(0, 10);
        if (day in dayMap) dayMap[day]++;
      }
      const chatTimeline = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

      return {
        studentId: e.student_id,
        fullName: profile?.full_name ?? "Unknown",
        email: profile?.email ?? "",
        interactionCount,
        avgScore,
        topStruggles,
        allStruggles,
        assessmentSubmissions: enrichedAsmSubs,
        totalAssessments: courseAssessments.length,
        completionRate,
        chatTimeline,
      };
    });

    const intelligence = await generateCourseLearningIntelligence({
      courseId: course.id,
      name: course.name,
      code: course.code,
      objectives: Array.isArray(course.objectives) ? course.objectives : [],
      learningOutcomes: Array.isArray(course.learning_outcomes)
        ? course.learning_outcomes
        : [],
      units: courseUnits,
      students,
    });

    const enrichedStudents = students.map((student) => {
      const insight = intelligence.students.find((item) => item.studentId === student.studentId);
      return {
        ...student,
        objectiveCompletion: insight?.objectiveCompletion ?? 0,
        goalProgress: insight?.goalProgress ?? 0,
        weeklyMomentum: insight?.weeklyMomentum ?? 0,
        theoryUnderstanding: insight?.theoryUnderstanding ?? 0,
        practicalSkill: insight?.practicalSkill ?? 0,
        strengths: insight?.strengths ?? [],
        growthTopics: insight?.growthTopics ?? [],
        recommendedSupport: insight?.recommendedSupport ?? [],
        bestContributionAreas: insight?.bestContributionAreas ?? [],
        coachSummary: insight?.coachSummary ?? "",
      };
    });

    const topicFreq: Record<string, number> = {};
    for (const s of struggles.filter((s) =>
      enrollments.some((e) => e.student_id === s.student_id && e.course_id === course.id)
    )) {
      topicFreq[s.topic] = (topicFreq[s.topic] ?? 0) + s.count;
    }
    const aggregateTopics = Object.entries(topicFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) as [string, number][];

    return {
      ...course,
      students: enrichedStudents,
      aggregateTopics,
      topicTalentMap: intelligence.topicTalentMap,
      courseInsights: intelligence.courseInsights,
    };
  }));

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>Analytics</h1>
      <p className="text-gray-400 text-sm mb-6">
        Student performance and engagement across your courses
      </p>
      <AnalyticsClient courses={courseData} />
    </div>
  );
}
