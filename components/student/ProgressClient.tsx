"use client";

import { useState } from "react";

interface StruggleTopic {
  topic: string;
  count: number;
  courseId?: string;
}

interface TimelineDay {
  date: string;
  count: number;
}

interface AssessmentScore {
  title: string;
  type: string;
  courseName: string;
  courseCode: string;
  ai_score: number;
  total_marks: number;
  rank: number | null;
  total_students: number | null;
  submitted_at: string;
}

interface CoursePerformance {
  courseId: string;
  courseName: string;
  courseCode: string;
  submitted: number;
  total: number;
  avgPct: number | null;
}

interface ScoreTrendItem {
  label: string;
  pct: number;
  date: string;
  type: string;
}

interface OverviewStats {
  avgScorePct: number | null;
  bestScorePct: number | null;
  totalDone: number;
  totalAvailable: number;
  completionRate: number;
  totalChats: number;
}

interface StudentCourseInsight {
  courseId: string;
  objectiveCompletion: number;
  learningPace: "fast" | "steady" | "needs_support";
  confidenceLabel: string;
  currentFocus: string;
  strengths: string[];
  supportStrategies: string[];
}

interface StudentLearningProfile {
  overallNarrative: string;
  personalStrengths: string[];
  growthPriorities: { topic: string; reason: string }[];
  personalizedPlan: string[];
  weeklyFocus: string[];
  courseProgress: StudentCourseInsight[];
}

interface Props {
  struggles: StruggleTopic[];
  percentile: number;
  timeline: TimelineDay[];
  assessmentScores: AssessmentScore[];
  coursePerformance: CoursePerformance[];
  scoreTrend: ScoreTrendItem[];
  learningProfile: StudentLearningProfile;
  overviewStats: OverviewStats;
}

function pctColor(p: number) {
  return p >= 80 ? "#16a34a" : p >= 50 ? "#d97706" : "#dc2626";
}

function pctBg(p: number) {
  return p >= 80 ? "#dcfce7" : p >= 50 ? "#fef3c7" : "#fee2e2";
}

function paceStyle(pace: StudentCourseInsight["learningPace"]) {
  if (pace === "fast") return { bg: "#dcfce7", color: "#166534", label: "Fast pace" };
  if (pace === "steady") return { bg: "#fef3c7", color: "#92400e", label: "Steady pace" };
  return { bg: "#fee2e2", color: "#991b1b", label: "Needs support" };
}

