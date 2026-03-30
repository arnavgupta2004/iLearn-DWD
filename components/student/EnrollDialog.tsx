"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentId: string;
}

export default function EnrollDialog({ open, onOpenChange, studentId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleClose(v: boolean) {
    if (!v) {
      setCode("");
      setError("");
      setSuccess("");
    }
    onOpenChange(v);
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    // Find course by code
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, name")
      .ilike("code", code.trim())
      .single();

    if (courseErr || !course) {
      setError("No course found with that code. Double-check and try again.");
      setLoading(false);
      return;
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", course.id)
      .maybeSingle();

    if (existing) {
      setError("You are already enrolled in this course.");
      setLoading(false);
      return;
    }

    // Enroll
    const { error: enrollErr } = await supabase.from("enrollments").insert({
      student_id: studentId,
      course_id: course.id,
    });

    if (enrollErr) {
      setError(enrollErr.message);
      setLoading(false);
      return;
    }

    setSuccess(`Enrolled in "${course.name}" successfully!`);
    setLoading(false);
    setTimeout(() => {
      handleClose(false);
      router.refresh();
    }, 1200);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold" style={{ color: "#1a2b5e" }}>
            Enroll in a Course
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleEnroll} className="mt-2 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Course Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS401"
              required
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{ borderColor: "#dde3f0", background: "#fafbff" }}
              onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
              onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
            />
            <p className="text-xs text-gray-400 mt-1">
              Get the code from your professor.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg font-medium">
              ✓ {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "#1a2b5e" }}
          >
            {loading ? "Enrolling…" : "Enroll"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
