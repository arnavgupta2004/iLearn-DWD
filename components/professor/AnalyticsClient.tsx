"use client";

import { useState } from "react";

interface AssessmentSubmission {
  title: string;
  type: string;
  ai_score: number;
  total_marks: number;
  rank: number | null;
  total_students: number | null;
  submitted_at: string;
}

interface ChatDay {
  date: string;
  count: number;
}

interface TopicInsight {
  topic: string;
  reason: string;
}

interface Student {
  studentId: string;
  fullName: string;
  email: string;
  interactionCount: number;
  avgScore: number | null;
  topStruggles: string[];
  allStruggles: { topic: string; count: number }[];
  assessmentSubmissions: AssessmentSubmission[];
  totalAssessments: number;
  completionRate: number;
  chatTimeline: ChatDay[];
  objectiveCompletion: number;
  goalProgress: number;
  weeklyMomentum: number;
  theoryUnderstanding: number;
  practicalSkill: number;
  strengths: TopicInsight[];
  growthTopics: TopicInsight[];
  recommendedSupport: string[];
  bestContributionAreas: string[];
  coachSummary: string;
}

interface CourseData {
  id: string;
  name: string;
  code: string;
  students: Student[];
  aggregateTopics: [string, number][];
  topicTalentMap: { topic: string; studentIds: string[]; reason: string }[];
  courseInsights: {
    objectiveCoverage: number;
    weeklyTrend: string;
    atRiskTopics: string[];
    recommendedActions: string[];
    personalizationSummary: string;
  };
}

interface Props {
  courses: CourseData[];
}

function scoreColor(p: number) {
  return p >= 70 ? "#16a34a" : p >= 50 ? "#d97706" : "#dc2626";
}

function scoreBg(p: number) {
  return p >= 70 ? "#dcfce7" : p >= 50 ? "#fef3c7" : "#fee2e2";
}

function meterColor(p: number) {
  return p >= 75 ? "#16a34a" : p >= 55 ? "#d97706" : "#dc2626";
}

function MetricBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-gray-500">{label}</span>
        <span className="text-[11px] font-bold" style={{ color: meterColor(value) }}>
          {value}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#e5eaf5" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: meterColor(value) }}
        />
      </div>
    </div>
  );
}

