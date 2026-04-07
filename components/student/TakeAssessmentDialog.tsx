"use client";

import { useState, useEffect } from "react";

interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  question_type: "mcq" | "short_answer";
  options: string[] | null;
  marks: number;
}

interface BreakdownItem {
  question_number: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  earned: number;
  max: number;
  feedback: string;
}

interface AssignmentBreakdown {
  strengths: string[];
  improvements: string[];
  mistakes: string[];
}

interface Result {
  score: number;
  totalMarks: number;
  rank: number;
  totalStudents: number;
  feedback: string;
  breakdown: BreakdownItem[] | AssignmentBreakdown;
}

interface Assessment {
  id: string;
  title: string;
  type: "quiz" | "assignment";
  description: string | null;
  total_marks: number;
  due_date: string | null;
}

interface Props {
  assessment: Assessment;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function TakeAssessmentDialog({ assessment, onClose, onSubmitted }: Props) {
  const [phase, setPhase] = useState<"loading" | "quiz" | "assignment" | "submitting" | "result" | "error">(
    assessment.type === "quiz" ? "loading" : "assignment"
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Load quiz questions on mount
  useEffect(() => {
    if (assessment.type !== "quiz") return;
    (async () => {
      try {
        const res = await fetch(`/api/assessments/${assessment.id}/questions`);
        const data = await res.json();
        setQuestions(data.questions ?? []);
        setPhase("quiz");
      } catch {
        setErrorMsg("Failed to load questions.");
        setPhase("error");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment.id, assessment.type]);

  async function submitQuiz() {
    setPhase("submitting");
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/submit-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Submission failed."); setPhase("error"); return; }
      setResult(data);
      setPhase("result");
      onSubmitted?.();
    } catch (e) {
      setErrorMsg(String(e));
      setPhase("error");
    }
  }

  async function submitAssignment() {
    if (!file) { setErrorMsg("Please select a PDF file."); return; }
    setPhase("submitting");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/assessments/${assessment.id}/submit-assignment`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Submission failed."); setPhase("error"); return; }
      setResult(data);
      setPhase("result");
      onSubmitted?.();
    } catch (e) {
      setErrorMsg(String(e));
      setPhase("error");
    }
  }

  const pctColor = (score: number, total: number) => {
    const p = total > 0 ? score / total : 0;
    return p >= 0.8 ? "#16a34a" : p >= 0.5 ? "#d97706" : "#dc2626";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(10,20,55,0.45)" }}
        onClick={phase !== "submitting" ? onClose : undefined}
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-7"
        style={{ background: "#ffffff" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={
                  assessment.type === "quiz"
                    ? { background: "#dbeafe", color: "#1d4ed8" }
                    : { background: "#fef3c7", color: "#92400e" }
                }
              >
                {assessment.type === "quiz" ? "🧩 Quiz" : "📎 Assignment Request"}
              </span>
              <span className="text-xs text-gray-400">{assessment.total_marks} marks</span>
            </div>
            <h2 className="text-lg font-extrabold" style={{ color: "#1a2b5e" }}>
              {assessment.title}
            </h2>
            {assessment.description && (
              <p className="text-sm text-gray-500 mt-0.5">{assessment.description}</p>
            )}
            {assessment.type === "assignment" && (
              <p className="text-xs text-gray-400 mt-1">
                Your professor has requested a PDF submission for this assignment.
              </p>
            )}
          </div>
          {phase !== "submitting" && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-4">
              ✕
            </button>
          )}
        </div>

        {/* Loading */}
        {phase === "loading" && (
          <div className="text-center py-12 text-gray-400">Loading questions…</div>
        )}

        {/* Quiz */}
        {phase === "quiz" && (
          <div className="space-y-6">
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border p-4"
                style={{ borderColor: "#e5eaf5" }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold" style={{ color: "#1a2b5e" }}>
                    Q{q.question_number}. {q.question_text}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                </div>

                {q.question_type === "mcq" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt, i) => {
                      const letter = ["A", "B", "C", "D"][i];
                      const selected = answers[q.id] === opt;
                      return (
                        <button
                          key={i}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm text-left transition-all"
                          style={
                            selected
                              ? { borderColor: "#1a2b5e", background: "#eef1f9", color: "#1a2b5e" }
                              : { borderColor: "#e5eaf5", background: "#fafbff", color: "#374151" }
                          }
                        >
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={
                              selected
                                ? { background: "#1a2b5e", color: "#fff" }
                                : { background: "#e5eaf5", color: "#6b7280" }
                            }
                          >
                            {letter}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    placeholder="Your answer…"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                  />
                )}
              </div>
            ))}

            {errorMsg && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "#e5eaf5", color: "#6b7280" }}
              >
                Cancel
              </button>
              <button
                onClick={submitQuiz}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "#1a2b5e", color: "#fff" }}
              >
                Submit Quiz
              </button>
            </div>
          </div>
        )}

        {/* Assignment upload */}
        {phase === "assignment" && (
          <div className="space-y-5">
            <div
              className="rounded-xl border-2 border-dashed p-8 text-center"
              style={{ borderColor: "#c9a84c" }}
            >
              <p className="text-3xl mb-2">📎</p>
              <p className="text-sm font-semibold mb-1" style={{ color: "#1a2b5e" }}>
                Upload your requested assignment PDF
              </p>
              <p className="text-xs text-gray-400 mb-4">AI will evaluate and score it instantly</p>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="assignment-file"
              />
              <label
                htmlFor="assignment-file"
                className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: "#1a2b5e", color: "#fff" }}
              >
                Choose PDF
              </label>
              {file && (
                <p className="text-xs text-gray-500 mt-3 font-medium">
                  ✓ {file.name}
                </p>
              )}
            </div>

            {errorMsg && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "#e5eaf5", color: "#6b7280" }}
              >
                Cancel
              </button>
              <button
                onClick={submitAssignment}
                disabled={!file}
                className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "#1a2b5e", color: "#fff" }}
              >
                Submit Requested Assignment
              </button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {phase === "submitting" && (
          <div className="text-center py-14 space-y-3">
            <div className="text-4xl animate-pulse">🤖</div>
            <p className="font-bold" style={{ color: "#1a2b5e" }}>AI is evaluating your submission…</p>
            <p className="text-sm text-gray-400">This may take a few seconds.</p>
          </div>
        )}

        {/* Result */}
        {phase === "result" && result && (
          <div className="space-y-5">
            {/* Score card */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "#fafbff", border: "1px solid #e5eaf5" }}
            >
              <p className="text-5xl font-extrabold" style={{ color: pctColor(result.score, result.totalMarks) }}>
                {result.score}
                <span className="text-2xl text-gray-400">/{result.totalMarks}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {Math.round((result.score / result.totalMarks) * 100)}%
              </p>
              <div className="flex justify-center gap-6 mt-4">
                <div>
                  <p className="text-lg font-extrabold" style={{ color: "#1a2b5e" }}>
                    #{result.rank}
                  </p>
                  <p className="text-xs text-gray-400">Rank</p>
                </div>
                <div className="w-px" style={{ background: "#e5eaf5" }} />
                <div>
                  <p className="text-lg font-extrabold" style={{ color: "#1a2b5e" }}>
                    {result.totalStudents}
                  </p>
                  <p className="text-xs text-gray-400">Students</p>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div
              className="rounded-xl p-4"
              style={{ background: "#eef1f9", border: "1px solid #dde3f0" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1a2b5e" }}>
                AI Feedback
              </p>
              <p className="text-sm text-gray-700">{result.feedback}</p>
            </div>

            {/* Quiz breakdown */}
            {assessment.type === "quiz" && Array.isArray(result.breakdown) && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1a2b5e" }}>
                  Question Breakdown
                </p>
                {(result.breakdown as BreakdownItem[]).map((item) => (
                  <div
                    key={item.question_number}
                    className="rounded-xl p-3 border"
                    style={{
                      borderColor: item.earned === item.max ? "#bbf7d0" : "#fecaca",
                      background: item.earned === item.max ? "#f0fdf4" : "#fff5f5",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium" style={{ color: "#1a2b5e" }}>
                        Q{item.question_number}. {item.question_text}
                      </p>
                      <span
                        className="text-xs font-bold shrink-0"
                        style={{ color: item.earned === item.max ? "#15803d" : "#b91c1c" }}
                      >
                        {item.earned}/{item.max}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.feedback}</p>
                    {item.earned < item.max && item.correct_answer && (
                      <p className="text-xs mt-1" style={{ color: "#15803d" }}>
                        Correct answer: {item.correct_answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Assignment breakdown */}
            {assessment.type === "assignment" && !Array.isArray(result.breakdown) && (
              <div className="space-y-3">
                {(result.breakdown as AssignmentBreakdown).strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2 text-green-700">Strengths</p>
                    <ul className="space-y-1">
                      {(result.breakdown as AssignmentBreakdown).strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-green-500 shrink-0">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(result.breakdown as AssignmentBreakdown).mistakes?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2 text-red-700">Mistakes</p>
                    <ul className="space-y-1">
                      {(result.breakdown as AssignmentBreakdown).mistakes.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-red-500 shrink-0">✗</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(result.breakdown as AssignmentBreakdown).improvements?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2 text-amber-700">Areas to Improve</p>
                    <ul className="space-y-1">
                      {(result.breakdown as AssignmentBreakdown).improvements.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-amber-500 shrink-0">→</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-2"
              style={{ background: "#1a2b5e", color: "#fff" }}
            >
              Done
            </button>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="text-center py-10 space-y-3">
            <p className="text-3xl">⚠️</p>
            <p className="font-bold text-red-600">{errorMsg}</p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#1a2b5e", color: "#fff" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
