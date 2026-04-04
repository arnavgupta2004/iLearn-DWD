"use client";

import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  scope: string;
  title: string;
  subtitle: string;
  placeholder: string;
  instructions?: string;
  context: unknown;
  suggestedPrompts?: string[];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PageChatbot({
  scope,
  title,
  subtitle,
  placeholder,
  instructions,
  context,
  suggestedPrompts = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      content: subtitle,
    },
  ]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      { id: uid(), role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/page-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          pageTitle: title,
          instructions,
          context,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to get an answer");

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: json.answer ?? "I couldn't generate a response right now.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong while answering.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open && (
        <div
          className="w-[380px] rounded-3xl border shadow-2xl overflow-hidden mb-3"
          style={{ borderColor: "#dbe4f3", background: "#ffffff" }}
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold" style={{ color: "#1a2b5e" }}>
                  {title} Assistant
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="px-4 py-4 max-h-[420px] overflow-y-auto space-y-3">
            {suggestedPrompts.length > 0 && messages.length <= 1 && (
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => ask(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border"
                    style={{ borderColor: "#d6ddec", color: "#1a2b5e", background: "#fafbff" }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
                  style={
                    message.role === "user"
                      ? { background: "#1a2b5e", color: "#ffffff", borderBottomRightRadius: 6 }
                      : { background: "#f3f6fc", color: "#334155", borderBottomLeftRadius: 6 }
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-3 text-sm"
                  style={{ background: "#f3f6fc", color: "#64748b" }}
                >
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="p-4 border-t"
            style={{ borderColor: "#e5eaf5", background: "#ffffff" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 rounded-2xl border text-sm outline-none resize-none"
                style={{ borderColor: "#dbe4f3", background: "#fafbff" }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2 rounded-2xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "#1a2b5e", color: "#ffffff" }}
              >
                Ask
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        className="rounded-full px-5 py-3 shadow-lg text-sm font-semibold"
        style={{ background: "#1a2b5e", color: "#ffffff" }}
      >
        {open ? "Hide Assistant" : "Ask Assistant"}
      </button>
    </div>
  );
}
