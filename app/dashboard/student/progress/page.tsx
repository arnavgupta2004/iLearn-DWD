import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateStudentLearningProfile } from "@/lib/learning-intelligence";
import { redirect } from "next/navigation";
import ProgressClient from "@/components/student/ProgressClient";

export default async function MyProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // ── Enrollments ─────────────────────────────────────────────────────────
  const { data: myEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id);

  const courseIds = (myEnrollments ?? []).map((e) => e.course_id);

  // ── Struggle topics (all, even count 1, from assessments/quizzes) ────────
  const { data: struggles } = await supabase
    .from("student_topic_struggles")
    .select("topic, count, course_id")
    .eq("student_id", user.id)
    .order("count", { ascending: false })
    .limit(20);

  // ── Activity timeline: chat messages per day over last 14 days ───────────
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const { data: recentMessages } = await supabase
    .from("chat_messages")
    .select("created_at")
    .eq("student_id", user.id)
    .eq("role", "user")
    .gte("created_at", since.toISOString());

  const dayMap: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const msg of recentMessages ?? []) {
    const day = (msg.created_at as string).slice(0, 10);
    if (day in dayMap) dayMap[day]++;
  }
  const timeline = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  // ── Class standing percentile ─────────────────────────────────────────────
  let percentile = 50;

  if (courseIds.length) {
    const { data: peers } = await supabaseAdmin
      .from("enrollments")
      .select("student_id")
      .in("course_id", courseIds);

    const peerIds = Array.from(new Set((peers ?? []).map((e) => e.student_id)));

    if (peerIds.length > 1) {
      const [chatRows, subRows, asmRows] = await Promise.all([
        supabaseAdmin
          .from("chat_messages")
          .select("student_id")
          .in("course_id", courseIds)
          .in("student_id", peerIds)
          .eq("role", "user"),
        supabaseAdmin
          .from("submissions")
          .select("student_id, overall_score")
          .in("course_id", courseIds)
          .in("student_id", peerIds)
          .not("overall_score", "is", null),
        supabaseAdmin
          .from("assessment_submissions")
          .select("student_id, ai_score, total_marks")
          .in("course_id", courseIds)
          .in("student_id", peerIds)
          .eq("status", "evaluated")
          .not("ai_score", "is", null),
      ]);

      const interactionMap: Record<string, number> = {};
      for (const row of chatRows.data ?? []) {
        interactionMap[row.student_id] = (interactionMap[row.student_id] ?? 0) + 1;
      }

      const scoreMap: Record<string, number[]> = {};
      for (const row of subRows.data ?? []) {
        if (!scoreMap[row.student_id]) scoreMap[row.student_id] = [];
        scoreMap[row.student_id].push(row.overall_score as number);
      }
      // Also factor in assessment scores
      for (const row of asmRows.data ?? []) {
        const pct = row.total_marks > 0 ? (row.ai_score / row.total_marks) * 100 : 0;
        if (!scoreMap[row.student_id]) scoreMap[row.student_id] = [];
        scoreMap[row.student_id].push(pct);
      }

      const scores = peerIds.map((id) => {
        const interactions = interactionMap[id] ?? 0;
        const avgScore = scoreMap[id]?.length
          ? scoreMap[id].reduce((a, b) => a + b, 0) / scoreMap[id].length
          : 50;
        return { id, combined: interactions * 0.3 + avgScore * 0.7 };
      });

      const myScore = scores.find((s) => s.id === user.id)?.combined ?? 0;
      const countBelow = scores.filter((s) => s.combined < myScore).length;
      percentile = Math.round((countBelow / (peerIds.length - 1)) * 100);
    }
  }

  // ── Assessment submissions ────────────────────────────────────────────────
  const { data: mySubs } = courseIds.length
    ? await supabaseAdmin
        .from("assessment_submissions")
        .select("id, assessment_id, ai_score, total_marks, rank, total_students, status, submitted_at, course_id")
        .eq("student_id", user.id)
        .eq("status", "evaluated")
        .order("submitted_at", { ascending: false })
    : { data: [] };

  // ── Assessment & course details ───────────────────────────────────────────
  const assessmentIds = (mySubs ?? []).map((s) => s.assessment_id);

  const [assessmentDetails, courseDetails, allAssessments] = await Promise.all([
    assessmentIds.length
      ? supabaseAdmin
          .from("assessments")
          .select("id, title, type, course_id")
          .in("id", assessmentIds)
      : { data: [] },
    courseIds.length
      ? supabaseAdmin
          .from("courses")
          .select("id, name, code, objectives, learning_outcomes")
          .in("id", courseIds)
      : { data: [] },
    // Total assessments available per course (for completion rate)
    courseIds.length
      ? supabaseAdmin
          .from("assessments")
          .select("id, course_id")
          .in("course_id", courseIds)
      : { data: [] },
  ]);

  const { data: courseUnits } = courseIds.length
    ? await supabaseAdmin
        .from("course_units")
        .select("course_id, title, topics")
        .in("course_id", courseIds)
        .order("unit_number")
    : { data: [] };

  const assessmentMap: Record<string, { title: string; type: string; course_id: string }> = {};
  for (const a of assessmentDetails.data ?? []) {
    assessmentMap[a.id] = { title: a.title, type: a.type, course_id: a.course_id };
  }
  const courseMap: Record<string, {
    name: string;
    code: string;
    objectives: string[];
    learningOutcomes: string[];
  }> = {};
  for (const c of courseDetails.data ?? []) {
    courseMap[c.id] = {
      name: c.name,
      code: c.code,
      objectives: Array.isArray(c.objectives) ? c.objectives : [],
      learningOutcomes: Array.isArray(c.learning_outcomes) ? c.learning_outcomes : [],
    };
  }

  const courseUnitsMap: Record<string, { title: string; topics: string[] }[]> = {};
  for (const unit of courseUnits ?? []) {
    if (!courseUnitsMap[unit.course_id]) courseUnitsMap[unit.course_id] = [];
    courseUnitsMap[unit.course_id].push({
      title: unit.title ?? "Unit",
      topics: Array.isArray(unit.topics) ? unit.topics : [],
    });
  }

  // ── Enrich assessment scores ──────────────────────────────────────────────
  const assessmentScores = (mySubs ?? [])
    .filter((s) => s.ai_score !== null)
    .map((s) => ({
      title: assessmentMap[s.assessment_id]?.title ?? "Assessment",
      type: assessmentMap[s.assessment_id]?.type ?? "quiz",
      courseName: courseMap[assessmentMap[s.assessment_id]?.course_id ?? ""]?.name ?? "Course",
      courseCode: courseMap[assessmentMap[s.assessment_id]?.course_id ?? ""]?.code ?? "",
      ai_score: s.ai_score as number,
      total_marks: s.total_marks ?? 100,
      rank: s.rank ?? null,
      total_students: s.total_students ?? null,
      submitted_at: s.submitted_at as string,
    }));

  // ── Course performance breakdown ──────────────────────────────────────────
  const totalByCoursePub: Record<string, number> = {};
  for (const a of allAssessments.data ?? []) {
    totalByCoursePub[a.course_id] = (totalByCoursePub[a.course_id] ?? 0) + 1;
  }

  const coursePerformance = courseIds.map((cid) => {
    // Group by course_id from mySubs
    const subs = (mySubs ?? []).filter((s) => {
      return assessmentMap[s.assessment_id]?.course_id === cid;
    });
    const scores = subs.map((s) =>
      s.total_marks > 0 ? (s.ai_score / s.total_marks) * 100 : 0
    );
    const avgPct = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return {
      courseId: cid,
      courseName: courseMap[cid]?.name ?? "Course",
      courseCode: courseMap[cid]?.code ?? "",
      submitted: subs.length,
      total: totalByCoursePub[cid] ?? 0,
      avgPct,
    };
  });

  // ── Score trend: last 10 submissions ordered chronologically ─────────────
  const scoreTrend = [...assessmentScores]
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .slice(-10)
    .map((s) => ({
      label: s.title.length > 15 ? s.title.slice(0, 15) + "…" : s.title,
      pct: s.total_marks > 0 ? Math.round((s.ai_score / s.total_marks) * 100) : 0,
      date: s.submitted_at,
      type: s.type,
    }));

  // ── Overview stats ────────────────────────────────────────────────────────
  const totalDone = assessmentScores.length;
  const totalAvailable = Object.values(totalByCoursePub).reduce((a, b) => a + b, 0);
  const completionRate = totalAvailable > 0 ? Math.round((totalDone / totalAvailable) * 100) : 0;
  const avgScorePct =
    assessmentScores.length > 0
      ? Math.round(
          assessmentScores.reduce(
            (sum, s) => sum + (s.total_marks > 0 ? (s.ai_score / s.total_marks) * 100 : 0),
            0
          ) / assessmentScores.length
        )
      : null;
  const bestScorePct =
    assessmentScores.length > 0
      ? Math.max(
          ...assessmentScores.map((s) =>
            s.total_marks > 0 ? Math.round((s.ai_score / s.total_marks) * 100) : 0
          )
        )
      : null;

  // Total chat messages
  const { count: totalChats } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("role", "user");

  const studentLearningProfile = await generateStudentLearningProfile({
    struggles: (struggles ?? []).map((item) => ({ topic: item.topic, count: item.count })),
    percentile,
    totalChats: totalChats ?? 0,
    courses: coursePerformance.map((course) => {
      const recentAssessments = (mySubs ?? [])
        .filter((sub) => assessmentMap[sub.assessment_id]?.course_id === course.courseId)
        .map((sub) => ({
          title: assessmentMap[sub.assessment_id]?.title ?? "Assessment",
          type: (assessmentMap[sub.assessment_id]?.type ?? "quiz") as "quiz" | "assignment",
          ai_score: sub.ai_score ?? 0,
          total_marks: sub.total_marks ?? 100,
          submitted_at: sub.submitted_at as string,
        }))
        .slice(0, 5);

      return {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        objectives: courseMap[course.courseId]?.objectives ?? [],
        learningOutcomes: courseMap[course.courseId]?.learningOutcomes ?? [],
        units: courseUnitsMap[course.courseId] ?? [],
        avgPct: course.avgPct,
        submitted: course.submitted,
        total: course.total,
        struggles: (struggles ?? [])
          .filter((item) => item.course_id === course.courseId)
          .map((item) => ({ topic: item.topic, count: item.count })),
        recentAssessments,
      };
    }),
  });

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
        My Progress
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        A complete view of your academic performance and learning activity
      </p>
      <ProgressClient
        struggles={(struggles ?? []).map((s) => ({
          topic: s.topic,
          count: s.count,
          courseId: s.course_id,
        }))}
        percentile={percentile}
        timeline={timeline}
        assessmentScores={assessmentScores}
        coursePerformance={coursePerformance}
        scoreTrend={scoreTrend}
        learningProfile={studentLearningProfile}
        overviewStats={{
          avgScorePct,
          bestScorePct,
          totalDone,
          totalAvailable,
          completionRate,
          totalChats: totalChats ?? 0,
        }}
      />
    </div>
  );
}
