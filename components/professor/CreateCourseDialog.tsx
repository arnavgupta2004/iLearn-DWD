"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ──────────────────────────────────────────────────────────────────

type Difficulty = "undergraduate" | "graduate";

interface CourseUnit {
  unit_number: number;
  title: string;
  hours: number;
  topics: string[]; // stored as array, edited as newline-joined string
}

interface AssessmentWeights {
  quiz: number;
  project: number;
  midterm: number;
  endterm: number;
}

interface Textbook {
  title: string;
  author: string;
  url: string;
}

interface CourseForm {
  name: string;
  code: string;
  credits: number;
  faculty_name: string;
  required_knowledge: string;
  objectives: string[]; // edited as textarea, split by \n
  learning_outcomes: string[];
  difficulty_level: Difficulty;
  units: CourseUnit[];
  assessment_weights: AssessmentWeights;
  attendance_policy: string;
  textbooks: Textbook[];
}

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight_percent: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professorId: string;
}

// ── Default empty form ─────────────────────────────────────────────────────

function emptyForm(): CourseForm {
  return {
    name: "",
    code: "",
    credits: 3,
    faculty_name: "",
    required_knowledge: "",
    objectives: [],
    learning_outcomes: [],
    difficulty_level: "undergraduate",
    units: [],
    assessment_weights: { quiz: 10, project: 20, midterm: 30, endterm: 40 },
    attendance_policy: "",
    textbooks: [],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function weightSum(w: AssessmentWeights) {
  return w.quiz + w.project + w.midterm + w.endterm;
}

function rubricSum(criteria: RubricCriterion[]) {
  return criteria.reduce((s, c) => s + Number(c.weight_percent), 0);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
      {children}
    </label>
  );
}

function StyledInput({
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  className = "",
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all ${className}`}
      style={{ borderColor: "#dde3f0", background: "#fafbff" }}
      onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
      onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
    />
  );
}

function StyledTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none transition-all"
      style={{ borderColor: "#dde3f0", background: "#fafbff" }}
      onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
      onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
    />
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold mb-3 pb-2 border-b" style={{ color: "#1a2b5e", borderColor: "#e5eaf5" }}>
      {children}
    </h3>
  );
}

// ── Weight indicator bar ───────────────────────────────────────────────────

function WeightBar({ sum, label }: { sum: number; label: string }) {
  const ok = sum === 100;
  return (
    <div
      className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg font-medium"
      style={{
        background: ok ? "#ecfdf5" : "#fff7ed",
        color: ok ? "#065f46" : "#92400e",
      }}
    >
      <span>{label}</span>
      <span>{sum}% / 100%</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CreateCourseDialog({ open, onOpenChange, professorId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [form, setForm] = useState<CourseForm>(emptyForm());
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Textarea representations for array fields
  const [objectivesText, setObjectivesText] = useState("");
  const [outcomesText, setOutcomesText] = useState("");

  // ── Reset on close ────────────────────────────────────────────────────────
  function handleOpenChange(v: boolean) {
    if (!v) {
      setStep(1);
      setForm(emptyForm());
      setRubric([]);
      setFileName("");
      setUploadError("");
      setObjectivesText("");
      setOutcomesText("");
      setSaveError("");
    }
    onOpenChange(v);
  }

  // ── File upload helpers ───────────────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setUploadError("Only PDF files are supported.");
        return;
      }
      setUploadError("");
      setParsing(true);
      setFileName(file.name);

      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/courses/parse-syllabus", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Parse failed");

        const d = json.data as CourseForm;
        setForm(d);
        setObjectivesText((d.objectives ?? []).join("\n"));
        setOutcomesText((d.learning_outcomes ?? []).join("\n"));
        setStep(2);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to parse syllabus.");
      } finally {
        setParsing(false);
      }
    },
    []
  );

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // ── Form field helpers ────────────────────────────────────────────────────
  function setField<K extends keyof CourseForm>(key: K, val: CourseForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setWeight(key: keyof AssessmentWeights, val: string) {
    setForm((f) => ({
      ...f,
      assessment_weights: { ...f.assessment_weights, [key]: Number(val) || 0 },
    }));
  }

  function updateUnit(idx: number, key: keyof CourseUnit, val: string | number | string[]) {
    setForm((f) => {
      const units = [...f.units];
      units[idx] = { ...units[idx], [key]: val };
      return { ...f, units };
    });
  }

  function addUnit() {
    setForm((f) => ({
      ...f,
      units: [
        ...f.units,
        { unit_number: f.units.length + 1, title: "", hours: 0, topics: [] },
      ],
    }));
  }

  function removeUnit(idx: number) {
    setForm((f) => ({
      ...f,
      units: f.units
        .filter((_, i) => i !== idx)
        .map((u, i) => ({ ...u, unit_number: i + 1 })),
    }));
  }

  function updateTextbook(idx: number, key: keyof Textbook, val: string) {
    setForm((f) => {
      const textbooks = [...f.textbooks];
      textbooks[idx] = { ...textbooks[idx], [key]: val };
      return { ...f, textbooks };
    });
  }

  function addTextbook() {
    setForm((f) => ({
      ...f,
      textbooks: [...f.textbooks, { title: "", author: "", url: "" }],
    }));
  }

  function removeTextbook(idx: number) {
    setForm((f) => ({ ...f, textbooks: f.textbooks.filter((_, i) => i !== idx) }));
  }

  // ── Rubric helpers ────────────────────────────────────────────────────────
  function addCriterion() {
    setRubric((r) => [
      ...r,
      { id: uid(), name: "", description: "", weight_percent: 0 },
    ]);
  }

  function updateCriterion(id: string, key: keyof RubricCriterion, val: string | number) {
    setRubric((r) =>
      r.map((c) => (c.id === id ? { ...c, [key]: val } : c))
    );
  }

  function removeCriterion(id: string) {
    setRubric((r) => r.filter((c) => c.id !== id));
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaveError("");

    // Sync textarea → arrays before save
    const objectives = objectivesText.split("\n").map((s) => s.trim()).filter(Boolean);
    const learning_outcomes = outcomesText.split("\n").map((s) => s.trim()).filter(Boolean);
    const finalForm = { ...form, objectives, learning_outcomes };

    if (!finalForm.name.trim() || !finalForm.code.trim()) {
      setSaveError("Course name and code are required.");
      return;
    }
    if (rubric.length > 0 && rubricSum(rubric) !== 100) {
      setSaveError("Rubric weights must sum to exactly 100%.");
      return;
    }

    setSaving(true);
    try {
      // 1 — Insert course
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .insert({
          prof_id: professorId,
          name: finalForm.name,
          code: finalForm.code,
          credits: Number(finalForm.credits) || 0,
          faculty_name: finalForm.faculty_name,
          required_knowledge: finalForm.required_knowledge,
          objectives: finalForm.objectives,
          learning_outcomes: finalForm.learning_outcomes,
          difficulty_level: finalForm.difficulty_level,
          assessment_weights: finalForm.assessment_weights,
          attendance_policy: finalForm.attendance_policy,
          rubric_criteria: // eslint-disable-next-line @typescript-eslint/no-unused-vars
          rubric.map(({ id, ...rest }) => rest),
        })
        .select("id")
        .single();

      if (courseErr) throw new Error(courseErr.message);
      const courseId = course!.id;

      // 2 — Insert units
      if (finalForm.units.length > 0) {
        const { error: unitErr } = await supabase.from("course_units").insert(
          finalForm.units.map((u) => ({
            course_id: courseId,
            unit_number: u.unit_number,
            title: u.title,
            hours: Number(u.hours) || 0,
            topics: u.topics,
          }))
        );
        if (unitErr) throw new Error(unitErr.message);
      }

      // 3 — Insert textbooks
      const validBooks = finalForm.textbooks.filter((t) => t.title.trim());
      if (validBooks.length > 0) {
        const { error: bookErr } = await supabase.from("textbooks").insert(
          validBooks.map((t) => ({
            course_id: courseId,
            title: t.title,
            author: t.author,
            url: t.url,
          }))
        );
        if (bookErr) throw new Error(bookErr.message);
      }

      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // ── Assessment weight sum ─────────────────────────────────────────────────
  const assessSum = weightSum(form.assessment_weights);
  const rubSum = rubricSum(rubric);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: 780, width: "95vw", maxHeight: "92vh" }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b" style={{ borderColor: "#e5eaf5" }}>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold" style={{ color: "#1a2b5e" }}>
              Create New Course
            </DialogTitle>
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className="px-3 py-1 rounded-full"
                style={
                  step === 1
                    ? { background: "#1a2b5e", color: "#fff" }
                    : { background: "#e5eaf5", color: "#1a2b5e" }
                }
              >
                1 Upload
              </span>
              <span className="text-gray-300">→</span>
              <span
                className="px-3 py-1 rounded-full"
                style={
                  step === 2
                    ? { background: "#1a2b5e", color: "#fff" }
                    : { background: "#e5eaf5", color: "#9ca3af" }
                }
              >
                2 Review &amp; Save
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ── STEP 1: PDF upload ── */}
        {step === 1 && (
          <div className="px-6 py-8 flex flex-col items-center gap-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-14 px-8 transition-all select-none"
              style={{
                borderColor: dragging ? "#1a2b5e" : "#c9d3ea",
                background: dragging ? "#eef1f9" : "#fafbff",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileInput}
              />

              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#1a2b5e", borderTopColor: "transparent" }}
                  />
                  <p className="text-sm font-medium" style={{ color: "#1a2b5e" }}>
                    Extracting syllabus with Gemini AI…
                  </p>
                  <p className="text-xs text-gray-400">{fileName}</p>
                </div>
              ) : (
                <>
                  <div className="text-5xl mb-4">📄</div>
                  <p className="text-base font-semibold mb-1" style={{ color: "#1a2b5e" }}>
                    Drop your syllabus PDF here
                  </p>
                  <p className="text-sm text-gray-400 text-center">
                    or click to browse. Gemini will extract all course details automatically.
                  </p>
                </>
              )}
            </div>

            {uploadError && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg w-full max-w-lg text-center">
                {uploadError}
              </p>
            )}

            <p className="text-xs text-gray-400 max-w-sm text-center">
              Supported: text-based PDF syllabi. Scanned/image PDFs are not supported.
            </p>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>No PDF?</span>
              <button
                type="button"
                onClick={() => { setForm(emptyForm()); setObjectivesText(""); setOutcomesText(""); setStep(2); }}
                className="font-semibold underline underline-offset-2 hover:text-gray-600 transition-colors"
                style={{ color: "#1a2b5e" }}
              >
                Fill in manually instead →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Editable form ── */}
        {step === 2 && (
          <>
            <ScrollArea className="flex-1" style={{ maxHeight: "calc(92vh - 140px)" }}>
              <div className="px-6 py-5 space-y-7">

                {/* Basic Info */}
                <section>
                  <SectionHeading>Basic Information</SectionHeading>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <FieldLabel>Course Name</FieldLabel>
                      <StyledInput
                        value={form.name}
                        onChange={(v) => setField("name", v)}
                        placeholder="e.g. Introduction to Machine Learning"
                      />
                    </div>
                    <div>
                      <FieldLabel>Course Code</FieldLabel>
                      <StyledInput
                        value={form.code}
                        onChange={(v) => setField("code", v)}
                        placeholder="e.g. CS401"
                      />
                    </div>
                    <div>
                      <FieldLabel>Credits</FieldLabel>
                      <StyledInput
                        type="number"
                        value={form.credits}
                        onChange={(v) => setField("credits", Number(v))}
                        min={1}
                      />
                    </div>
                    <div>
                      <FieldLabel>Faculty Name</FieldLabel>
                      <StyledInput
                        value={form.faculty_name}
                        onChange={(v) => setField("faculty_name", v)}
                        placeholder="e.g. Dr. Ramesh Kumar"
                      />
                    </div>
                    <div>
                      <FieldLabel>Difficulty Level</FieldLabel>
                      <select
                        value={form.difficulty_level}
                        onChange={(e) => setField("difficulty_level", e.target.value as Difficulty)}
                        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                        style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                      >
                        <option value="undergraduate">Undergraduate</option>
                        <option value="graduate">Graduate</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Knowledge & Policy */}
                <section>
                  <SectionHeading>Knowledge & Policy</SectionHeading>
                  <div className="space-y-3">
                    <div>
                      <FieldLabel>Required Prior Knowledge / Prerequisites</FieldLabel>
                      <StyledTextarea
                        value={form.required_knowledge}
                        onChange={(v) => setField("required_knowledge", v)}
                        placeholder="e.g. Linear Algebra, Python programming, Probability"
                        rows={2}
                      />
                    </div>
                    <div>
                      <FieldLabel>Attendance Policy</FieldLabel>
                      <StyledTextarea
                        value={form.attendance_policy}
                        onChange={(v) => setField("attendance_policy", v)}
                        placeholder="e.g. Minimum 75% attendance required"
                        rows={2}
                      />
                    </div>
                  </div>
                </section>

                {/* Objectives */}
                <section>
                  <SectionHeading>Course Objectives</SectionHeading>
                  <FieldLabel>One objective per line</FieldLabel>
                  <StyledTextarea
                    value={objectivesText}
                    onChange={setObjectivesText}
                    placeholder={"Understand fundamental ML algorithms\nApply supervised learning techniques\n..."}
                    rows={4}
                  />
                </section>

                {/* Learning Outcomes */}
                <section>
                  <SectionHeading>Learning Outcomes</SectionHeading>
                  <FieldLabel>One outcome per line</FieldLabel>
                  <StyledTextarea
                    value={outcomesText}
                    onChange={setOutcomesText}
                    placeholder={"Students will be able to implement a neural network\n..."}
                    rows={4}
                  />
                </section>

                {/* Assessment Weights */}
                <section>
                  <SectionHeading>Assessment Weights</SectionHeading>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    {(["quiz", "project", "midterm", "endterm"] as (keyof AssessmentWeights)[]).map((k) => (
                      <div key={k}>
                        <FieldLabel>{k.charAt(0).toUpperCase() + k.slice(1)} %</FieldLabel>
                        <StyledInput
                          type="number"
                          value={form.assessment_weights[k]}
                          onChange={(v) => setWeight(k, v)}
                          min={0}
                        />
                      </div>
                    ))}
                  </div>
                  <WeightBar sum={assessSum} label="Assessment total" />
                </section>

                {/* Units */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeading>Course Units</SectionHeading>
                    <button
                      type="button"
                      onClick={addUnit}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: "#eef1f9", color: "#1a2b5e" }}
                    >
                      + Add Unit
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.units.map((unit, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border p-4 space-y-3"
                        style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#c9a84c" }}>
                            Unit {unit.unit_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeUnit(idx)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <FieldLabel>Title</FieldLabel>
                            <StyledInput
                              value={unit.title}
                              onChange={(v) => updateUnit(idx, "title", v)}
                              placeholder="e.g. Introduction to Neural Networks"
                            />
                          </div>
                          <div>
                            <FieldLabel>Hours</FieldLabel>
                            <StyledInput
                              type="number"
                              value={unit.hours}
                              onChange={(v) => updateUnit(idx, "hours", Number(v))}
                              min={0}
                            />
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Topics (one per line)</FieldLabel>
                          <StyledTextarea
                            value={unit.topics.join("\n")}
                            onChange={(v) =>
                              updateUnit(idx, "topics", v.split("\n").map((s) => s.trim()).filter(Boolean))
                            }
                            placeholder={"Perceptron model\nActivation functions\n..."}
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}
                    {form.units.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No units yet. Click &ldquo;Add Unit&rdquo; or re-upload a PDF with unit details.
                      </p>
                    )}
                  </div>
                </section>

                {/* Textbooks */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeading>Textbooks & References</SectionHeading>
                    <button
                      type="button"
                      onClick={addTextbook}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: "#eef1f9", color: "#1a2b5e" }}
                    >
                      + Add Book
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.textbooks.map((book, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-xl border p-3"
                        style={{ borderColor: "#e5eaf5" }}
                      >
                        <div>
                          <FieldLabel>Title</FieldLabel>
                          <StyledInput
                            value={book.title}
                            onChange={(v) => updateTextbook(idx, "title", v)}
                            placeholder="Book title"
                          />
                        </div>
                        <div>
                          <FieldLabel>Author</FieldLabel>
                          <StyledInput
                            value={book.author}
                            onChange={(v) => updateTextbook(idx, "author", v)}
                            placeholder="Author name"
                          />
                        </div>
                        <div>
                          <FieldLabel>URL (optional)</FieldLabel>
                          <StyledInput
                            value={book.url}
                            onChange={(v) => updateTextbook(idx, "url", v)}
                            placeholder="https://..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTextbook(idx)}
                          className="text-xs text-red-400 hover:text-red-600 pb-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {form.textbooks.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-2">No textbooks added.</p>
                    )}
                  </div>
                </section>

                {/* Rubric Builder */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeading>Rubric Builder</SectionHeading>
                    <button
                      type="button"
                      onClick={addCriterion}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: "#eef1f9", color: "#1a2b5e" }}
                    >
                      + Add Criterion
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Define evaluation criteria. All weights must sum to 100% before saving.
                  </p>
                  <div className="space-y-2">
                    {rubric.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border p-3 space-y-2"
                        style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
                      >
                        <div className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 items-end">
                          <div>
                            <FieldLabel>Criterion Name</FieldLabel>
                            <StyledInput
                              value={c.name}
                              onChange={(v) => updateCriterion(c.id, "name", v)}
                              placeholder="e.g. Code Quality"
                            />
                          </div>
                          <div>
                            <FieldLabel>Description</FieldLabel>
                            <StyledInput
                              value={c.description}
                              onChange={(v) => updateCriterion(c.id, "description", v)}
                              placeholder="What's evaluated?"
                            />
                          </div>
                          <div>
                            <FieldLabel>Weight %</FieldLabel>
                            <StyledInput
                              type="number"
                              value={c.weight_percent}
                              onChange={(v) => updateCriterion(c.id, "weight_percent", Number(v))}
                              min={0}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCriterion(c.id)}
                            className="text-xs text-red-400 hover:text-red-600 pb-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {rubric.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-2">
                        No criteria yet. Rubric is optional.
                      </p>
                    )}
                  </div>
                  {rubric.length > 0 && (
                    <div className="mt-3">
                      <WeightBar sum={rubSum} label="Rubric total" />
                    </div>
                  )}
                </section>

                {/* Bottom padding */}
                <div className="h-2" />
              </div>
            </ScrollArea>

            {/* Footer actions */}
            <div
              className="px-6 py-4 border-t flex items-center justify-between gap-3"
              style={{ borderColor: "#e5eaf5", background: "#ffffff" }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                ← Back to upload
              </button>
              <div className="flex items-center gap-3">
                {saveError && (
                  <p className="text-sm text-red-500">{saveError}</p>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "#1a2b5e" }}
                >
                  {saving ? "Saving…" : "Save Course"}
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
