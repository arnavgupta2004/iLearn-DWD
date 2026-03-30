import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { geminiFlash } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RubricCriterion {
  name: string;
  description: string;
  weight_percent: number;
}

const DEFAULT_RUBRIC: RubricCriterion[] = [
  { name: "Content Accuracy", description: "Correctness and accuracy of information presented", weight_percent: 35 },
  { name: "Understanding & Analysis", description: "Depth of understanding and analytical thinking shown", weight_percent: 35 },
  { name: "Presentation & Clarity", description: "Organisation, clarity, and coherence of writing", weight_percent: 20 },
  { name: "Extra Knowledge", description: "Application of knowledge beyond core syllabus requirements", weight_percent: 10 },
];

function buildPrompt(rubric: RubricCriterion[], submissionText: string): string {
  const rubricLines = rubric
    .map((c, i) => `${i + 1}. ${c.name} (max_score: ${c.weight_percent}) — ${c.description}`)
    .join("\n");

  return `You are an academic evaluator for IIIT Dharwad. Evaluate this student submission against the rubric. IMPORTANT: Extra knowledge beyond the syllabus must be rewarded not penalized. Return ONLY valid JSON with no markdown fences, no explanation, just raw JSON.

Required JSON structure:
{
  "overall_score": <integer 0-100>,
  "criteria_scores": [
    { "criterion": "<name>", "score": <number>, "max_score": <number>, "feedback": "<1-2 sentences>" }
  ],
  "strengths": ["<string>"],
  "areas_for_improvement": ["<string>"],
  "summary": "<2-3 sentence overall assessment>",
  "extra_knowledge_noted": "<describe any knowledge beyond syllabus, or empty string>"
}

RUBRIC (score each criterion out of its max_score; overall_score is the sum):
${rubricLines}

STUDENT SUBMISSION:
${submissionText.slice(0, 10000)}`;
}

export async function POST(req: NextRequest) {
  try {
    const { submissionId } = await req.json();
    if (!submissionId) {
      return NextResponse.json({ error: "submissionId required" }, { status: 400 });
    }

    // 1. Fetch submission record
    const { data: submission, error: subErr } = await supabaseAdmin
      .from("submissions")
      .select("id, course_id, student_id, file_path, title")
      .eq("id", submissionId)
      .single();

    if (subErr || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // 2. Fetch rubric from course
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("rubric_criteria, name")
      .eq("id", submission.course_id)
      .single();

    const rubric: RubricCriterion[] =
      Array.isArray(course?.rubric_criteria) && course.rubric_criteria.length > 0
        ? (course.rubric_criteria as RubricCriterion[])
        : DEFAULT_RUBRIC;

    // 3. Download PDF from Supabase Storage
    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from("submissions")
      .download(submission.file_path);

    if (dlErr || !fileBlob) {
      return NextResponse.json({ error: "Could not download submission file" }, { status: 500 });
    }

    // 4. Extract text with pdf-parse
    // Use internal path to skip pdf-parse's test runner (v1.x)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const submissionText = parsed.text?.trim() ?? "";

    if (!submissionText) {
      return NextResponse.json(
        { error: "No text could be extracted from the PDF." },
        { status: 422 }
      );
    }

    // 5. Call Gemini
    const prompt = buildPrompt(rubric, submissionText);
    const result = await geminiFlash.generateContent(prompt);
    let raw = result.response.text().trim();

    // Strip markdown fences if present
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const feedback = JSON.parse(raw);

    // 6. Update submission record
    const { error: updateErr } = await supabaseAdmin
      .from("submissions")
      .update({
        ai_feedback: feedback,
        ai_scores: feedback.criteria_scores,
        overall_score: feedback.overall_score,
        status: "ai_evaluated",
      })
      .eq("id", submissionId);

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("[evaluate]", err);
    const message =
      err instanceof SyntaxError
        ? "Gemini returned invalid JSON — please try again."
        : err instanceof Error
        ? err.message
        : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
