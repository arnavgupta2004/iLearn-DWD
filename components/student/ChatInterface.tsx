"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  flagged?: boolean;
}

interface Props {
  courseId: string;
  studentId: string;
  courseName: string;
  difficultyLevel: string;
  history: ChatMessage[];
}

// ── SSE reader ─────────────────────────────────────────────────────────────

async function* readSSE(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() ?? "";
    for (const block of blocks) {
      if (!block.trim()) continue;
      const lines = block.split("\n");
      const eLine = lines.find((l) => l.startsWith("event:"));
      const dLine = lines.find((l) => l.startsWith("data:"));
      if (!eLine || !dLine) continue;
      yield {
        event: eLine.slice(6).trim(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: JSON.parse(dLine.slice(5).trim()) as any,
      };
    }
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Blinking cursor ────────────────────────────────────────────────────────

function BlinkingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
      style={{ background: "#1a2b5e" }}
    />
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isStreaming,
}: {
  msg: ChatMessage;
  isStreaming: boolean;
}) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? {
                background: "#1a2b5e",
                color: "#ffffff",
                borderBottomRightRadius: 4,
              }
            : {
                background: "#f0f3fb",
                color: "#1e293b",
                borderBottomLeftRadius: 4,
              }
        }
      >
        {msg.content}
        {isStreaming && <BlinkingCursor />}
      </div>

      {/* Flagged badge */}
      {msg.flagged && (
        <div
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(201,168,76,0.18)", color: "#92400e" }}
        >
          <span>🚩</span>
          <span>Flagged for professor ✓</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ChatInterface({
  courseId,
  studentId,
  courseName,
  difficultyLevel,
  history,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(history);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setInput("");
    setError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Add user message
    const userMsg: ChatMessage = { id: uid(), role: "user", content };
    // Add empty assistant message (streaming target)
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setStreamingId(assistantId);

    // Build history to send (exclude the empty assistant slot)
    const historyToSend = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyToSend,
          courseId,
          studentId,
          courseName,
          difficultyLevel,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      for await (const { event, data } of readSSE(res.body)) {
        if (event === "delta") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + (data.text as string) }
                : m
            )
          );
        } else if (event === "done") {
          const flagged = (data as { flagged: boolean }).flagged;
          if (flagged) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, flagged: true } : m
              )
            );
          }
          break;
        } else if (event === "error") {
          throw new Error((data as { message: string }).message);
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      // Remove the empty assistant bubble on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
    }
  }, [input, isStreaming, messages, courseId, studentId, courseName, difficultyLevel]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: "#ffffff" }}>
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base"
          style={{ background: "#eef1f9" }}
        >
          🤖
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "#1a2b5e" }}>
            AI Tutor
          </p>
          <p className="text-xs text-gray-400">{courseName}</p>
        </div>
        {isStreaming && (
          <span
            className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full animate-pulse"
            style={{ background: "#eef1f9", color: "#1a2b5e" }}
          >
            Thinking…
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
            <div className="text-5xl">💬</div>
            <p className="font-bold text-base" style={{ color: "#1a2b5e" }}>
              Ask anything about {courseName}
            </p>
            <p className="text-sm text-gray-400 max-w-xs">
              I&apos;ll use your course materials to give you accurate, context-aware answers.
            </p>
            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "Summarise Unit 1",
                "What are the key learning outcomes?",
                "Explain the assessment breakdown",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors"
                  style={{ borderColor: "#c9d3ea", color: "#1a2b5e" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "#eef1f9")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "transparent")
                  }
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isStreaming={isStreaming && msg.id === streamingId}
          />
        ))}

        {error && (
          <p className="text-sm text-red-500 text-center bg-red-50 px-4 py-2 rounded-xl">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="px-4 py-3 border-t shrink-0"
        style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl border px-4 py-2.5"
          style={{ borderColor: "#dde3f0", background: "#ffffff" }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Shift+Enter for new line)"
            disabled={isStreaming}
            className="flex-1 resize-none text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400 leading-relaxed"
            style={{ minHeight: 24, maxHeight: 160 }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
            style={{ background: "#1a2b5e" }}
          >
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-2">
          AI answers are based on your course materials. Always verify important facts.
        </p>
      </div>
    </div>
  );
}
