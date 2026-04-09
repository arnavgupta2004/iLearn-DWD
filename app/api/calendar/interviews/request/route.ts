import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { localDateTimeToIso } from "@/lib/calendar";

function normalizeDateTime(value: string | null | undefined) {
  if (!value) return null;

  // If the client already sent an ISO timestamp, keep it as-is.
  const isoLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  if (isoLike) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date/time");
    }
    return parsed.toISOString();
  }

  return localDateTimeToIso(value);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      courseId: string;
      title: string;
      agenda: string;
      preferredStart: string;
      preferredEnd?: string | null;
    };

    if (!body.courseId || !body.agenda?.trim() || !body.preferredStart) {
      return NextResponse.json(
        { error: "Course, agenda, and preferred start time are required." },
        { status: 400 }
      );
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", user.id)
      .eq("course_id", body.courseId)
      .maybeSingle();

    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: "You can only request interviews for courses you are enrolled in." },
        { status: 403 }
      );
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, prof_id")
      .eq("id", body.courseId)
      .maybeSingle();

    if (courseError) {
      return NextResponse.json({ error: courseError.message }, { status: 500 });
    }

    if (!course?.prof_id) {
      return NextResponse.json({ error: "Course professor could not be determined." }, { status: 400 });
    }

    let preferredStartIso: string;
    let preferredEndIso: string | null = null;

    try {
      preferredStartIso = normalizeDateTime(body.preferredStart) ?? "";
      preferredEndIso = normalizeDateTime(body.preferredEnd);
    } catch {
      return NextResponse.json({ error: "Invalid interview date/time." }, { status: 400 });
    }

    if (
      preferredEndIso &&
      new Date(preferredEndIso).getTime() < new Date(preferredStartIso).getTime()
    ) {
      return NextResponse.json(
        { error: "Preferred end time must be after the start time." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("interview_requests").insert({
      course_id: body.courseId,
      prof_id: course.prof_id,
      student_id: user.id,
      title: body.title?.trim() || "Interview Request",
      agenda: body.agenda.trim(),
      preferred_start: preferredStartIso,
      preferred_end: preferredEndIso,
      status: "pending",
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.includes("interview_requests")
              ? "Calendar tables are not set up yet. Please create the calendar SQL tables first."
              : error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request interview" },
      { status: 500 }
    );
  }
}
