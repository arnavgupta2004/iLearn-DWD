"use client";

import { useEffect, useState } from "react";

interface Match {
  studentId: string;
  name: string;
  email: string;
  canHelpYouWith: string;
  youCanHelpThemWith: string;
}

export default function StudyBuddiesSection({ courseId, studentId }: { courseId: string; studentId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/study-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, studentId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setMatches(data.matches || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [courseId, studentId]);

  if (loading || matches.length === 0) return null;

  return (
    <div className="px-5 py-4 border-t" style={{ borderColor: "#e5eaf5" }}>
      <p
        className="text-[11px] font-bold uppercase tracking-wider mb-3"
        style={{ color: "#1a2b5e" }}
      >
        🧑‍🤝‍🧑 AI Study Buddies
      </p>
      <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
        Based on class analytics, we matched you with peers who are strong in your struggle topics and vice versa.
      </p>
      <div className="space-y-3">
        {matches.map((m) => (
          <div
            key={m.studentId}
            className="p-3 border rounded-xl"
            style={{ borderColor: "#e5eaf5", background: "#f8f9ff" }}
          >
            <p className="text-sm font-semibold truncate" style={{ color: "#1a2b5e" }}>
              {m.name}
            </p>
            <p className="text-[10px] text-gray-500 mb-2 truncate">
              {m.email}
            </p>
            <div className="text-[10px] space-y-1 bg-white p-2 border rounded border-blue-100">
              <p>
                <span className="font-semibold text-green-700">Can help you with:</span>{" "}
                <span className="text-gray-800">{m.canHelpYouWith}</span>
              </p>
              <p>
                <span className="font-semibold text-blue-700">You can help them with:</span>{" "}
                <span className="text-gray-800">{m.youCanHelpThemWith}</span>
              </p>
            </div>
            <a
              href={`mailto:${m.email}?subject=Study Group for ${m.canHelpYouWith}&body=Hi ${m.name.split(' ')[0]},`}
              className="mt-2 w-full py-1.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors block text-center"
            >
              Email Peer
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
