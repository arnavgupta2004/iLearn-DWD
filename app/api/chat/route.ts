import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createClient } from "@/lib/supabase-server";
import { retrieveContext, retrieveAllChunks } from "@/lib/rag";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { tagStruggleTopic } from "@/lib/struggle-tracker";

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
  context: string,
  materialNames: string[]
): string {
  const materialsSection = materialNames.length > 0
    ? `UPLOADED MATERIALS:\n${materialNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
    : "UPLOADED MATERIALS: None yet.";

  return `You are an academic AI assistant for "${courseName}" at IIIT Dharwad. \
Difficulty level: ${difficultyLevel}.

${materialsSection}

IMPORTANT: The COURSE CONTEXT below contains text extracted directly from the uploaded course material files listed above. \
This IS your access to those files — treat it as the actual file content. Never say you cannot access the files. \
You are in a Hybrid-RAG mode. Use the COURSE CONTEXT to understand the professor's scope, terminology, and expectations. \
However, actively use your vast general knowledge to provide deeper explanations, diverse real-world analogies, code snippets, and outside examples to help the student learn the concept thoroughly beyond just the provided slides. \
Be thorough, clear, and pedagogically sound.

COURSE CONTEXT (extracted from uploaded files):
${context.trim() || "No course materials have been indexed for this course yet."}`;
}


// ── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { messages, courseId, courseName, difficultyLevel } =
    body as {
      messages: { role: "user" | "assistant"; content: string }[];
      courseId: string;
      courseName: string;
      difficultyLevel: string;
    };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return new Response(profileError.message, { status: 500 });
  }

  if (profile?.role !== "student") {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (enrollmentError) {
    return new Response(enrollmentError.message, { status: 500 });
  }

  if (!enrollment) {
    return new Response("Forbidden", { status: 403 });
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) {
    return new Response("No user message found", { status: 400 });
  }

  // ── 1. Retrieve RAG context + materials list in parallel ─────────────────
  const BROAD_QUERY_PATTERNS = [
    /summar/i, /overview/i, /what.*cover/i, /what.*topic/i, /what.*contain/i,
    /what.*pdf/i, /what.*material/i, /what.*upload/i, /what.*file/i,
    /explain.*course/i, /about.*course/i, /outline/i, /contents/i,
  ];
  const isBroadQuery = BROAD_QUERY_PATTERNS.some((p) => p.test(lastUserMsg.content));
  const topK = isBroadQuery ? 40 : 12;

  let context = "";
  let materialNames: string[] = [];
  try {
    const [ragContext, materialsResult] = await Promise.all([
      isBroadQuery
        ? retrieveAllChunks(courseId)
        : retrieveContext(courseId, lastUserMsg.content, topK),
      supabaseAdmin
        .from("course_materials")
        .select("file_name")
        .eq("course_id", courseId)
        .eq("indexed", true),
    ]);
    context = ragContext;
    materialNames = (materialsResult.data ?? []).map((m) => m.file_name);
    console.log(`[RAG] courseId=${courseId} isBroad=${isBroadQuery} contextLen=${context.length} materials=${materialNames}`);
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
    model: groqProvider("llama-3.3-70b-versatile"),
    system: buildSystemPrompt(courseName, difficultyLevel, context, materialNames),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    onFinish: async ({ text }) => {
      try {
        const flagged = !hasContext && isUncertain(text);

        // Save user message
        await supabaseAdmin.from("chat_messages").insert({
          course_id: courseId,
          student_id: user.id,
          role: "user",
          content: lastUserMsg.content,
          flagged_for_prof: false,
        });

        // Save assistant message
        await supabaseAdmin.from("chat_messages").insert({
          course_id: courseId,
          student_id: user.id,
          role: "assistant",
          content: text,
          flagged_for_prof: flagged,
        });

        if (flagged) {
          await supabaseAdmin.from("flagged_questions").insert({
            course_id: courseId,
            student_id: user.id,
            question: lastUserMsg.content,
            ai_response: text,
          });
        }

        // Background topic tagging (non-blocking)
        void tagStruggleTopic(courseId, user.id, lastUserMsg.content);

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
