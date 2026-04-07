"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InterviewRequest {
  id: string;
  title: string;
  agenda: string | null;
  preferred_start: string;
  preferred_end: string | null;
  status: string;
  response_note: string | null;
  courses: { name: string; code: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface Props {
  requests: InterviewRequest[];
}

export default function InterviewRequestsPanel({ requests }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  async function respond(id: string, status: "approved" | "declined") {
    setBusyId(id);
    const note = notesById[id]?.trim() ?? "";
    try {
      const res = await fetch("/api/calendar/interviews/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: id,
          status,
          responseNote: note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update request");
      setNotesById((current) => ({ ...current, [id]: "" }));
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
    >
      <div className="mb-4">
        <h2 className="text-base font-bold" style={{ color: "#1a2b5e" }}>
          Interview Requests
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Students can request interview/discussion slots with you.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-gray-400">No interview requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border p-4"
              style={{ borderColor: "#e5eaf5", background: "#ffffff" }}
            >
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: "#eef1f9", color: "#1a2b5e" }}
                >
                  {(request.status ?? "pending").toUpperCase()}
                </span>
                {request.courses?.code && (
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background: "#fef3c7", color: "#92400e" }}
                  >
                    {request.courses.code}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold" style={{ color: "#1a2b5e" }}>
                {request.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {request.profiles?.full_name ?? request.profiles?.email ?? "Student"} ·{" "}
                {new Date(request.preferred_start).toLocaleString("en", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {request.agenda && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  {request.agenda}
                </p>
              )}

              {request.status === "pending" && (
                <div className="mt-3">
                  <input
                    value={notesById[request.id] ?? ""}
                    onChange={(e) =>
                      setNotesById((current) => ({
                        ...current,
                        [request.id]: e.target.value,
                      }))
                    }
                    placeholder="Optional note to student..."
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none mb-2"
                    style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(request.id, "approved")}
                      disabled={busyId === request.id}
                      className="px-3 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: "#166534", color: "#ffffff" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => respond(request.id, "declined")}
                      disabled={busyId === request.id}
                      className="px-3 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: "#991b1b", color: "#ffffff" }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {request.response_note && (
                <p className="text-xs text-gray-500 mt-2">
                  Note: {request.response_note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