export default function ProgressClient({
  struggles,
  percentile,
  timeline,
  assessmentScores,
  coursePerformance,
  learningProfile,
  overviewStats,
}: Props) {
  const [openCourse, setOpenCourse] = useState<string>("");
  const percentileColor =
    percentile >= 70 ? "#16a34a" : percentile >= 40 ? "#d97706" : "#dc2626";
  const percentileLabel =
    percentile >= 70 ? "Top Performer" : percentile >= 40 ? "On Track" : "Needs Attention";

  const courseProgressMap = new Map(
    learningProfile.courseProgress.map((course) => [course.courseId, course])
  );

  const courses = coursePerformance.map((course) => {
    const insight = courseProgressMap.get(course.courseId);
    const courseAssessments = assessmentScores
      .filter((assessment) => assessment.courseCode === course.courseCode)
      .sort(
        (a, b) =>
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
    const courseStruggles = struggles
      .filter((item) => item.courseId === course.courseId)
      .sort((a, b) => b.count - a.count);

    return {
      ...course,
      insight,
      assessments: courseAssessments,
      struggles: courseStruggles,
    };
  });

  const CARD = "rounded-2xl border p-5";
  const CARD_STYLE = { borderColor: "#e5eaf5", background: "#fafbff" };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Avg Score",
            value: overviewStats.avgScorePct !== null ? `${overviewStats.avgScorePct}%` : "—",
            sub: "across all courses",
            color:
              overviewStats.avgScorePct !== null
                ? pctColor(overviewStats.avgScorePct)
                : "#94a3b8",
            bg:
              overviewStats.avgScorePct !== null
                ? pctBg(overviewStats.avgScorePct)
                : "#f8fafc",
          },
          {
            label: "Best Score",
            value: overviewStats.bestScorePct !== null ? `${overviewStats.bestScorePct}%` : "—",
            sub: "personal best",
            color:
              overviewStats.bestScorePct !== null
                ? pctColor(overviewStats.bestScorePct)
                : "#94a3b8",
            bg:
              overviewStats.bestScorePct !== null
                ? pctBg(overviewStats.bestScorePct)
                : "#f8fafc",
          },
          {
            label: "Done",
            value: String(overviewStats.totalDone),
            sub: `of ${overviewStats.totalAvailable} assessments`,
            color: "#1a2b5e",
            bg: "#eef1f9",
          },
          {
            label: "Completion",
            value: `${overviewStats.completionRate}%`,
            sub: "overall",
            color: pctColor(overviewStats.completionRate),
            bg: pctBg(overviewStats.completionRate),
          },
          {
            label: "AI Chats",
            value: String(overviewStats.totalChats),
            sub: "questions asked",
            color: "#6d28d9",
            bg: "#ede9fe",
          },
          {
            label: "Standing",
            value: `${percentile}%`,
            sub: percentileLabel,
            color: percentileColor,
            bg: `${percentileColor}14`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 flex flex-col"
            style={{ background: s.bg, border: "1px solid transparent" }}
          >
            <p className="text-2xl font-extrabold leading-none" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[11px] font-bold mt-1" style={{ color: s.color }}>
              {s.label}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className={CARD} style={CARD_STYLE}>
        <h2 className="text-base font-bold mb-0.5" style={{ color: "#1a2b5e" }}>
          Your Learning Summary
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          High-level AI view before the course-wise breakdown
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">{learningProfile.overallNarrative}</p>

        {learningProfile.personalizedPlan.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {learningProfile.personalizedPlan.map((item) => (
              <div
                key={item}
                className="rounded-xl px-3 py-2 text-sm text-gray-600"
                style={{ background: "#ffffff" }}
              >
                {item}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {courses.map((course) => {
          const insight = course.insight;
          const pace = insight ? paceStyle(insight.learningPace) : null;
          const isOpen = openCourse === course.courseId;

          return (
            <section
              key={course.courseId}
              className="rounded-3xl border overflow-hidden"
              style={{ borderColor: "#e5eaf5", background: "#ffffff" }}
            >
              <button
                onClick={() => setOpenCourse(isOpen ? "" : course.courseId)}
                className="w-full px-6 py-5 text-left transition-colors"
                style={{
                  background: isOpen ? "#f0f4ff" : "#fafbff",
                  borderBottom: isOpen ? "1px solid #e5eaf5" : "none",
                }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{ background: "rgba(201,168,76,0.15)", color: "#92400e" }}
                      >
                        {course.courseCode}
                      </span>
                      {pace && (
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-full"
                          style={{ background: pace.bg, color: pace.color }}
                        >
                          {pace.label}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold" style={{ color: "#1a2b5e" }}>
                      {course.courseName}
                    </h2>
                    {insight && (
                      <p className="text-sm text-gray-500 mt-1">
                        Current focus:{" "}
                        <span className="font-semibold" style={{ color: "#1a2b5e" }}>
                          {insight.currentFocus}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <div className="grid grid-cols-3 gap-3 min-w-[280px]">
                      <div className="rounded-2xl p-3 text-center" style={{ background: "#eef1f9" }}>
                        <p className="text-xl font-extrabold" style={{ color: "#1a2b5e" }}>
                          {course.avgPct !== null ? `${course.avgPct}%` : "—"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">Avg score</p>
                      </div>
                      <div
                        className="rounded-2xl p-3 text-center"
                        style={{
                          background: insight ? `${pctColor(insight.objectiveCompletion)}14` : "#f8fafc",
                        }}
                      >
                        <p
                          className="text-xl font-extrabold"
                          style={{
                            color: insight ? pctColor(insight.objectiveCompletion) : "#94a3b8",
                          }}
                        >
                          {insight ? `${insight.objectiveCompletion}%` : "—"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">Objectives</p>
                      </div>
                      <div className="rounded-2xl p-3 text-center" style={{ background: "#f8fafc" }}>
                        <p className="text-xl font-extrabold" style={{ color: "#1a2b5e" }}>
                          {course.submitted}/{course.total}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">Assessments</p>
                      </div>
                    </div>
                    <span className="text-gray-400 text-xs shrink-0">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="p-6 space-y-5">
                {insight && (
                  <div className="grid grid-cols-[1.1fr_1fr] gap-5">
                    <div
                      className="rounded-2xl border p-4"
                      style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2b5e" }}>
                        AI Guidance
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-full"
                          style={{ background: "#eef1f9", color: "#1a2b5e" }}
                        >
                          {insight.confidenceLabel}
                        </span>
                        {insight.strengths.map((item) => (
                          <span
                            key={item}
                            className="text-[10px] px-2 py-1 rounded-full"
                            style={{ background: "#dcfce7", color: "#166534" }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {insight.supportStrategies.map((item) => (
                          <div
                            key={item}
                            className="rounded-xl px-3 py-2 text-sm text-gray-600"
                            style={{ background: "#ffffff" }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border p-4"
                      style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2b5e" }}>
                        Struggle Topics
                      </p>
                      {course.struggles.length > 0 ? (
                        <div className="space-y-2">
                          {course.struggles.slice(0, 4).map((item) => (
                            <div
                              key={item.topic}
                              className="flex items-center justify-between rounded-xl px-3 py-2"
                              style={{
                                background:
                                  item.count >= 3
                                    ? "rgba(220,38,38,0.07)"
                                    : "rgba(251,191,36,0.08)",
                              }}
                            >
                              <span
                                className="text-sm font-medium capitalize"
                                style={{
                                  color: item.count >= 3 ? "#b91c1c" : "#92400e",
                                }}
                              >
                                {item.topic}
                              </span>
                              <span
                                className="text-xs font-bold"
                                style={{
                                  color: item.count >= 3 ? "#b91c1c" : "#d97706",
                                }}
                              >
                                {item.count}x
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No major struggle topic detected for this course yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1a2b5e" }}>
                      Recent Assessments
                    </p>
                    <span className="text-[11px] text-gray-400">
                      {course.assessments.length} submitted
                    </span>
                  </div>

                  {course.assessments.length > 0 ? (
                    <div className="space-y-2">
                      {course.assessments.slice(0, 5).map((assessment, index) => {
                        const pct =
                          assessment.total_marks > 0
                            ? Math.round((assessment.ai_score / assessment.total_marks) * 100)
                            : 0;

                        return (
                          <div
                            key={`${assessment.title}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                            style={{ background: "#ffffff" }}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={
                                    assessment.type === "quiz"
                                      ? { background: "#dbeafe", color: "#1d4ed8" }
                                      : { background: "#fef3c7", color: "#92400e" }
                                  }
                                >
                                  {assessment.type === "quiz" ? "Quiz" : "Assignment"}
                                </span>
                              </div>
                              <p className="text-sm font-semibold truncate" style={{ color: "#1a2b5e" }}>
                                {assessment.title}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(assessment.submitted_at).toLocaleDateString("en", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {assessment.rank !== null && (
                                <div className="text-right">
                                  <p className="text-xs font-bold" style={{ color: "#1a2b5e" }}>
                                    #{assessment.rank}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    /{assessment.total_students}
                                  </p>
                                </div>
                              )}
                              <span
                                className="text-sm font-extrabold px-2.5 py-1 rounded-full"
                                style={{ background: pctBg(pct), color: pctColor(pct) }}
                              >
                                {assessment.ai_score}/{assessment.total_marks}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No submitted assessments in this course yet.
                    </p>
                  )}
                </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className={CARD} style={CARD_STYLE}>
        <h2 className="text-base font-bold mb-0.5" style={{ color: "#1a2b5e" }}>
          Learning Activity
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Overall activity across all courses over the last 14 days
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {timeline.map((day) => (
            <div key={day.date} className="min-w-[54px] text-center">
              <div
                className="rounded-xl px-2 py-3"
                style={{
                  background: day.count > 0 ? "#eef1f9" : "#f8fafc",
                  color: day.count > 0 ? "#1a2b5e" : "#94a3b8",
                }}
              >
                <p className="text-sm font-extrabold">{day.count}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(day.date + "T12:00:00")
                  .toLocaleDateString("en", { weekday: "short" })
                  .slice(0, 3)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
