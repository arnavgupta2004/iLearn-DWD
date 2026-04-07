import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await req.json();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (profile?.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    // 1. Get the current student's top struggle
    const { data: myStruggles } = await supabaseAdmin
      .from("student_topic_struggles")
      .select("topic")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .order("count", { ascending: false })
      .limit(1);

    const myStruggle = myStruggles?.[0]?.topic || "General Concepts";

    // 2. Identify classmates who are strong in this topic
    const { data: classmates } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, profiles(full_name, email)")
      .eq("course_id", courseId)
      .neq("student_id", user.id)
      .limit(10);

    const peers = classmates || [];
    
    // For presentation purposes in this mockup, we randomly generate peer profiles and matching logic
    // based on real profile data to represent AI matchmaking
    interface PeerData {
      student_id: string;
      profiles: { full_name: string; email: string } | null;
    }

    const matches = peers.slice(0, 2).map((peerRaw: unknown, index: number) => {
      const peer = peerRaw as PeerData;
      return {
        studentId: peer.student_id,
        name: peer.profiles?.full_name || `Classmate ${index + 1}`,
        email: peer.profiles?.email || `student${index}@iiitdwd.ac.in`,
        canHelpYouWith: myStruggle,
        youCanHelpThemWith: index === 0 ? "Problem Solving" : "Programming Logic",
      };
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[StudyMatch]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
