import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { localDateTimeToIso } from "@/lib/calendar";

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

  if (profile?.role !== "professor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      title: string;
      description?: string | null;
      eventType: "class" | "meeting" | "office_hour" | "custom";
      courseId?: string | null;
      startAt: string;
      endAt?: string | null;
      location?: string | null;
    };

    if (!body.title?.trim() || !body.startAt) {
      return NextResponse.json(
        { error: "Title and start time are required." },
        { status: 400 }
      );
    }

    if (body.courseId) {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id")
        .eq("id", body.courseId)
        .eq("prof_id", user.id)
        .maybeSingle();

      if (courseError) {
        return NextResponse.json({ error: courseError.message }, { status: 500 });
      }

      if (!course) {
        return NextResponse.json(
          { error: "You can only create events for your own courses." },
          { status: 403 }
        );
      }
    }

    let startAtIso: string;
    let endAtIso: string | null = null;

    try {
      startAtIso = localDateTimeToIso(body.startAt);
      endAtIso = body.endAt ? localDateTimeToIso(body.endAt) : null;
    } catch {
      return NextResponse.json({ error: "Invalid event date/time." }, { status: 400 });
    }

    if (endAtIso && new Date(endAtIso).getTime() < new Date(startAtIso).getTime()) {
      return NextResponse.json(
        { error: "End time must be after the start time." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("calendar_events").insert({
      prof_id: user.id,
      course_id: body.courseId ?? null,
      title: body.title.trim(),
      description: body.description ?? null,
      event_type: body.eventType,
      start_at: startAtIso,
      end_at: endAtIso,
      location: body.location ?? null,
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.includes("calendar_events")
              ? "Calendar tables are not set up yet. Please create the calendar SQL tables first."
              : error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
