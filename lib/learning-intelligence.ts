import { geminiFlash } from "./gemini";

type TopicCount = { topic: string; count: number };
type ChatDay = { date: string; count: number };
type AssessmentType = "quiz" | "assignment";

type StudentAssessmentSummary = {
  title: string;
  type: AssessmentType;
  ai_score: number;
  total_marks: number;
  submitted_at: string;
};

export interface CourseStudentAnalyticsInput {
  studentId: string;
  fullName: string;
  avgScore: number | null;
  completionRate: number;
  interactionCount: number;
  allStruggles: TopicCount[];
  assessmentSubmissions: StudentAssessmentSummary[];
  chatTimeline: ChatDay[];
}

export interface CourseAnalyticsInput {
  courseId: string;
  name: string;
  code: string;
  objectives: string[];
  learningOutcomes: string[];
  units: { title: string; topics: string[] }[];
  students: CourseStudentAnalyticsInput[];
}

export interface StudentLearningCourseInput {
  courseId: string;
  courseName: string;
  courseCode: string;
  objectives: string[];
  learningOutcomes: string[];
  units: { title: string; topics: string[] }[];
  avgPct: number | null;
  submitted: number;
  total: number;
  struggles: TopicCount[];
  recentAssessments: StudentAssessmentSummary[];
}

export interface StudentLearningProfileInput {
  struggles: TopicCount[];
  percentile: number;
  totalChats: number;
  courses: StudentLearningCourseInput[];
}

export interface TopicInsight {
  topic: string;
  reason: string;
}

export interface CourseStudentInsight {
  studentId: string;
  objectiveCompletion: number;
  goalProgress: number;
  weeklyMomentum: number;
  theoryUnderstanding: number;
  practicalSkill: number;
  strengths: TopicInsight[];
  growthTopics: TopicInsight[];
  recommendedSupport: string[];
  bestContributionAreas: string[];
  coachSummary: string;
}

export interface TopicTalentInsight {
  topic: string;
  studentIds: string[];
  reason: string;
}

export interface CourseLearningIntelligence {
  students: CourseStudentInsight[];
  topicTalentMap: TopicTalentInsight[];
  courseInsights: {
    objectiveCoverage: number;
    weeklyTrend: string;
    atRiskTopics: string[];
    recommendedActions: string[];
    personalizationSummary: string;
  };
}

export interface StudentCourseInsight {
  courseId: string;
  objectiveCompletion: number;
  learningPace: "fast" | "steady" | "needs_support";
  confidenceLabel: string;
  currentFocus: string;
  strengths: string[];
  supportStrategies: string[];
}

