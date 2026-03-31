# EduAI — Academic AI Platform for IIIT Dharwad

> The smarter way to learn & teach at IIIT Dharwad.

**Live:** [https://iiitdwd-edu.vercel.app](https://iiitdwd-edu.vercel.app)

EduAI is a full-stack academic platform that brings AI-powered Q&A, RAG over course materials, automated assignment evaluation, and real-time analytics to professors and students at IIIT Dharwad.

---

## Features

### Professor Portal
- **Course Creation** — Upload a syllabus PDF and Gemini AI automatically extracts course details, units, objectives, and textbooks into an editable form
- **Material Upload** — Upload PDF, DOCX, or PPTX course materials; content is extracted, chunked, embedded via Gemini, and indexed into pgvector for RAG
- **Submission Evaluation** — Students submit assignment PDFs; Gemini evaluates against the course rubric and returns structured AI feedback with scores
- **Grade Confirmation** — Professors review AI feedback, optionally override scores, and confirm final grades
- **Flagged Questions** — View student questions the AI couldn't answer; reply directly and answers appear in the student's chat history
- **Analytics** — Per-course student performance table with interaction counts, average AI scores, and top struggle topics

### Student Portal
- **Course Enrollment** — Join courses via course code shared by the professor
- **AI Chat Tutor** — RAG-augmented chat powered by Groq (LLaMA 3.3 70B); answers are grounded in uploaded course materials
- **Material Viewer** — Browse and open indexed course materials directly from the course panel
- **Assignment Submission** — Submit assignment PDFs and receive instant AI feedback before the professor confirms the grade
- **My Progress** — View struggle topics, class standing percentile, and 14-day chat activity timeline

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
│   │   ├── chat/                  # RAG-augmented streaming chat (SSE)
│   │   ├── courses/parse-syllabus/ # Gemini syllabus PDF parser
│   │   ├── flagged/answer/        # Professor reply to flagged questions
│   │   ├── materials/upload/      # SSE upload → extract → embed pipeline
│   │   └── submissions/
│   │       ├── confirm/           # Professor grade confirmation
│   │       └── evaluate/          # Gemini PDF evaluation
│   ├── auth/                      # Login / Signup page
│   └── dashboard/
│       ├── professor/             # Professor portal pages
│       └── student/               # Student portal pages
├── components/
│   ├── professor/                 # Professor UI components
│   └── student/                   # Student UI components
├── lib/
│   ├── gemini.ts                  # Gemini Flash + embedding client
│   ├── groq.ts                    # Groq client
│   ├── rag.ts                     # RAG retrieval functions
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

-- Submissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  student_id uuid references profiles(id),
  title text,
  file_path text,
  status text default 'pending',
  ai_feedback jsonb,
  ai_scores jsonb,
  overall_score float,
  professor_score float,
  professor_notes text,
  created_at timestamptz default now()
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
```

### 4. Supabase Storage buckets

Create two **private** buckets in Supabase Storage:
- `course-materials`
- `submissions`

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
