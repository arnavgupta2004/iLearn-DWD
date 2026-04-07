# iLearn DWD — AI Academic Platform for IIIT Dharwad

> The smarter way to learn & teach at IIIT Dharwad.

**Live:** [https://iiitdwd-edu.vercel.app](https://iiitdwd-edu.vercel.app)

iLearn DWD is a full-stack academic platform for teaching and learning at IIIT Dharwad. It combines AI tutoring, retrieval-augmented generation over uploaded course materials, professor-managed quizzes and assignment requests, personalized student progress intelligence, topic analytics, and calendar-based academic scheduling in one system.

This project was built as an end-to-end academic assistant for two roles:
- **Professors** manage courses, upload materials, create quizzes or assignment requests, review flagged questions, track analytics, and manage calendar events/interview requests.
- **Students** enroll in courses, learn through an AI tutor, complete professor-requested assessments, monitor progress course-wise, and use calendar/interview features for planning and support.

---

## Features

### Professor Portal
- **Course Creation** — Upload a syllabus PDF and Gemini AI automatically extracts course details, units, objectives, and textbooks into an editable form
- **Material Upload** — Upload PDF, DOCX, or PPTX course materials; content is extracted, chunked, embedded via Gemini, and indexed into pgvector for RAG
- **Quiz & Assignment Requests** — Professors can explicitly create on-platform quizzes or request PDF assignment submissions from students
- **Flagged Questions** — View student questions the AI couldn't answer; reply directly and answers appear in the student's chat history
- **AI Analytics** — Per-course objective completion, theory vs practical skill, weekly momentum, student topic strengths, and personalized support suggestions
- **Topic Expertise View** — See which students are strongest in which topics of a course
- **Calendar & Scheduling** — Add classes, meetings, office hours, and manage student interview requests in the professor calendar
- **Page-Specific AI Assistants** — Context-aware chatbots help professors reason about courses, flagged questions, analytics, and calendar items

### Student Portal
- **Course Enrollment** — Join courses via course code shared by the professor
- **AI Chat Tutor** — RAG-augmented chat powered by Groq (LLaMA 3.3 70B); answers are grounded in uploaded course materials
- **Material Viewer** — Browse and open indexed course materials directly from the course panel
- **Professor-Requested Submissions** — Students can submit quizzes and assignment PDFs only after the professor creates the request
- **My Progress** — AI-generated course-wise progress tracking with objective completion, growth priorities, and personalized improvement guidance
- **Smart To Do** — Upcoming quizzes and assignment requests are automatically surfaced and prioritized
- **Calendar & Interviews** — View deadlines, scheduled classes/events, and request interview/discussion slots with professors
- **Study Support** — AI-inferred struggle topics, study buddies, micro-quizzes, and guided improvement recommendations
- **Page-Specific AI Assistants** — Dedicated assistants help students with courses, to-do prioritization, progress improvement, and calendar planning

### AI Capabilities
- **Syllabus Intelligence** — Extracts structured course metadata from a PDF syllabus
- **RAG Tutor** — Uses uploaded course materials as grounding context for student chat
- **Assignment & Quiz Evaluation** — Automatically scores quizzes and assignment PDFs with feedback
- **Learning Intelligence** — Infers course objective completion, student strengths, weak areas, and personalized suggestions
- **Flag Escalation** — Detects uncertain AI answers and forwards them to professors when needed
- **Page-Scoped Assistants** — Each dashboard page has its own context-limited chatbot

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI — Chat | Groq API (LLaMA 3.3 70B Versatile) |
| AI — Parsing & Evaluation | Google Gemini 2.0 Flash |
| AI — Embeddings | Gemini Embedding 001 (768-dim, via REST) |
| RAG | pgvector cosine similarity search |
| Deployment | Vercel |

---

## Project Structure

```
eduai/
├── app/
│   ├── api/
│   │   ├── analytics/student/     # Student percentile ranking
│   │   ├── assessments/           # Quiz/assignment creation and submissions
│   │   ├── chat/                  # RAG-augmented streaming chat (SSE)
│   │   ├── calendar/              # Calendar events + interview request APIs
│   │   ├── courses/parse-syllabus/ # Gemini syllabus PDF parser
│   │   ├── flagged/answer/        # Professor reply to flagged questions
│   │   ├── materials/upload/      # SSE upload → extract → embed pipeline
│   │   └── page-chat/             # Page-scoped AI assistant API
│   ├── auth/                      # Login / Signup page
│   └── dashboard/
│       ├── professor/             # Professor portal pages
│       └── student/               # Student portal pages
├── components/
│   ├── professor/                 # Professor UI components
│   ├── shared/                    # Shared page assistant + calendar components
│   └── student/                   # Student UI components
├── lib/
│   ├── calendar.ts                # Calendar event shaping helpers
│   ├── learning-intelligence.ts   # AI progress and analytics inference
│   ├── gemini.ts                  # Gemini Flash + embedding client
│   ├── groq.ts                    # Groq client
│   ├── rag.ts                     # RAG retrieval functions
│   ├── struggle-tracker.ts        # Topic struggle tagging helpers
│   ├── doc-processor.ts           # PDF/DOCX/PPTX text extraction & chunking
│   ├── supabase.ts                # Browser Supabase client
│   ├── supabase-server.ts         # Server Supabase client (cookie-aware)
│   └── supabase-admin.ts          # Service role client (bypasses RLS)
└── middleware.ts                  # Auth guard + role-based redirects
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### 1. Clone and install

```bash
git clone <repo-url>
cd eduai
npm install
```

### 2. Environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_google_ai_studio_key
GROQ_API_KEY=your_groq_api_key
```

### 3. Database setup

Run the following in your **Supabase SQL Editor**:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id),
  email text,
  full_name text,
  role text check (role in ('professor', 'student'))
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  prof_id uuid references profiles(id),
  name text, code text, credits int,
  faculty_name text, required_knowledge text,
  objectives text[], learning_outcomes text[],
  difficulty_level text, assessment_weights jsonb,
  attendance_policy text, rubric_criteria jsonb,
  created_at timestamptz default now()
);

