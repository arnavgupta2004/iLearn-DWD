import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";

// Use Node.js runtime — pdf-parse requires fs
export const runtime = "nodejs";

const GEMINI_PROMPT = `You are a university course syllabus parser. Extract all structured information from the syllabus text below and return ONLY a valid JSON object. Do not include markdown code fences, triple backticks, explanations, or any text outside the JSON itself.

Required JSON structure (use empty string, 0, or [] if a field is not found):
{
  "name": "full course name",
  "code": "course code e.g. CS101",
  "credits": <integer>,
  "faculty_name": "professor/instructor name",
  "required_knowledge": "prerequisites as a single string",
  "objectives": ["objective 1", "objective 2"],
  "learning_outcomes": ["outcome 1", "outcome 2"],
  "difficulty_level": "undergraduate or graduate",
  "units": [
    {
      "unit_number": <integer starting at 1>,
      "title": "unit title",
      "hours": <integer>,
      "topics": ["topic 1", "topic 2"]
    }
  ],
  "assessment_weights": {
    "quiz": <number 0-100>,
    "project": <number 0-100>,
    "midterm": <number 0-100>,
    "endterm": <number 0-100>
  },
  "attendance_policy": "attendance policy as a string",
  "textbooks": [
    {
      "title": "book title",
      "author": "author name",
      "url": ""
    }
  ]
}

Syllabus text:
`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert File → Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use internal path to skip pdf-parse's test runner (v1.x)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const parsed = await pdfParse(buffer);
    const rawText = parsed.text?.slice(0, 12000) ?? ""; // cap at ~12k chars

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF. The file may be scanned/image-based." },
        { status: 422 }
      );
    }

    // Ask Gemini to parse the syllabus
    const result = await geminiFlash.generateContent(GEMINI_PROMPT + rawText);
    let responseText = result.response.text().trim();

    // Strip any markdown fences Gemini might add despite instructions
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const courseData = JSON.parse(responseText);

    // Ensure difficulty_level is one of the allowed values
    if (!["undergraduate", "graduate"].includes(courseData.difficulty_level)) {
      courseData.difficulty_level = "undergraduate";
    }

    return NextResponse.json({ data: courseData });
  } catch (err) {
    console.error("[parse-syllabus]", err);
    const message =
      err instanceof SyntaxError
        ? "Gemini returned invalid JSON — please try again."
        : err instanceof Error
        ? err.message
        : "Failed to parse syllabus.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