export interface StudentLearningProfile {
  overallNarrative: string;
  personalStrengths: string[];
  growthPriorities: TopicInsight[];
  personalizedPlan: string[];
  weeklyFocus: string[];
  courseProgress: StudentCourseInsight[];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseJson<T>(raw: string): T {
  return JSON.parse(
    raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
  ) as T;
}

function getWeeklyMomentum(chatTimeline: ChatDay[], assessmentSubmissions: StudentAssessmentSummary[]) {
  const last7 = chatTimeline.slice(-7).reduce((sum, day) => sum + day.count, 0);
  const prev7 = chatTimeline.slice(-14, -7).reduce((sum, day) => sum + day.count, 0);
  const now = Date.now();
  const recentAssessments = assessmentSubmissions.filter((item) => {
    const submittedAt = new Date(item.submitted_at).getTime();
    return Number.isFinite(submittedAt) && now - submittedAt <= 1000 * 60 * 60 * 24 * 14;
  }).length;

  const chatComponent = Math.min(45, last7 * 6);
  const assessmentComponent = Math.min(35, recentAssessments * 12);
  const improvementBonus =
    prev7 === 0 ? (last7 > 0 ? 20 : 0) : Math.max(-10, Math.min(20, ((last7 - prev7) / prev7) * 20));

  return clamp(25 + chatComponent + assessmentComponent + improvementBonus);
}

function getAssessmentAverage(
  items: StudentAssessmentSummary[],
  type?: AssessmentType
) {
  const filtered = type ? items.filter((item) => item.type === type) : items;
  if (!filtered.length) return null;
  const values = filtered.map((item) =>
    item.total_marks > 0 ? (item.ai_score / item.total_marks) * 100 : 0
  );
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function pickCourseTopics(
  objectives: string[],
  learningOutcomes: string[],
  units: { title: string; topics: string[] }[],
  limit = 8
) {
  const raw = [
    ...objectives,
    ...learningOutcomes,
    ...units.flatMap((unit) => [unit.title, ...unit.topics]),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const topics: string[] = [];
  for (const value of raw) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    topics.push(value);
    if (topics.length >= limit) break;
  }
  return topics;
}

function fallbackCourseIntelligence(input: CourseAnalyticsInput): CourseLearningIntelligence {
  const fallbackStudents: CourseStudentInsight[] = input.students.map((student) => {
    const avgScore = student.avgScore ?? 55;
    const theoryUnderstanding = clamp(
      getAssessmentAverage(student.assessmentSubmissions, "quiz") ?? avgScore
    );
    const practicalSkill = clamp(
      getAssessmentAverage(student.assessmentSubmissions, "assignment") ?? avgScore
    );
    const weeklyMomentum = getWeeklyMomentum(student.chatTimeline, student.assessmentSubmissions);
    const strugglePenalty = Math.min(
      18,
      student.allStruggles.reduce((sum, item) => sum + item.count, 0) * 2
    );

    const objectiveCompletion = clamp(
      avgScore * 0.45 +
        student.completionRate * 0.3 +
        theoryUnderstanding * 0.1 +
        practicalSkill * 0.1 +
        weeklyMomentum * 0.05 -
        strugglePenalty
    );
    const goalProgress = clamp(
      objectiveCompletion * 0.55 +
        weeklyMomentum * 0.2 +
        practicalSkill * 0.15 +
        theoryUnderstanding * 0.1
    );

    const strongestArea =
      practicalSkill >= theoryUnderstanding ? "hands-on implementation" : "conceptual understanding";
    const firstCourseTopic = pickCourseTopics(
      input.objectives,
      input.learningOutcomes,
      input.units,
      1
    )[0] ?? "core course concepts";

    return {
      studentId: student.studentId,
      objectiveCompletion,
      goalProgress,
      weeklyMomentum,
      theoryUnderstanding,
      practicalSkill,
      strengths: [
        {
          topic: strongestArea,
          reason:
            practicalSkill >= theoryUnderstanding
              ? "Recent work suggests stronger performance on applied tasks."
              : "Recent work suggests stronger understanding of theoretical concepts.",
        },
        {
          topic: firstCourseTopic,
          reason: "This aligns best with the student’s current overall progress pattern.",
        },
      ],
      growthTopics: student.allStruggles.slice(0, 3).map((item) => ({
        topic: item.topic,
        reason: "This topic appears repeatedly in the student’s struggle history.",
      })),
      recommendedSupport: [
        "Give one targeted checkpoint this week tied to the next course objective.",
        practicalSkill < theoryUnderstanding
          ? "Add a short coding or applied practice task."
          : "Add a theory recap and oral explanation prompt.",
        student.allStruggles.length > 0
          ? `Revisit ${student.allStruggles[0].topic} with worked examples and feedback.`
          : "Keep reinforcing current progress with slightly harder problems.",
      ],
      bestContributionAreas: [
        strongestArea,
        practicalSkill >= 75 ? "problem solving" : "peer discussion",
      ],
      coachSummary: `${student.fullName} is ${goalProgress >= 75 ? "close to the course goals" : goalProgress >= 55 ? "making steady progress" : "still building toward the course goals"}, with stronger ${strongestArea}.`,
    };
  });

  const topicTalentMap: TopicTalentInsight[] = fallbackStudents
    .flatMap((student) =>
      student.strengths.slice(0, 2).map((strength) => ({
        topic: strength.topic,
        studentId: student.studentId,
        score: student.goalProgress,
        reason: strength.reason,
      }))
    )
    .sort((a, b) => b.score - a.score)
    .reduce<TopicTalentInsight[]>((acc, item) => {
      const existing = acc.find((entry) => entry.topic.toLowerCase() === item.topic.toLowerCase());
      if (existing) return acc;
      acc.push({
        topic: item.topic,
        studentIds: [item.studentId],
        reason: item.reason,
      });
      return acc;
    }, [])
    .slice(0, 8);

  const objectiveCoverage =
    fallbackStudents.length > 0
      ? Math.round(
          fallbackStudents.reduce((sum, student) => sum + student.objectiveCompletion, 0) /
            fallbackStudents.length
        )
      : 0;

  const atRiskTopics = Array.from(
    new Set(
      input.students.flatMap((student) =>
        student.allStruggles.slice(0, 2).map((item) => item.topic)
      )
    )
  ).slice(0, 5);

  return {
    students: fallbackStudents,
    topicTalentMap,
    courseInsights: {
      objectiveCoverage,
      weeklyTrend:
        objectiveCoverage >= 75
          ? "The class is progressing well toward the course objectives."
          : objectiveCoverage >= 55
          ? "The class is moving steadily, but some objectives need more reinforcement."
          : "Several students need tighter guidance to reach the course objectives.",
      atRiskTopics,
      recommendedActions: [
        "Run one weekly mini-check focused on theory plus implementation.",
        "Pair strong students with peers in their best topic area.",
        "Use the highlighted growth topics to personalize revision tasks.",
      ],
      personalizationSummary:
        "Students are moving at different speeds, so targeted support by topic will improve course completion confidence.",
    },
  };
}

function normalizeCourseIntelligence(
  parsed: Partial<CourseLearningIntelligence>,
  input: CourseAnalyticsInput
) {
  const fallback = fallbackCourseIntelligence(input);
  const studentIds = new Set(input.students.map((student) => student.studentId));

  const students = (parsed.students ?? [])
    .filter((student): student is CourseStudentInsight => Boolean(student?.studentId))
    .filter((student) => studentIds.has(student.studentId))
    .map((student) => ({
      studentId: student.studentId,
      objectiveCompletion: clamp(student.objectiveCompletion),
      goalProgress: clamp(student.goalProgress),
      weeklyMomentum: clamp(student.weeklyMomentum),
      theoryUnderstanding: clamp(student.theoryUnderstanding),
      practicalSkill: clamp(student.practicalSkill),
      strengths: (student.strengths ?? []).slice(0, 4).map((item) => ({
        topic: String(item.topic ?? "Strength area"),
        reason: String(item.reason ?? "Strong recent evidence."),
      })),
      growthTopics: (student.growthTopics ?? []).slice(0, 4).map((item) => ({
        topic: String(item.topic ?? "Improvement area"),
        reason: String(item.reason ?? "Needs more practice."),
      })),
      recommendedSupport: (student.recommendedSupport ?? [])
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 4),
      bestContributionAreas: (student.bestContributionAreas ?? [])
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 4),
      coachSummary: String(student.coachSummary ?? ""),
    }));

