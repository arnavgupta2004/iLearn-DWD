"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const NAV = [
  { label: "My Courses", href: "/dashboard/student", icon: "📚" },
  { label: "Submissions", href: "/dashboard/student/submissions", icon: "📋" },
  { label: "My Progress", href: "/dashboard/student/progress", icon: "📈" },
];

interface Props {
  fullName: string | null;
}

export default function StudentSidebar({ fullName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  const initials = fullName
    ? fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "S";

  return (
    <aside
      className="flex flex-col h-full w-[240px] shrink-0"
      style={{ background: "linear-gradient(180deg, #1a2b5e 0%, #162550 100%)" }}
    >
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm"
            style={{ background: "#c9a84c", color: "#1a2b5e" }}
          >
            E
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">EduAI</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#c9a84c" }}>
              Student Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={
                active
                  ? { background: "rgba(255,255,255,0.15)", color: "#ffffff" }
                  : { color: "#93afd4" }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#93afd4";
                }
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "rgba(201,168,76,0.25)", color: "#c9a84c" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {fullName ?? "Student"}
            </p>
            <p className="text-blue-300 text-[11px]">Student</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full text-xs text-blue-300 hover:text-white py-2 px-3 rounded-lg transition-colors text-left"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.08)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "transparent")
          }
        >
          → Sign out
        </button>
      </div>
    </aside>
  );
}
