"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { localDateTimeToIso } from "@/lib/calendar";

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

interface Props {
  courses: CourseOption[];
}

export default function CreateCalendarEventDialog({ courses }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<"class" | "meeting" | "office_hour" | "custom">("class");
  const [courseId, setCourseId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!title.trim() || !startAt) {
      setError("Title and start time are required.");
      return;
    }

    setLoading(true);
    try {
      const startAtIso = localDateTimeToIso(startAt);
      const endAtIso = endAt ? localDateTimeToIso(endAt) : null;

      if (endAtIso && new Date(endAtIso).getTime() < new Date(startAtIso).getTime()) {
        throw new Error("End time must be after the start time.");
      }

      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          eventType,
          courseId: courseId || null,
          startAt: startAtIso,
          endAt: endAtIso,
          location: location.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create event");
      setOpen(false);
      setTitle("");
      setDescription("");
      setEventType("class");
      setCourseId("");
      setStartAt("");
      setEndAt("");
      setLocation("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
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
        + Add Event
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
        className="relative w-full max-w-xl rounded-2xl p-6 shadow-2xl"
        style={{ background: "#ffffff" }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "#1a2b5e" }}>
              Add Calendar Event
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Schedule classes, meetings, office hours, or reminders.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-xl text-gray-400">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as typeof eventType)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "#dde3f0", background: "#fafbff" }}
              >
                <option value="class">Class</option>
                <option value="meeting">Meeting</option>
                <option value="office_hour">Office Hour</option>
                <option value="custom">Custom</option>
              </select>
            </div>
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
                <option value="">General / No course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ))}
              </select>
            </div>
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
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#dde3f0", background: "#fafbff" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Start
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "#dde3f0", background: "#fafbff" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                End
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "#dde3f0", background: "#fafbff" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room, Google Meet, office, etc."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#dde3f0", background: "#fafbff" }}
            />
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
              {loading ? "Saving..." : "Create Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
