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
}

interface Submission {
  id: string;
  assessment_id: string;
  ai_score: number | null;
  total_marks: number | null;
  rank: number | null;
  total_students: number | null;
  status: string;
}

interface Props {
  assessments: Assessment[];
  submissions: Submission[];
  courseId: string;
}

function formatDue(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const past = date < now;
  return { label: date.toLocaleDateString("en", { day: "numeric", month: "short" }), past };
}

export default function StudentAssessmentsSection({
  assessments,
  submissions,
  courseId,
}: Props) {
  const router = useRouter();
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuiz = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/assessments/micro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const errorData = await res.json();
        alert("Quiz Generation Failed: " + (errorData.error || "Unknown Error"));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const subMap = submissions.reduce<Record<string, Submission>>((acc, s) => {
    acc[s.assessment_id] = s;
    return acc;
  }, {});

  const pctColor = (score: number, total: number) => {
    const p = total > 0 ? score / total : 0;
    return p >= 0.8 ? "#16a34a" : p >= 0.5 ? "#d97706" : "#dc2626";
  };

  return (
    <>
      <div className="px-5 py-4">
        <div className="flex flex-row items-center justify-between mb-3">
          <p
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "#1a2b5e" }}
          >
            Quizzes & Requested Assignments
          </p>
          <button
            onClick={generateQuiz}
            disabled={isGenerating}
            className="text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50"
            style={{ background: "#eef1f9", color: "#1a2b5e" }}
          >
            {isGenerating ? "Generating..." : "+ Auto Micro-Quiz"}
          </button>
        </div>

        {assessments.length === 0 ? (
          <p className="text-xs text-gray-400">No assessments yet.</p>
        ) : (
          <div className="space-y-2">
            {assessments.map((a) => {
              const sub = subMap[a.id];
              const due = formatDue(a.due_date);
              const submitted = !!sub;
              const scored = sub?.ai_score !== null && sub?.ai_score !== undefined;

              return (
                <div
                  key={a.id}
                  className="rounded-xl border p-3"
                  style={{ borderColor: "#e5eaf5", background: "#f8f9ff" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={
                            a.type === "quiz"
                              ? { background: "#dbeafe", color: "#1d4ed8" }
                              : { background: "#fef3c7", color: "#92400e" }
                          }
                        >
                          {a.type === "quiz" ? "Quiz" : "Assignment Request"}
                        </span>
                        {due && (
                          <span
                            className="text-[10px]"
                            style={{ color: due.past ? "#ef4444" : "#6b7280" }}
                          >
                            {due.past ? "Closed" : `Due ${due.label}`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold truncate" style={{ color: "#1a2b5e" }}>
                        {a.title}
                      </p>
                      {a.type === "assignment" && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Requested by professor
                        </p>
                      )}
                    </div>

                    {scored ? (
                      <div className="text-right shrink-0">
                        <p
                          className="text-sm font-extrabold"
                          style={{ color: pctColor(sub.ai_score!, sub.total_marks ?? a.total_marks) }}
                        >
                          {sub.ai_score}/{sub.total_marks ?? a.total_marks}
                        </p>
                        {sub.rank !== null && (
                          <p className="text-[10px] text-gray-400">
                            #{sub.rank}/{sub.total_students}
                          </p>
                        )}
                      </div>
                    ) : submitted ? (
                      <span className="text-[10px] text-amber-600 font-semibold shrink-0">
                        Evaluating…
                      </span>
                    ) : null}
                  </div>

                  {!submitted ? (
                    <button
                      onClick={() => setActiveAssessment(a)}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: "#1a2b5e", color: "#fff" }}
                    >
                      {a.type === "quiz" ? "Take Quiz →" : "Submit Requested Assignment →"}
                    </button>
                  ) : (
                    <div
                      className="text-center py-1 rounded-lg text-xs font-semibold"
                      style={{ background: "#dcfce7", color: "#15803d" }}
                    >
                      ✓ Submitted
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
