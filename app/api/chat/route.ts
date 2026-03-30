import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { retrieveContext } from "@/lib/rag";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { geminiFlash } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

// ── Helpers ─────────────────────────────────────────────────────────────────

const UNCERTAINTY_PHRASES = [
  "i'm not sure",
  "i am not sure",
  "i don't know",
  "i do not know",
  "i cannot find",
  "i'm uncertain",
  "i am uncertain",
  "not certain",
  "no information",
  "outside my knowledge",
  "i apologize",
  "unfortunately, i",
  "i'm unable",
  "i am unable",
  "i lack",
];

function isUncertain(text: string): boolean {
  const lower = text.toLowerCase();
  return UNCERTAINTY_PHRASES.some((p) => lower.includes(p));
}

function buildSystemPrompt(
  courseName: string,
  difficultyLevel: string,
  context: string
): string {
  return `You are an academic AI assistant for "${courseName}" at IIIT Dharwad. \
Difficulty level: ${difficultyLevel}.

Answer using the COURSE CONTEXT below first. If the context is insufficient, use your general knowledge — extra knowledge beyond the syllabus is always welcome and you should never penalize curiosity. \
Be thorough, clear, and pedagogically sound. Only express genuine uncertainty when you truly do not know something important.

COURSE CONTEXT:
${context.trim() || "No course materials have been indexed for this course yet."}`;
}

// Background: tag the topic of the student's question for analytics
async function tagTopic(
  courseId: string,
  studentId: string,
  question: string
): Promise<void> {
  try {
    const result = await geminiFlash.generateContent(
      `Given this student question: "${question.slice(0, 300)}"
Return ONLY a single 2–5 word topic phrase (e.g. "neural network backpropagation"). No explanation, punctuation, or quotes. Just the phrase.`
    );
    const topic = result.response.text().trim().toLowerCase().replace(/[".]/g, "");
    if (!topic || topic.length > 80) return;

    const { data: existing } = await supabaseAdmin
      .from("student_topic_struggles")
      .select("id, count")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("topic", topic)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("student_topic_struggles")
        .update({ count: (existing.count ?? 0) + 1, last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("student_topic_struggles").insert({
        student_id: studentId,
        course_id: courseId,
        topic,
        count: 1,
        last_seen_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("[tagTopic]", e);
  }
}

// ── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, courseId, studentId, courseName, difficultyLevel } =
    body as {
      messages: { role: "user" | "assistant"; content: string }[];
      courseId: string;
      studentId: string;
      courseName: string;
      difficultyLevel: string;
    };

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) {
    return new Response("No user message found", { status: 400 });
  }

  // ── 1. Retrieve RAG context ───────────────────────────────────────────────
  let context = "";
  try {
    context = await retrieveContext(courseId, lastUserMsg.content);
  } catch (e) {
    console.error("[RAG]", e);
  }
  const hasContext = context.trim().length > 0;

  // ── 2. Set up SSE stream ──────────────────────────────────────────────────
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = async (event: string, data: object) => {
    await writer.write(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    );
  };

  // Promise that resolves after onFinish completes
  let resolveFinish!: (flagged: boolean) => void;
  const finishPromise = new Promise<boolean>((r) => (resolveFinish = r));

  // ── 3. Start Groq streaming ───────────────────────────────────────────────
  const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY! });

  const result = streamText({
    model: groqProvider("llama-3.1-8b-instant"),
    system: buildSystemPrompt(courseName, difficultyLevel, context),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    onFinish: async ({ text }) => {
      try {
        const flagged = !hasContext && isUncertain(text);

        // Save user message
        await supabaseAdmin.from("chat_messages").insert({
          course_id: courseId,
          student_id: studentId,
          role: "user",
          content: lastUserMsg.content,
          flagged_for_prof: false,
        });

        // Save assistant message
        await supabaseAdmin.from("chat_messages").insert({
          course_id: courseId,
          student_id: studentId,
          role: "assistant",
          content: text,
          flagged_for_prof: flagged,
        });

        if (flagged) {
          await supabaseAdmin.from("flagged_questions").insert({
            course_id: courseId,
            student_id: studentId,
            question: lastUserMsg.content,
            ai_response: text,
          });
        }

        // Background topic tagging (non-blocking)
        void tagTopic(courseId, studentId, lastUserMsg.content);

        resolveFinish(flagged);
      } catch (e) {
        console.error("[onFinish]", e);
        resolveFinish(false);
      }
    },
  });

  // ── 4. Pipe text chunks → SSE deltas, then done event ────────────────────
  (async () => {
    try {
      for await (const chunk of result.textStream) {
        await emit("delta", { text: chunk });
      }
      // Wait for DB work in onFinish to complete
      const flagged = await finishPromise;
      await emit("done", { flagged });
    } catch (e) {
      await emit("error", {
        message: e instanceof Error ? e.message : "Stream error",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
