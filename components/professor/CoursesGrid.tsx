"use client";

import { useState } from "react";
import CreateCourseDialog from "./CreateCourseDialog";

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  difficulty_level: string | null;
  enrollments: { count: number }[];
}

interface Props {
  courses: Course[];
  professorId: string;
}

export default function CoursesGrid({ courses, professorId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#1a2b5e" }}>
            My Courses
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {courses.length} course{courses.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#1a2b5e" }}
        >
          <span className="text-base">+</span>
          Create Course
        </button>
      </div>

      {/* Course grid */}
      {courses.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed"
          style={{ borderColor: "#c9d3ea", background: "#fafbff" }}
        >
          <div className="text-5xl mb-4">📚</div>
          <p className="text-lg font-bold mb-1" style={{ color: "#1a2b5e" }}>
            No courses yet
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Upload a syllabus PDF to create your first course.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#1a2b5e" }}
          >
            + Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((course) => {
            const enrolled = course.enrollments?.[0]?.count ?? 0;
            const level = course.difficulty_level ?? "undergraduate";
            return (
              <div
                key={course.id}
                className="rounded-2xl border bg-white p-5 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer"
                style={{ borderColor: "#e5eaf5" }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 font-bold"
                    style={{ background: "#eef1f9", color: "#1a2b5e" }}
                  >
                    {course.name[0]?.toUpperCase() ?? "C"}
                  </div>
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{
                      background: level === "graduate" ? "rgba(201,168,76,0.15)" : "#eef1f9",
                      color: level === "graduate" ? "#92400e" : "#1a2b5e",
                    }}
                  >
                    {level}
                  </span>
                </div>

                {/* Course info */}
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#c9a84c" }}>
                    {course.code}
                  </p>
                  <h3 className="font-bold text-base leading-snug" style={{ color: "#1a2b5e" }}>
                    {course.name}
                  </h3>
                </div>

                {/* Stats footer */}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#e5eaf5" }}>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <span>👥</span>
                    <span>
                      <strong className="text-gray-700">{enrolled}</strong> enrolled
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <span>📖</span>
                    <span>
                      <strong className="text-gray-700">{course.credits}</strong> credits
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateCourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        professorId={professorId}
      />
    </div>
  );
}
