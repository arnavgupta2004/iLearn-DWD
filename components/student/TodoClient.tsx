"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TakeAssessmentDialog from "./TakeAssessmentDialog";

interface Assessment {
  id: string;
  title: string;
  type: "quiz" | "assignment";
  description: string | null;
  due_date: string | null;
  total_marks: number;
  created_at: string;
  course_id: string;
  courseName: string;
  courseCode: string;
  submitted: boolean;
  submission: {
    id: string;
    ai_score: number | null;
    total_marks: number | null;
    rank: number | null;
    total_students: number | null;
    status: string;
    submitted_at: string;
  } | null;
}

interface Props {
  pending: Assessment[];
  completed: Assessment[];
}

function getUrgency(due_date: string | null): "overdue" | "today" | "soon" | "upcoming" | "none" {
  if (!due_date) return "none";
  const now = new Date();
  const due = new Date(due_date);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return "overdue";
  if (diffDays < 1) return "today";
  if (diffDays <= 3) return "soon";
  return "upcoming";
}

const URGENCY_CONFIG = {
  overdue: { label: "Overdue", bg: "#fee2e2", color: "#b91c1c", border: "#fecaca", dot: "#ef4444" },
  today:   { label: "Due Today", bg: "#fef3c7", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
  soon:    { label: "Due Soon", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", dot: "#f97316" },
  upcoming:{ label: "Upcoming", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
  none:    { label: "No Due Date", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", dot: "#94a3b8" },
};

function formatDue(due_date: string | null) {
  if (!due_date) return "No due date";
  const due = new Date(due_date);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    return `Overdue by ${overdueDays} day${overdueDays !== 1 ? "s" : ""}`;
  }
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${diffDays} days`;

  return `Due ${due.toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: due.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })}`;
}

function formatFullDate(due_date: string | null) {
  if (!due_date) return null;
  return new Date(due_date).toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TodoClient({ pending, completed }: Props) {
  const router = useRouter();
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const pctColor = (score: number, total: number) => {
    const p = total > 0 ? score / total : 0;
    return p >= 0.8 ? "#16a34a" : p >= 0.5 ? "#d97706" : "#dc2626";
  };

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl">
        {[
          { label: "Pending", value: pending.length, color: "#1a2b5e", bg: "#eef1f9" },
          {
            label: "Overdue",
            value: pending.filter((a) => getUrgency(a.due_date) === "overdue").length,
            color: "#b91c1c",
            bg: "#fee2e2",
          },
          { label: "Completed", value: completed.length, color: "#15803d", bg: "#dcfce7" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 text-center border"
            style={{ background: s.bg, borderColor: "transparent" }}
          >
            <p className="text-3xl font-extrabold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: s.color }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Pending */}
      <div className="max-w-2xl space-y-3 mb-8">
        {pending.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
          >
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-sm font-bold" style={{ color: "#1a2b5e" }}>
              All caught up!
            </p>
            <p className="text-xs text-gray-400 mt-1">No pending assessments.</p>
          </div>
        ) : (
          pending.map((a) => {
            const urgency = getUrgency(a.due_date);
            const cfg = URGENCY_CONFIG[urgency];

            return (
              <div
                key={a.id}
                className="rounded-2xl border p-5"
                style={{ borderColor: cfg.border, background: cfg.bg }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Course + type badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(26,43,94,0.1)", color: "#1a2b5e" }}
                      >
                        {a.courseCode}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={
                          a.type === "quiz"
                            ? { background: "#dbeafe", color: "#1d4ed8" }
                            : { background: "#ede9fe", color: "#6d28d9" }
                        }
                      >
                        {a.type === "quiz" ? "🧩 Quiz" : "📎 Assignment Request"}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: `${cfg.color}15`, color: cfg.color }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: cfg.dot }}
                        />
                        {cfg.label}
                      </span>
                    </div>

                    <p className="text-base font-extrabold mb-0.5" style={{ color: "#1a2b5e" }}>
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-500 mb-1">{a.courseName}</p>
                    {a.type === "assignment" && (
                      <p className="text-xs text-gray-500 mb-2">
                        Professor requested a PDF submission for this assignment.
                      </p>
                    )}

                    {a.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{a.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-semibold" style={{ color: cfg.color }}>
                        {formatDue(a.due_date)}
                      </span>
                      {formatFullDate(a.due_date) && (
                        <span className="text-gray-400">({formatFullDate(a.due_date)})</span>
                      )}
                      <span>{a.total_marks} marks</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveAssessment(a)}
                    className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "#1a2b5e", color: "#fff" }}
                  >
                    {a.type === "quiz" ? "Take Quiz" : "Submit PDF"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Completed toggle */}
      {completed.length > 0 && (
        <div className="max-w-2xl">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold mb-4"
            style={{ color: "#1a2b5e" }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              {showCompleted ? "▲" : "▼"}
            </span>
            Completed ({completed.length})
          </button>

          {showCompleted && (
            <div className="space-y-2">
              {completed.map((a) => {
                const sub = a.submission;
                const scored = sub?.ai_score !== null && sub?.ai_score !== undefined;

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl border p-4 flex items-center justify-between gap-4"
                    style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "#dcfce7" }}
                      >
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(26,43,94,0.08)", color: "#1a2b5e" }}
                          >
                            {a.courseCode}
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={
                              a.type === "quiz"
                                ? { background: "#dbeafe", color: "#1d4ed8" }
                                : { background: "#ede9fe", color: "#6d28d9" }
                            }
                          >
                            {a.type === "quiz" ? "Quiz" : "Assignment"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold truncate" style={{ color: "#1a2b5e" }}>
                          {a.title}
                        </p>
                        <p className="text-xs text-gray-400">{a.courseName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {sub?.submitted_at && (
                        <p className="text-xs text-gray-400">
                          Submitted{" "}
                          {new Date(sub.submitted_at).toLocaleDateString("en", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                      {scored && (
                        <div className="text-right">
                          <p
                            className="text-sm font-extrabold"
                            style={{
                              color: pctColor(sub!.ai_score!, sub!.total_marks ?? a.total_marks),
                            }}
                          >
                            {sub!.ai_score}/{sub!.total_marks ?? a.total_marks}
                          </p>
                          {sub?.rank !== null && sub?.rank !== undefined && (
                            <p className="text-[10px] text-gray-400">
                              #{sub.rank}/{sub.total_students}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeAssessment && (
        <TakeAssessmentDialog
          assessment={activeAssessment}
          onClose={() => setActiveAssessment(null)}
          onSubmitted={() => {
            setActiveAssessment(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