function StudentDetailPanel({
  student,
  courseName,
  onClose,
}: {
  student: Student;
  courseName: string;
  onClose: () => void;
}) {
  const maxChat = Math.max(...student.chatTimeline.map((d) => d.count), 1);
  const today = new Date().toISOString().slice(0, 10);

  const avgPct = student.avgScore;
  const bestPct = student.assessmentSubmissions.length > 0
    ? Math.max(
        ...student.assessmentSubmissions.map((s) =>
          s.total_marks > 0 ? Math.round((s.ai_score / s.total_marks) * 100) : 0
        )
      )
    : null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(10,20,55,0.3)" }}
        onClick={onClose}
      />

      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden shadow-2xl"
        style={{ width: 520, background: "#ffffff" }}
      >
        <div
          className="flex items-start justify-between px-6 py-5 border-b shrink-0"
          style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                style={{ background: "#eef1f9", color: "#1a2b5e" }}
              >
                {student.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <p className="font-extrabold text-base leading-none" style={{ color: "#1a2b5e" }}>
                  {student.fullName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{student.email}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{courseName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-4 mt-1"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-5 gap-3">
            {[
              {
                label: "Avg Score",
                value: avgPct !== null ? `${avgPct}%` : "—",
                color: avgPct !== null ? scoreColor(avgPct) : "#94a3b8",
                bg: avgPct !== null ? scoreBg(avgPct) : "#f8fafc",
              },
              {
                label: "Best Score",
                value: bestPct !== null ? `${bestPct}%` : "—",
                color: bestPct !== null ? scoreColor(bestPct) : "#94a3b8",
                bg: bestPct !== null ? scoreBg(bestPct) : "#f8fafc",
              },
              {
                label: "Done",
                value: `${student.assessmentSubmissions.length}/${student.totalAssessments}`,
                color: "#1a2b5e",
                bg: "#eef1f9",
              },
              {
                label: "Chats",
                value: String(student.interactionCount),
                color: "#6d28d9",
                bg: "#ede9fe",
              },
              {
                label: "Goal Progress",
                value: `${student.goalProgress}%`,
                color: meterColor(student.goalProgress),
                bg: `${meterColor(student.goalProgress)}14`,
              },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                <p className="text-lg font-extrabold leading-none" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-[10px] font-semibold mt-1" style={{ color: s.color }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1a2b5e" }}>
                  Objective Readiness
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  AI estimate of how close this student is to completing the course objectives
                </p>
              </div>
              <span
                className="text-sm font-extrabold px-3 py-1 rounded-full"
                style={{
                  color: meterColor(student.objectiveCompletion),
                  background: `${meterColor(student.objectiveCompletion)}14`,
                }}
              >
                {student.objectiveCompletion}%
              </span>
            </div>

            <div className="space-y-3">
              <MetricBar label="Weekly Momentum" value={student.weeklyMomentum} />
              <MetricBar label="Theory Understanding" value={student.theoryUnderstanding} />
              <MetricBar label="Practical Skill" value={student.practicalSkill} />
            </div>

            {student.coachSummary && (
              <p className="text-sm text-gray-600 mt-4 leading-relaxed">{student.coachSummary}</p>
            )}
          </div>

          {student.totalAssessments > 0 && (
            <div>
              <div className="flex justify-between mb-1.5">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1a2b5e" }}>
                  Assessment Completion
                </p>
                <span className="text-xs font-bold" style={{ color: scoreColor(student.completionRate) }}>
                  {student.completionRate}%
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#e5eaf5" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${student.completionRate}%`,
                    background: scoreColor(student.completionRate),
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {student.assessmentSubmissions.length} of {student.totalAssessments} assessments submitted
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2b5e" }}>
                Best Topic Fit
              </p>
              <div className="space-y-2">
                {student.strengths.length > 0 ? (
                  student.strengths.map((item) => (
                    <div
                      key={item.topic}
                      className="rounded-xl px-3 py-2"
                      style={{ background: "rgba(22,163,74,0.08)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "#166534" }}>
                        {item.topic}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">AI needs more evidence to identify a standout topic.</p>
                )}
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2b5e" }}>
                Growth Topics
              </p>
              <div className="space-y-2">
                {student.growthTopics.length > 0 ? (
                  student.growthTopics.map((item) => (
                    <div
                      key={item.topic}
                      className="rounded-xl px-3 py-2"
                      style={{ background: "rgba(220,38,38,0.06)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>
                        {item.topic}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">No major risk topic is visible right now.</p>
                )}
              </div>
            </div>
          </div>

          {student.recommendedSupport.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2b5e" }}>
                AI Support Plan
              </p>
              <div className="space-y-2">
                {student.recommendedSupport.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl px-3 py-2 text-sm text-gray-600"
                    style={{ background: "#f8fafc" }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {student.assessmentSubmissions.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2b5e" }}>
                Assessment Scores
              </p>
              <div className="space-y-2">
                {student.assessmentSubmissions.map((sub, i) => {
                  const pct = sub.total_marks > 0
                    ? Math.round((sub.ai_score / sub.total_marks) * 100)
                    : 0;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border"
                      style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={
                              sub.type === "quiz"
                                ? { background: "#dbeafe", color: "#1d4ed8" }
                                : { background: "#fef3c7", color: "#92400e" }
                            }
                          >
                            {sub.type === "quiz" ? "Quiz" : "Assignment"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold truncate" style={{ color: "#1a2b5e" }}>
                          {sub.title}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(sub.submitted_at).toLocaleDateString("en", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sub.rank !== null && (
                          <span className="text-xs text-gray-400">
                            #{sub.rank}/{sub.total_students}
                          </span>
                        )}
                        <span
                          className="text-sm font-extrabold px-2.5 py-1 rounded-full"
                          style={{ background: scoreBg(pct), color: scoreColor(pct) }}
                        >
                          {sub.ai_score}/{sub.total_marks}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2b5e" }}>
              Chat Activity (last 14 days)
            </p>
            <div className="flex items-end gap-1 h-20">
              {student.chatTimeline.map((day) => {
                const heightPct = day.count === 0 ? 0 : Math.max((day.count / maxChat) * 100, 8);
                const isToday = day.date === today;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none"
                      style={{ left: "50%", transform: "translateX(-50%)" }}
                    >
                      <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-1 whitespace-nowrap">
                        {day.count} msg{day.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${heightPct}%`,
                        minHeight: day.count > 0 ? "3px" : "0",
                        background: isToday ? "#c9a84c" : "#1a2b5e",
                        opacity: day.count === 0 ? 0.1 : isToday ? 1 : 0.7,
                      }}
                    />
                    <span className="text-[8px] text-gray-400">
                      {new Date(day.date + "T12:00:00").toLocaleDateString("en", {
                        weekday: "short",
                      }).slice(0, 1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AnalyticsClient({ courses }: Props) {
  const [openCourse, setOpenCourse] = useState<string>(courses[0]?.id ?? "");
  const [selectedStudent, setSelectedStudent] = useState<{
    student: Student;
    courseName: string;
  } | null>(null);

  return (
    <>
      <div className="space-y-4 max-w-6xl">
        {courses.map((course) => {
          const isOpen = openCourse === course.id;
          const sorted = [...course.students].sort((a, b) => b.goalProgress - a.goalProgress);

          return (
            <div
              key={course.id}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5eaf5" }}
            >
              <button
                onClick={() => setOpenCourse(isOpen ? "" : course.id)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors"
                style={{ background: isOpen ? "#f0f4ff" : "#fafbff" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(201,168,76,0.15)", color: "#92400e" }}
                  >
                    {course.code}
                  </span>
                  <span className="font-bold" style={{ color: "#1a2b5e" }}>
                    {course.name}
                  </span>
                  <span className="text-sm text-gray-400">
                    {course.students.length} student{course.students.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="p-5 border-t" style={{ borderColor: "#e5eaf5" }}>
                  {course.students.length === 0 ? (
                    <p className="text-sm text-gray-400">No enrolled students yet.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        {[
                          {
                            label: "Objective Coverage",
                            value: `${course.courseInsights.objectiveCoverage}%`,
                            color: meterColor(course.courseInsights.objectiveCoverage),
                            bg: `${meterColor(course.courseInsights.objectiveCoverage)}14`,
                          },
                          {
                            label: "Students Near Goal",
                            value: String(course.students.filter((student) => student.goalProgress >= 75).length),
                            color: "#166534",
                            bg: "#dcfce7",
                          },
                          {
                            label: "Need Support",
                            value: String(course.students.filter((student) => student.goalProgress < 55).length),
                            color: "#991b1b",
                            bg: "#fee2e2",
                          },
                          {
                            label: "Topic Experts",
                            value: String(course.topicTalentMap.length),
                            color: "#1a2b5e",
                            bg: "#eef1f9",
                          },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl p-4" style={{ background: item.bg }}>
                            <p className="text-2xl font-extrabold leading-none" style={{ color: item.color }}>
                              {item.value}
                            </p>
                            <p className="text-[11px] font-semibold mt-1" style={{ color: item.color }}>
                              {item.label}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div
                          className="rounded-2xl border p-4"
                          style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                        >
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#1a2b5e" }}>
                            AI Course Read
                          </p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {course.courseInsights.weeklyTrend}
                          </p>
                          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                            {course.courseInsights.personalizationSummary}
                          </p>
                          {course.courseInsights.atRiskTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {course.courseInsights.atRiskTopics.map((topic) => (
                                <span
                                  key={topic}
                                  className="text-xs px-2 py-1 rounded-full"
                                  style={{ background: "rgba(220,38,38,0.08)", color: "#991b1b" }}
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          className="rounded-2xl border p-4"
                          style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                        >
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#1a2b5e" }}>
                            Professor Actions
                          </p>
                          <div className="space-y-2">
                            {course.courseInsights.recommendedActions.map((action) => (
                              <div
                                key={action}
                                className="rounded-xl px-3 py-2 text-sm text-gray-600"
                                style={{ background: "#ffffff" }}
                              >
                                {action}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b" style={{ borderColor: "#e5eaf5" }}>
                              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400">Student</th>
                              <th className="text-center py-2 px-4 text-xs font-semibold text-gray-400">Goal</th>
                              <th className="text-center py-2 px-4 text-xs font-semibold text-gray-400">Objectives</th>
                              <th className="text-center py-2 px-4 text-xs font-semibold text-gray-400">Weekly</th>
                              <th className="text-center py-2 px-4 text-xs font-semibold text-gray-400">Theory / Practical</th>
                              <th className="text-left py-2 pl-4 text-xs font-semibold text-gray-400">Strongest Topics</th>
                              <th className="py-2 text-xs font-semibold text-gray-400" />
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((student) => (
                              <tr
                                key={student.studentId}
                                className="border-b last:border-0 cursor-pointer transition-colors"
                                style={{ borderColor: "#f1f5f9" }}
                                onClick={() => setSelectedStudent({ student, courseName: course.name })}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#f8f9ff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                }}
                              >
                                <td className="py-3 pr-4">
                                  <p className="font-medium" style={{ color: "#1a2b5e" }}>
                                    {student.fullName}
                                  </p>
                                  <p className="text-xs text-gray-400">{student.email}</p>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className="font-bold px-2 py-0.5 rounded-full text-xs"
                                    style={{
                                      color: meterColor(student.goalProgress),
                                      background: `${meterColor(student.goalProgress)}14`,
                                    }}
                                  >
                                    {student.goalProgress}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold" style={{ color: meterColor(student.objectiveCompletion) }}>
                                      {student.objectiveCompletion}%
                                    </span>
                                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "#e5eaf5" }}>
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${student.objectiveCompletion}%`,
                                          background: meterColor(student.objectiveCompletion),
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className="font-bold px-2 py-0.5 rounded-full text-xs"
                                    style={{
                                      color: meterColor(student.weeklyMomentum),
                                      background: `${meterColor(student.weeklyMomentum)}14`,
                                    }}
                                  >
                                    {student.weeklyMomentum}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1 text-xs">
                                    <span style={{ color: "#1d4ed8" }}>T {student.theoryUnderstanding}%</span>
                                    <span style={{ color: "#92400e" }}>P {student.practicalSkill}%</span>
                                  </div>
                                </td>
                                <td className="py-3 pl-4">
                                  {student.strengths.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {student.strengths.slice(0, 3).map((item) => (
                                        <span
                                          key={item.topic}
                                          className="text-xs px-2 py-0.5 rounded-full"
                                          style={{ background: "rgba(22,163,74,0.10)", color: "#166534" }}
                                        >
                                          {item.topic}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 text-xs">Need more evidence</span>
                                  )}
                                </td>
                                <td className="py-3 pl-2 pr-1">
                                  <span className="text-gray-300 text-xs">→</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {course.topicTalentMap.length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#94a3b8" }}>
                            Student Strength Map
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {course.topicTalentMap.map((item) => {
                              const names = item.studentIds
                                .map((studentId) =>
                                  course.students.find((student) => student.studentId === studentId)?.fullName
                                )
                                .filter(Boolean);

                              return (
                                <div
                                  key={item.topic}
                                  className="rounded-2xl border p-4"
                                  style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                                >
                                  <p className="text-sm font-bold" style={{ color: "#1a2b5e" }}>
                                    {item.topic}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.reason}</p>
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {names.map((name) => (
                                      <span
                                        key={name}
                                        className="text-xs px-2 py-1 rounded-full"
                                        style={{ background: "#eef1f9", color: "#1a2b5e" }}
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {course.aggregateTopics.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#94a3b8" }}>
                            Class-wide Struggle Topics
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {course.aggregateTopics.map(([topic, freq]) => (
                              <div
                                key={topic}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                                style={{ background: "#eef1f9" }}
                              >
                                <span className="font-medium" style={{ color: "#1a2b5e" }}>
                                  {topic}
                                </span>
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: "#1a2b5e", color: "white" }}
                                >
                                  {freq}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedStudent && (
        <StudentDetailPanel
          student={selectedStudent.student}
          courseName={selectedStudent.courseName}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}
