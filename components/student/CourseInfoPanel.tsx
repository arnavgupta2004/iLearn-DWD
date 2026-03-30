"use client";

import { useState } from "react";

interface Unit {
  id: string;
  unit_number: number;
  title: string;
  hours: number;
  topics: string[];
}

interface AssessmentWeights {
  quiz: number;
  project: number;
  midterm: number;
  endterm: number;
}

interface Material {
  id: string;
  name: string;
  file_type: string;
  indexed: boolean;
}

interface Props {
  course: {
    name: string;
    code: string;
    credits: number;
    difficulty_level: string | null;
    faculty_name: string | null;
    assessment_weights: AssessmentWeights | null;
  };
  units: Unit[];
  materials: Material[];
}

const WEIGHT_COLORS: Record<string, string> = {
  quiz: "#3b82f6",
  project: "#8b5cf6",
  midterm: "#f59e0b",
  endterm: "#ef4444",
};

function fileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word")) return "📝";
  if (mimeType.includes("presentation")) return "📊";
  return "📎";
}

export default function CourseInfoPanel({ course, units, materials }: Props) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  function toggleUnit(id: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const weights = course.assessment_weights ?? {
    quiz: 0,
    project: 0,
    midterm: 0,
    endterm: 0,
  };

  return (
    <aside
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 340,
        minWidth: 340,
        borderLeft: "1px solid #e5eaf5",
        background: "#fafbff",
      }}
    >
      {/* Course header */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "#e5eaf5" }}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{ background: "rgba(201,168,76,0.15)", color: "#92400e" }}
        >
          {course.code}
        </span>
        <h2
          className="font-extrabold text-sm leading-snug mt-2"
          style={{ color: "#1a2b5e" }}
        >
          {course.name}
        </h2>
        {course.faculty_name && (
          <p className="text-xs text-gray-400 mt-0.5">{course.faculty_name}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{course.credits} credits</span>
          <span>·</span>
          <span className="capitalize">{course.difficulty_level ?? "undergraduate"}</span>
        </div>
      </div>

      {/* Assessment weights */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "#e5eaf5" }}>
        <p
          className="text-[11px] font-bold uppercase tracking-wider mb-3"
          style={{ color: "#1a2b5e" }}
        >
          Assessment
        </p>

        {/* Stacked bar */}
        <div className="flex h-2 rounded-full overflow-hidden mb-3 gap-0.5">
          {(["quiz", "project", "midterm", "endterm"] as const).map((k) =>
            weights[k] > 0 ? (
              <div
                key={k}
                style={{
                  width: `${weights[k]}%`,
                  background: WEIGHT_COLORS[k],
                  borderRadius: 2,
                }}
              />
            ) : null
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {(["quiz", "project", "midterm", "endterm"] as const).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: WEIGHT_COLORS[k] }}
              />
              <span className="text-xs text-gray-600 capitalize">{k}</span>
              <span className="text-xs font-semibold ml-auto" style={{ color: "#1a2b5e" }}>
                {weights[k]}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Units */}
      <div className="px-5 py-4 border-b flex-1" style={{ borderColor: "#e5eaf5" }}>
        <p
          className="text-[11px] font-bold uppercase tracking-wider mb-3"
          style={{ color: "#1a2b5e" }}
        >
          Syllabus Units
        </p>

        {units.length === 0 ? (
          <p className="text-xs text-gray-400">No units listed.</p>
        ) : (
          <div className="space-y-1.5">
            {units.map((unit) => {
              const expanded = expandedUnits.has(unit.id);
              return (
                <div key={unit.id}>
                  <button
                    onClick={() => toggleUnit(unit.id)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-left transition-colors"
                    style={{ background: expanded ? "#eef1f9" : "transparent" }}
                    onMouseEnter={(e) => {
                      if (!expanded)
                        (e.currentTarget as HTMLElement).style.background = "#f3f4f8";
                    }}
                    onMouseLeave={(e) => {
                      if (!expanded)
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-[10px] font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "#1a2b5e", color: "#c9a84c" }}
                      >
                        {unit.unit_number}
                      </span>
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: "#1a2b5e" }}
                      >
                        {unit.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-gray-400">{unit.hours}h</span>
                      <span className="text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {expanded && unit.topics.length > 0 && (
                    <ul className="ml-7 mt-1 mb-1 space-y-0.5">
                      {unit.topics.map((topic, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                          <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-gray-300" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Materials */}
      <div className="px-5 py-4">
        <p
          className="text-[11px] font-bold uppercase tracking-wider mb-3"
          style={{ color: "#1a2b5e" }}
        >
          Course Materials
        </p>

        {materials.length === 0 ? (
          <p className="text-xs text-gray-400">No materials uploaded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                style={{ background: "#f3f4f8" }}
              >
                <span className="text-sm shrink-0">{fileIcon(mat.file_type)}</span>
                <span
                  className="text-xs truncate flex-1 font-medium"
                  style={{ color: "#1a2b5e" }}
                >
                  {mat.name}
                </span>
                {mat.indexed && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: "#dcfce7", color: "#15803d" }}
                  >
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
