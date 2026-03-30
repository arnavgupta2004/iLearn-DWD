"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Role = "professor" | "student";
type Tab = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("login");

  // --- Login state ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // --- Signup state ---
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<Role>("student");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error || !data.user) {
      setLoginError(error?.message ?? "Login failed.");
      setLoginLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    router.push(`/dashboard/${profile?.role ?? "student"}`);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError("");
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { full_name: signupName, role: signupRole } },
    });
    if (error || !data.user) {
      setSignupError(error?.message ?? "Sign-up failed.");
      setSignupLoading(false);
      return;
    }
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: signupEmail,
      full_name: signupName,
      role: signupRole,
    });
    setSignupLoading(false);
    if (data.session) {
      router.push(`/dashboard/${signupRole}`);
    } else {
      setSignupSuccess(true);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] px-16 py-14"
        style={{ background: "linear-gradient(145deg, #1a2b5e 0%, #243a7a 60%, #1a2b5e 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg"
            style={{ background: "#c9a84c", color: "#1a2b5e" }}
          >
            E
          </div>
          <span className="text-white font-bold text-xl tracking-tight">EduAI</span>
        </div>

        {/* Hero copy */}
        <div className="space-y-6">
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: "rgba(201,168,76,0.18)", color: "#c9a84c" }}
          >
            Institute of National Importance
          </div>
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            The smarter way<br />
            to <span style={{ color: "#c9a84c" }}>learn & teach</span><br />
            at IIIT Dharwad.
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed max-w-md">
            AI-powered Q&amp;A, RAG over course materials, automated evaluation,
            and real-time analytics — built for professors and students alike.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["AI Chat Tutor", "Smart Evaluation", "Course RAG", "Progress Analytics"].map((f) => (
              <span
                key={f}
                className="text-sm px-3 py-1.5 rounded-full font-medium"
                style={{ background: "rgba(255,255,255,0.08)", color: "#e0e8ff" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} IIIT Dharwad. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold"
            style={{ background: "#1a2b5e", color: "#c9a84c" }}
          >
            E
          </div>
          <span className="font-bold text-xl" style={{ color: "#1a2b5e" }}>EduAI</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Tab switcher */}
          <div
            className="flex rounded-2xl p-1 mb-8"
            style={{ background: "#f0f3fb" }}
          >
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={
                  tab === t
                    ? { background: "#1a2b5e", color: "#ffffff", boxShadow: "0 2px 8px rgba(26,43,94,0.25)" }
                    : { color: "#6b7280" }
                }
              >
                {t === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === "login" && (
            <div>
              <h2 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
                Welcome back
              </h2>
              <p className="text-sm text-gray-500 mb-7">Sign in to your EduAI account.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Email">
                  <input
                    type="email"
                    placeholder="you@iiitdwd.ac.in"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                    onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
                    onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                    onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
                    onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
                  />
                </Field>

                {loginError && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{loginError}</p>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity mt-2"
                  style={{ background: "#1a2b5e", color: "#ffffff" }}
                >
                  {loginLoading ? "Signing in…" : "Sign In"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                No account?{" "}
                <button
                  onClick={() => setTab("signup")}
                  className="font-semibold"
                  style={{ color: "#c9a84c" }}
                >
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* ── SIGNUP FORM ── */}
          {tab === "signup" && (
            <div>
              <h2 className="text-2xl font-extrabold mb-1" style={{ color: "#1a2b5e" }}>
                Create account
              </h2>
              <p className="text-sm text-gray-500 mb-7">Join EduAI as a Professor or Student.</p>

              {signupSuccess ? (
                <div className="text-center py-10 space-y-3">
                  <div className="text-5xl">✉️</div>
                  <p className="font-bold text-lg" style={{ color: "#1a2b5e" }}>Check your inbox</p>
                  <p className="text-sm text-gray-500">
                    We sent a confirmation link to{" "}
                    <span className="font-semibold text-gray-700">{signupEmail}</span>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <Field label="Full Name">
                    <input
                      type="text"
                      placeholder="Dr. Anjali Sharma"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                      style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                      onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
                      onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      placeholder="you@iiitdwd.ac.in"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                      style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                      onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
                      onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      placeholder="Min. 8 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      minLength={8}
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                      style={{ borderColor: "#dde3f0", background: "#fafbff" }}
                      onFocus={(e) => (e.target.style.borderColor = "#1a2b5e")}
                      onBlur={(e) => (e.target.style.borderColor = "#dde3f0")}
                    />
                  </Field>

                  {/* Role selector */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
                      I am a…
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["student", "professor"] as Role[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSignupRole(r)}
                          className="py-3 rounded-xl border-2 text-sm font-semibold transition-all"
                          style={
                            signupRole === r
                              ? { borderColor: "#1a2b5e", background: "#eef1f9", color: "#1a2b5e" }
                              : { borderColor: "#e5e7eb", background: "#ffffff", color: "#6b7280" }
                          }
                        >
                          {r === "student" ? "🎓 Student" : "🧑‍🏫 Professor"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {signupError && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{signupError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity mt-2"
                    style={{ background: "#1a2b5e", color: "#ffffff" }}
                  >
                    {signupLoading ? "Creating account…" : "Create Account"}
                  </button>
                </form>
              )}

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{" "}
                <button
                  onClick={() => setTab("login")}
                  className="font-semibold"
                  style={{ color: "#c9a84c" }}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}
