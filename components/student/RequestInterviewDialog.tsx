"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { localDateTimeToIso } from "@/lib/calendar";

interface CourseOption {
  id: string;
  name: string;
  code: string;
  prof_id: string;
  faculty_name: string | null;
}

interface Props {
  courses: CourseOption[];
}

export default function RequestInterviewDialog({ courses }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("Interview Request");
  const [agenda, setAgenda] = useState("");
  const [preferredStart, setPreferredStart] = useState("");
  const [preferredEnd, setPreferredEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!courseId || !agenda.trim() || !preferredStart) {
      setError("Course, agenda, and preferred start time are required.");
      return;
    }

    setLoading(true);
    try {
      const preferredStartIso = localDateTimeToIso(preferredStart);
      const preferredEndIso = preferredEnd ? localDateTimeToIso(preferredEnd) : null;

      if (preferredEndIso && new Date(preferredEndIso).getTime() < new Date(preferredStartIso).getTime()) {
        throw new Error("Preferred end time must be after the start time.");
      }

      const res = await fetch("/api/calendar/interviews/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          agenda: agenda.trim(),
          preferredStart: preferredStartIso,
          preferredEnd: preferredEndIso,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to request interview");
      setOpen(false);
      setTitle("Interview Request");
      setAgenda("");
      setPreferredStart("");
      setPreferredEnd("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request interview");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: "#1a2b5e", color: "#ffffff" }}
      >
        + Request Interview
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(10,20,55,0.45)" }}
        onClick={() => setOpen(false)}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{ background: "#ffffff" }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "#1a2b5e" }}>
              Request Interview
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Ask your professor for a discussion slot.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-xl text-gray-400">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#dde3f0", background: "#fafbff" }}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#dde3f0", background: "#fafbff" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Agenda
            </label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={4}
              placeholder="What do you want to discuss?"
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#dde3f0", background: "#fafbff" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Preferred Start
              </label>
              <input
                type="datetime-local"
                value={preferredStart}
                onChange={(e) => setPreferredStart(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "#dde3f0", background: "#fafbff" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Preferred End
              </label>
              <input
                type="datetime-local"
                value={preferredEnd}
                onChange={(e) => setPreferredEnd(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "#dde3f0", background: "#fafbff" }}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
              style={{ borderColor: "#dbe4f3", color: "#64748b" }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "#1a2b5e", color: "#ffffff" }}
            >
              {loading ? "Requesting..." : "Send Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