  const mergedStudents = fallback.students.map((fallbackStudent) => {
    const aiStudent = students.find((student) => student.studentId === fallbackStudent.studentId);
    return aiStudent
      ? {
          ...fallbackStudent,
          ...aiStudent,
          strengths: aiStudent.strengths.length ? aiStudent.strengths : fallbackStudent.strengths,
          growthTopics: aiStudent.growthTopics.length
            ? aiStudent.growthTopics
            : fallbackStudent.growthTopics,
          recommendedSupport: aiStudent.recommendedSupport.length
            ? aiStudent.recommendedSupport
            : fallbackStudent.recommendedSupport,
          bestContributionAreas: aiStudent.bestContributionAreas.length
            ? aiStudent.bestContributionAreas
            : fallbackStudent.bestContributionAreas,
          coachSummary: aiStudent.coachSummary || fallbackStudent.coachSummary,
        }
      : fallbackStudent;
  });

  const topicTalentMap = (parsed.topicTalentMap ?? [])
    .filter((item): item is TopicTalentInsight => Boolean(item?.topic))
    .map((item) => ({
      topic: String(item.topic),
      studentIds: (item.studentIds ?? []).filter((id) => studentIds.has(id)).slice(0, 3),
      reason: String(item.reason ?? "Strong evidence from recent performance."),
    }))
    .filter((item) => item.studentIds.length > 0)
    .slice(0, 10);

