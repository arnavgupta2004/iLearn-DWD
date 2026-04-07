import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { geminiFlash } from "@/lib/gemini";
import { tagStruggleTopic } from "@/lib/struggle-tracker";

export const runtime = "nodejs";
export const maxDuration = 120;

interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  question_type: "mcq" | "short_answer";
  options: string[] | null;
  correct_answer: string | null;
  marks: number;
}

interface BreakdownItem {
  question_number: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  earned: number;
  max: number;
  feedback: string;
}

async function evaluateShortAnswer(
  question: string,
  modelAnswer: string,
  studentAnswer: string,
  maxMarks: number
): Promise<{ score: number; feedback: string }> {
  const prompt = `You are evaluating a student's short answer for a quiz.

Question: ${question}
Model Answer: ${modelAnswer}
Student's Answer: ${studentAnswer}
Maximum Marks: ${maxMarks}

Evaluate and respond ONLY with valid JSON (no markdown fences):
{"score": <number 0 to ${maxMarks}>, "feedback": "<concise 1-2 sentence feedback>"}`;

  const result = await geminiFlash.generateContent(prompt);
  const raw = result.response
    .text()
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(raw);
  return {
    score: Math.min(Math.max(0, Number(parsed.score)), maxMarks),
    feedback: parsed.feedback ?? "",
  };
}

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

    const body = await req.json();
    const { answers } = body as {
      answers: Record<string, string>;
    };

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Answers are required." }, { status: 400 });
    }

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .select("course_id, total_marks, type")
      .eq("id", assessmentId)
      .maybeSingle();

    if (assessmentError) {
      return NextResponse.json({ error: assessmentError.message }, { status: 500 });
    }

    if (!assessment || assessment.type !== "quiz") {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
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

    // 0. Guard: prevent duplicate submissions
    const { data: existing } = await supabaseAdmin
      .from("assessment_submissions")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted this quiz." },
        { status: 409 }
      );
    }

    // 1. Fetch questions WITH correct answers (server-side only)
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, question_number, question_text, question_type, options, correct_answer, marks")
      .eq("assessment_id", assessmentId)
      .order("question_number");

    if (qErr || !questions) {
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    // 2. Evaluate each question
    let totalEarned = 0;
    const breakdown: BreakdownItem[] = [];

    for (const q of questions as QuizQuestion[]) {
      const studentAnswer = answers[q.id] ?? "";

      if (q.question_type === "mcq") {
        const correct =
          studentAnswer.trim().toLowerCase() ===
          (q.correct_answer ?? "").trim().toLowerCase();
        const earned = correct ? q.marks : 0;
        totalEarned += earned;
        breakdown.push({
          question_number: q.question_number,
          question_text: q.question_text,
          student_answer: studentAnswer,
          correct_answer: q.correct_answer ?? "",
          earned,
          max: q.marks,
          feedback: correct
            ? "Correct!"
            : `Incorrect. The correct answer is: ${q.correct_answer}`,
        });
      } else {
        try {
          const { score, feedback } = await evaluateShortAnswer(
            q.question_text,
            q.correct_answer ?? "",
            studentAnswer,
            q.marks
          );
          totalEarned += score;
          breakdown.push({
            question_number: q.question_number,
            question_text: q.question_text,
            student_answer: studentAnswer,
            correct_answer: q.correct_answer ?? "",
            earned: score,
            max: q.marks,
            feedback,
          });
        } catch {
          breakdown.push({
            question_number: q.question_number,
            question_text: q.question_text,
            student_answer: studentAnswer,
            correct_answer: q.correct_answer ?? "",
            earned: 0,
            max: q.marks,
            feedback: "Could not evaluate automatically.",
          });
        }
      }
    }

    const totalMaxFromQuestions = (questions as QuizQuestion[]).reduce(
      (sum, q) => sum + q.marks,
      0
    );
    const totalMaxMarks = assessment.total_marks ?? totalMaxFromQuestions;
    const finalScore =
      totalMaxFromQuestions > 0
        ? Math.round((totalEarned / totalMaxFromQuestions) * totalMaxMarks)
        : 0;

    const pct =
      totalMaxFromQuestions > 0
        ? Math.round((totalEarned / totalMaxFromQuestions) * 100)
        : 0;
    const overallFeedback =
      pct >= 80
        ? "Excellent work! You have a strong grasp of the material."
        : pct >= 60
        ? "Good effort. Review the questions you got wrong and strengthen those areas."
        : "Keep practising. Focus on the topics where you lost marks and revisit your course materials.";

    // 3. Save submission
    const { data: submission, error: insertErr } = await supabaseAdmin
      .from("assessment_submissions")
      .insert({
        assessment_id: assessmentId,
        student_id: user.id,
        course_id: courseId,
        type: "quiz",
        answers,
        status: "evaluated",
        ai_score: finalScore,
        total_marks: totalMaxMarks,
        ai_feedback: overallFeedback,
        ai_breakdown: breakdown,
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

    // 4. Compute rank
    const { data: allSubs } = await supabaseAdmin
      .from("assessment_submissions")
      .select("id, ai_score")
      .eq("assessment_id", assessmentId)
      .eq("status", "evaluated");

    const allScores = allSubs ?? [];
    const rank = allScores.filter((s) => (s.ai_score ?? 0) > finalScore).length + 1;
    const totalStudents = allScores.length;

    await supabaseAdmin
      .from("assessment_submissions")
      .update({ rank, total_students: totalStudents })
      .eq("id", submission.id);

    // Tag struggle topics for wrong/partial answers (non-blocking)
    void (async () => {
      for (const item of breakdown) {
        if (item.earned < item.max) {
          await tagStruggleTopic(courseId, user.id, item.question_text);
        }
      }
    })();

    // Update others' ranks in background
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

    return NextResponse.json({
      score: finalScore,
      totalMarks: totalMaxMarks,
      rank,
      totalStudents,
      feedback: overallFeedback,
      breakdown,
    });
  } catch (e) {
    console.error("[submit-quiz]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
