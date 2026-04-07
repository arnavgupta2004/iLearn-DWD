import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { geminiFlash } from "@/lib/gemini";
import { tagStruggleTopic } from "@/lib/struggle-tracker";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  const { assessmentId } = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .select("course_id, title, description, total_marks, type")
      .eq("id", assessmentId)
      .maybeSingle();

    if (assessmentError) {
      return NextResponse.json({ error: assessmentError.message }, { status: 500 });
    }

    if (!assessment || assessment.type !== "assignment") {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const courseId = assessment.course_id;

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }

    if (!enrollment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Guard: prevent duplicate submissions
    const { data: existing } = await supabaseAdmin
      .from("assessment_submissions")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted this assignment." },
        { status: 409 }
      );
    }

    // 1. Ensure submissions storage bucket exists
    const BUCKET = "submissions";
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET);
    if (!bucketExists) {
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(BUCKET, {
        public: false,
      });
      if (createBucketError && !createBucketError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json(
          { error: `Could not create submissions bucket: ${createBucketError.message}` },
          { status: 500 }
        );
      }
    }

    // 2. Upload file to storage
    const filePath = `assessments/${assessmentId}/${user.id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const totalMarks = assessment.total_marks ?? 100;

    // 4. Parse PDF
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const parsed = await pdfParse(buffer);
    const submissionText = parsed.text?.trim() ?? "";

    if (!submissionText) {
      return NextResponse.json(
        { error: "No text could be extracted from the PDF." },
        { status: 422 }
      );
    }

    // 5. Evaluate with Gemini
    const prompt = `You are an academic evaluator at IIIT Dharwad. Evaluate this student assignment submission.

Assignment Title: ${assessment?.title ?? "Assignment"}
${assessment?.description ? `Assignment Description: ${assessment.description}\n` : ""}Total Marks: ${totalMarks}

Evaluate the submission and respond ONLY with valid JSON (no markdown fences):
{
  "score": <integer 0 to ${totalMarks}>,
  "feedback": "<3-4 sentence overall feedback>",
  "strengths": ["<string>", ...],
  "improvements": ["<string>", ...],
  "mistakes": ["<string>", ...]
}

STUDENT SUBMISSION:
${submissionText.slice(0, 10000)}`;

    const result = await geminiFlash.generateContent(prompt);
    const raw = result.response
      .text()
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const evaluation = JSON.parse(raw);
    const score = Math.min(Math.max(0, Number(evaluation.score ?? 0)), totalMarks);

    // 6. Save submission
    const { data: submission, error: insertErr } = await supabaseAdmin
      .from("assessment_submissions")
      .insert({
        assessment_id: assessmentId,
        student_id: user.id,
        course_id: courseId,
        type: "assignment",
        file_path: filePath,
        status: "evaluated",
        ai_score: score,
        total_marks: totalMarks,
        ai_feedback: evaluation.feedback,
        ai_breakdown: {
          strengths: evaluation.strengths ?? [],
          improvements: evaluation.improvements ?? [],
          mistakes: evaluation.mistakes ?? [],
        },
        evaluated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !submission) {
      return NextResponse.json(
        { error: insertErr?.message ?? "Failed to save submission" },
        { status: 500 }
      );
    }

    // 7. Compute rank
    const { data: allSubs } = await supabaseAdmin
      .from("assessment_submissions")
      .select("id, ai_score")
      .eq("assessment_id", assessmentId)
      .eq("status", "evaluated");

    const allScores = allSubs ?? [];
    const rank = allScores.filter((s) => (s.ai_score ?? 0) > score).length + 1;
    const totalStudents = allScores.length;

    await supabaseAdmin
      .from("assessment_submissions")
      .update({ rank, total_students: totalStudents })
      .eq("id", submission.id);

    void (async () => {
      for (const sub of allScores) {
        if (sub.id === submission.id) continue;
        const subRank =
          allScores.filter((s) => (s.ai_score ?? 0) > (sub.ai_score ?? 0)).length + 1;
        await supabaseAdmin
          .from("assessment_submissions")
          .update({ rank: subRank, total_students: totalStudents })
          .eq("id", sub.id);
      }
    })();

    // Tag struggle topics from mistakes (non-blocking)
    void (async () => {
      for (const mistake of (evaluation.mistakes ?? []).slice(0, 5)) {
        await tagStruggleTopic(courseId, user.id, mistake);
      }
    })();

    return NextResponse.json({
      score,
      totalMarks,
      rank,
      totalStudents,
      feedback: evaluation.feedback,
      breakdown: {
        strengths: evaluation.strengths ?? [],
        improvements: evaluation.improvements ?? [],
        mistakes: evaluation.mistakes ?? [],
      },
    });
  } catch (e) {
    console.error("[submit-assignment]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