  return {
    students: mergedStudents,
    topicTalentMap: topicTalentMap.length ? topicTalentMap : fallback.topicTalentMap,
    courseInsights: {
      objectiveCoverage: clamp(
        parsed.courseInsights?.objectiveCoverage ?? fallback.courseInsights.objectiveCoverage
      ),
      weeklyTrend:
        parsed.courseInsights?.weeklyTrend?.trim() || fallback.courseInsights.weeklyTrend,
      atRiskTopics:
        parsed.courseInsights?.atRiskTopics?.map((item) => String(item)).slice(0, 6) ??
        fallback.courseInsights.atRiskTopics,
      recommendedActions:
        parsed.courseInsights?.recommendedActions
          ?.map((item) => String(item))
          .filter(Boolean)
          .slice(0, 4) ?? fallback.courseInsights.recommendedActions,
      personalizationSummary:
        parsed.courseInsights?.personalizationSummary?.trim() ||
        fallback.courseInsights.personalizationSummary,
    },
  };
}

export async function generateCourseLearningIntelligence(
  input: CourseAnalyticsInput
): Promise<CourseLearningIntelligence> {
  if (!input.students.length) {
    return fallbackCourseIntelligence(input);
  }

  const compactPayload = {
    course: {
      id: input.courseId,
      name: input.name,
      code: input.code,
      objectives: input.objectives.slice(0, 6),
      learningOutcomes: input.learningOutcomes.slice(0, 6),
      units: input.units.slice(0, 6),
    },
    students: input.students.map((student) => ({
      studentId: student.studentId,
      fullName: student.fullName,
      avgScore: student.avgScore,
      completionRate: student.completionRate,
      interactionCount: student.interactionCount,
      struggles: student.allStruggles.slice(0, 5),
      recentAssessments: student.assessmentSubmissions.slice(0, 5).map((item) => ({
        title: item.title,
        type: item.type,
        pct: item.total_marks > 0 ? Math.round((item.ai_score / item.total_marks) * 100) : 0,
        submitted_at: item.submitted_at,
      })),
      last14DaysChat: student.chatTimeline,
    })),
  };

  try {
    const result = await geminiFlash.generateContent(`
You are an academic learning analyst for a university course. Based on the course objectives and each student's evidence, infer:
- how close each student is to completing the course objectives,
- weekly learning momentum,
- theory vs practical ability,
- what topics each student is strongest in,
- what topics each student needs support in,
- how the professor should personalize support,
- which students appear strongest in which topic areas across the class.

Be conservative. If evidence is weak, infer gently and say so in the reason.
Return ONLY valid JSON and no markdown.

Required JSON:
{
  "students": [
    {
      "studentId": "uuid",
      "objectiveCompletion": 0,
      "goalProgress": 0,
      "weeklyMomentum": 0,
      "theoryUnderstanding": 0,
      "practicalSkill": 0,
      "strengths": [{ "topic": "", "reason": "" }],
      "growthTopics": [{ "topic": "", "reason": "" }],
      "recommendedSupport": [""],
      "bestContributionAreas": [""],
      "coachSummary": ""
    }
  ],
  "topicTalentMap": [
    { "topic": "", "studentIds": ["uuid"], "reason": "" }
  ],
  "courseInsights": {
    "objectiveCoverage": 0,
    "weeklyTrend": "",
    "atRiskTopics": [""],
    "recommendedActions": [""],
    "personalizationSummary": ""
  }
}

Input:
${JSON.stringify(compactPayload)}
    `);

    const parsed = parseJson<Partial<CourseLearningIntelligence>>(result.response.text());
    return normalizeCourseIntelligence(parsed, input);
  } catch (error) {
    console.error("[generateCourseLearningIntelligence]", error);
    return fallbackCourseIntelligence(input);
  }
}

