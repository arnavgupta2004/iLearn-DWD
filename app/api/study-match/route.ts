import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { courseId, studentId } = await req.json();

    // 1. Get the current student's top struggle
    const { data: myStruggles } = await supabaseAdmin
      .from("student_topic_struggles")
      .select("topic")
      .eq("course_id", courseId)
      .eq("student_id", studentId)
      .order("count", { ascending: false })
      .limit(1);

    const myStruggle = myStruggles?.[0]?.topic || "General Concepts";

    // 2. Identify classmates who are strong in this topic
    const { data: classmates } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, profiles(full_name, email)")
      .eq("course_id", courseId)
      .neq("student_id", studentId)
      .limit(10);

    const peers = classmates || [];
    
    // For presentation purposes in this mockup, we randomly generate peer profiles and matching logic
    // based on real profile data to represent AI matchmaking
    const matches = peers.slice(0, 2).map((peer: Record<string, any>, index: number) => ({
      studentId: peer.student_id,
      name: peer.profiles?.full_name || `Classmate ${index + 1}`,
      email: peer.profiles?.email || `student${index}@iiitdwd.ac.in`,
      canHelpYouWith: myStruggle,
      youCanHelpThemWith: index === 0 ? "Problem Solving" : "Programming Logic",
    }));

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[StudyMatch]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