-- Enrollments
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  course_id uuid references courses(id),
  created_at timestamptz default now()
);

-- Course units
create table course_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  unit_number int, title text, hours int, topics text[]
);

-- Textbooks
create table textbooks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  title text, author text, url text
);

-- Course materials
create table course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  file_name text, file_path text, file_url text,
  file_type text, file_size bigint,
  indexed boolean default false,
  uploaded_at timestamptz default now()
);

-- Course embeddings (RAG)
create table course_embeddings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  material_id uuid references course_materials(id),
  content text,
  embedding vector(768)
);

-- pgvector match function
create or replace function match_course_embeddings(
  query_embedding vector(768),
  match_course_id uuid,
  match_count int default 12
)
returns table (content text, similarity float)
language sql stable as $$
  select content, 1 - (embedding <=> query_embedding) as similarity
  from course_embeddings
  where course_id = match_course_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Chat messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  student_id uuid references profiles(id),
  role text check (role in ('user', 'assistant')),
  content text,
  flagged_for_prof boolean default false,
  created_at timestamptz default now()
);

-- Flagged questions
create table flagged_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  student_id uuid references profiles(id),
  question text,
  ai_response text,
  prof_answer text,
  answered_at timestamptz,
  created_at timestamptz default now()
);

-- Assessments (single active submission system)
create table assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  prof_id uuid references profiles(id),
  title text not null,
  description text,
  type text not null check (type in ('quiz', 'assignment')),
  due_date timestamptz,
  total_marks int default 100,
  created_at timestamptz default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  question_number int not null,
  question_text text not null,
  question_type text not null check (question_type in ('mcq', 'short_answer')),
  options text[],
  correct_answer text,
  marks int default 1
);

create table assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  student_id uuid references profiles(id),
  course_id uuid references courses(id),
  type text not null check (type in ('quiz', 'assignment')),
  answers jsonb,
  file_path text,
  status text default 'evaluated',
  ai_score float,
  total_marks float,
  ai_feedback text,
  ai_breakdown jsonb,
  evaluated_at timestamptz,
  submitted_at timestamptz default now(),
  rank int,
  total_students int
);

-- Student topic struggles (analytics)
create table student_topic_struggles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  course_id uuid references courses(id),
  topic text,
  count int default 1,
  last_seen_at timestamptz default now()
);

-- Professor calendar events
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  prof_id uuid references profiles(id),
  course_id uuid references courses(id),
  title text not null,
  description text,
  event_type text not null check (event_type in ('class', 'meeting', 'office_hour', 'custom')),
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  created_at timestamptz default now()
);

-- Student interview / discussion requests
create table interview_requests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  prof_id uuid references profiles(id),
  student_id uuid references profiles(id),
  title text not null,
  agenda text,
  preferred_start timestamptz not null,
  preferred_end timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  response_note text,
  created_at timestamptz default now()
);
```

### 4. Supabase Storage buckets

Create two **private** buckets in Supabase Storage:
- `course-materials`
- `submissions`

Note:
- The assignment submission route can create the `submissions` bucket automatically if it is missing, but creating both buckets explicitly in Supabase is still recommended for first-time setup.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Deploy

---

## Important Implementation Notes

- **Single submission system**: the project now uses only `assessments` and `assessment_submissions`. The older legacy submission flow has been removed from the active app.
- **Session-based API protection**: important student-facing routes such as chat, quiz submission, assignment submission, study matching, micro-quiz generation, page chat, and calendar interview requests now validate the authenticated session server-side instead of trusting browser-sent student IDs.
- **Calendar support**: both professor and student calendars depend on the `calendar_events` and `interview_requests` tables being created in Supabase.
- **Storage**: uploaded course files are stored in `course-materials`; assignment PDFs are stored in `submissions`.

---

## Suggested Demo Flow

If you are presenting this project, a good end-to-end flow is:
1. Professor creates a course from syllabus upload.
2. Professor uploads materials and creates a quiz or assignment request.
3. Student enrolls, opens the course, chats with the AI tutor, and submits work.
4. Student checks `To Do`, `My Progress`, and `Calendar`.
5. Professor opens `Flagged Questions`, `Analytics`, and `Calendar` to review insights and requests.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GROQ_API_KEY` | Groq API key |

---

## Built at IIIT Dharwad

© 2026 IIIT Dharwad. All rights reserved.