function fallbackStudentLearningProfile(
  input: StudentLearningProfileInput
): StudentLearningProfile {
  const courseProgress: StudentCourseInsight[] = input.courses.map((course) => {
    const recentAverage =
      course.recentAssessments.length > 0
        ? Math.round(
            course.recentAssessments.reduce((sum, item) => {
              const pct = item.total_marks > 0 ? (item.ai_score / item.total_marks) * 100 : 0;
              return sum + pct;
            }, 0) / course.recentAssessments.length
          )
        : course.avgPct ?? 55;
    const objectiveCompletion = clamp(
      recentAverage * 0.55 +
        (course.total > 0 ? (course.submitted / course.total) * 100 : 50) * 0.3 +
        Math.max(0, 20 - course.struggles.reduce((sum, item) => sum + item.count, 0) * 2)
    );

    return {
      courseId: course.courseId,
      objectiveCompletion,
      learningPace:
        objectiveCompletion >= 75 ? "fast" : objectiveCompletion >= 55 ? "steady" : "needs_support",
      confidenceLabel:
        objectiveCompletion >= 75
          ? "Ready for stretch work"
          : objectiveCompletion >= 55
          ? "Building steadily"
          : "Needs guided repetition",
      currentFocus:
        course.struggles[0]?.topic ??
        pickCourseTopics(course.objectives, course.learningOutcomes, course.units, 1)[0] ??
        "core concepts",
      strengths: [
        recentAverage >= 75 ? "assessment performance" : "steady participation",
        (course.recentAssessments[0]?.type ?? "quiz") === "assignment"
          ? "applied practice"
          : "theory recall",
      ],
      supportStrategies: [
        course.struggles[0]
          ? `Spend one focused session on ${course.struggles[0].topic}.`
          : "Review one learning outcome with examples.",
        "Use short practice bursts instead of one long session.",
        recentAverage < 70
          ? "Close each study session with a self-test."
          : "Increase difficulty gradually with mixed questions.",
      ],
    };
  });

  const growthPriorities = input.struggles.slice(0, 5).map((item) => ({
    topic: item.topic,
    reason: "This topic appears repeatedly across your recent learning signals.",
  }));

  return {
    overallNarrative:
      input.percentile >= 70
        ? "You are tracking well overall, and your next gains will come from sharpening a few weak spots rather than relearning everything."
        : input.percentile >= 40
        ? "You are making steady progress, but a more personalized study rhythm will help you close the gap to the course goals faster."
        : "You need a tighter support loop right now: shorter revision cycles, more guided practice, and fast feedback on your weak topics.",
    personalStrengths: Array.from(
      new Set(courseProgress.flatMap((course) => course.strengths))
    ).slice(0, 4),
    growthPriorities,
    personalizedPlan: [
      "Start each week by revising one learning outcome and one practical task.",
      "Use your struggle topics to choose the next focused practice set.",
      "After each study block, explain the concept in your own words before moving on.",
    ],
    weeklyFocus: growthPriorities.length
      ? growthPriorities.slice(0, 3).map((item) => `Work on ${item.topic} with one theory check and one applied exercise.`)
      : ["Keep consolidating your strongest course topics with slightly harder practice."],
    courseProgress,
  };
}

