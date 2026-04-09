import { NextRequest, NextResponse } from "next/server";
import { groq, CHAT_MODEL } from "@/lib/groq";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildScopeRules(scope: string) {
  switch (scope) {
    case "student_todo":
      return "Answer only about the student's to-do list, pending/completed tasks, due dates, prioritization, and study order. If asked about unrelated course content or analytics, refuse briefly and redirect to the page's purpose.";
    case "student_progress":
      return "Answer only about the student's progress, improvement strategy, rankings, strengths, weak areas, objective completion, and how to improve performance.";
    case "student_courses":
      return "Answer only about the student's enrolled courses, course names/codes, teachers, credits, and which course matches a described topic based on the provided context.";
    case "prof_courses":
      return "Answer only about the professor's courses, enrollments, course setup, and teaching improvement suggestions grounded in the provided course context.";
    case "prof_flagged":
      return "Answer only about flagged student questions, prioritization, urgency, common themes, and suggested response order based on the provided flagged-question data.";
    case "prof_analytics":
      return "Answer only about course analytics, student performance, strengths by topic, class averages, risks, and actions the professor can take.";
    default:
      return "Answer only from the provided page context. If the request is outside that context, say you can only help with this page.";
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      scope: string;
      pageTitle: string;
      instructions?: string;
      context: unknown;
      messages: ChatMessage[];
    };

    const { scope, pageTitle, instructions, context, messages } = body;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!scope || !pageTitle || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (scope.startsWith("student_") && profile?.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.startsWith("prof_") && profile?.role !== "professor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contextText = JSON.stringify(context).slice(0, 18000);
    const chatHistory = messages
      .slice(-8)
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n");

    const prompt = `You are a page-specific AI assistant inside the "${pageTitle}" page of an academic platform.

Scope rules:
${buildScopeRules(scope)}
${instructions ? `Additional instructions:\n${instructions}` : ""}

Behavior rules:
- Use only the page context provided below.
- Be helpful, practical, and concise.
- If the user asks something outside this page's scope, say so briefly and redirect them to ask a question related to this page.
- When recommending priorities or improvements, explain the reason using the available context.
- Do not invent data that is not present in the page context.

PAGE CONTEXT:
${contextText}

CONVERSATION:
${chatHistory}

Answer the latest USER message only.`;

    const result = await groq.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a page-specific academic assistant. Follow the provided scope strictly and answer only from the supplied context.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const answer = result.choices[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("Groq returned an empty response.");
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("[page-chat]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to answer question" },
      { status: 500 }
    );
  }
}