function normalizeStudentLearningProfile(
  parsed: Partial<StudentLearningProfile>,
  input: StudentLearningProfileInput
) {
  const fallback = fallbackStudentLearningProfile(input);
  const courseIds = new Set(input.courses.map((course) => course.courseId));

  const courseProgress = (parsed.courseProgress ?? [])
    .filter((course): course is StudentCourseInsight => Boolean(course?.courseId))
    .filter((course) => courseIds.has(course.courseId))
    .map((course) => ({
      courseId: course.courseId,
      objectiveCompletion: clamp(course.objectiveCompletion),
      learningPace:
        course.learningPace === "fast" ||
        course.learningPace === "steady" ||
        course.learningPace === "needs_support"
          ? course.learningPace
          : "steady",
      confidenceLabel: String(course.confidenceLabel ?? "Building steadily"),
      currentFocus: String(course.currentFocus ?? "Core objectives"),
      strengths: (course.strengths ?? []).map((item) => String(item)).filter(Boolean).slice(0, 4),
      supportStrategies: (course.supportStrategies ?? [])
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 4),
    }));

  const mergedCourseProgress = fallback.courseProgress.map((course) => {
    const aiCourse = courseProgress.find((item) => item.courseId === course.courseId);
    return aiCourse
      ? {
          ...course,
          ...aiCourse,
          strengths: aiCourse.strengths.length ? aiCourse.strengths : course.strengths,
          supportStrategies: aiCourse.supportStrategies.length
            ? aiCourse.supportStrategies
            : course.supportStrategies,
        }
      : course;
  });

  return {
    overallNarrative: parsed.overallNarrative?.trim() || fallback.overallNarrative,
    personalStrengths:
      parsed.personalStrengths?.map((item) => String(item)).filter(Boolean).slice(0, 5) ??
      fallback.personalStrengths,
    growthPriorities:
      parsed.growthPriorities?.map((item) => ({
        topic: String(item.topic ?? "Growth area"),
        reason: String(item.reason ?? "Needs more guided practice."),
      })).slice(0, 5) ?? fallback.growthPriorities,
    personalizedPlan:
      parsed.personalizedPlan?.map((item) => String(item)).filter(Boolean).slice(0, 5) ??
      fallback.personalizedPlan,
    weeklyFocus:
      parsed.weeklyFocus?.map((item) => String(item)).filter(Boolean).slice(0, 4) ??
      fallback.weeklyFocus,
    courseProgress: mergedCourseProgress,
  };
}

export async function generateStudentLearningProfile(
  input: StudentLearningProfileInput
): Promise<StudentLearningProfile> {
  if (!input.courses.length) {
    return fallbackStudentLearningProfile(input);
  }

  const compactPayload = {
    percentile: input.percentile,
    totalChats: input.totalChats,
    struggles: input.struggles.slice(0, 6),
    courses: input.courses.map((course) => ({
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      objectives: course.objectives.slice(0, 5),
      learningOutcomes: course.learningOutcomes.slice(0, 5),
      topics: pickCourseTopics(course.objectives, course.learningOutcomes, course.units, 6),
      avgPct: course.avgPct,
      completion: course.total > 0 ? Math.round((course.submitted / course.total) * 100) : 0,
      struggles: course.struggles.slice(0, 4),
      recentAssessments: course.recentAssessments.slice(0, 4).map((item) => ({
        title: item.title,
        type: item.type,
        pct: item.total_marks > 0 ? Math.round((item.ai_score / item.total_marks) * 100) : 0,
      })),
    })),
  };

  try {
    const result = await geminiFlash.generateContent(`
You are an AI learning coach for a student. Use the student's course goals, scores, struggles, and activity to create a personalized progress interpretation.

Return ONLY valid JSON and no markdown.

Required JSON:
{
  "overallNarrative": "",
  "personalStrengths": [""],
  "growthPriorities": [{ "topic": "", "reason": "" }],
  "personalizedPlan": [""],
  "weeklyFocus": [""],
  "courseProgress": [
    {
      "courseId": "uuid",
      "objectiveCompletion": 0,
      "learningPace": "fast" | "steady" | "needs_support",
      "confidenceLabel": "",
      "currentFocus": "",
      "strengths": [""],
      "supportStrategies": [""]
    }
  ]
}

Design the advice to improve struggling topics and adapt to different learning capacity. Keep it encouraging, specific, and actionable.

Input:
${JSON.stringify(compactPayload)}
    `);

    const parsed = parseJson<Partial<StudentLearningProfile>>(result.response.text());
    return normalizeStudentLearningProfile(parsed, input);
  } catch (error) {
    console.error("[generateStudentLearningProfile]", error);
    return fallbackStudentLearningProfile(input);
  }
}
