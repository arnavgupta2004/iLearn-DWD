# Architecture and System Design

## 1. High-Level Architecture

```mermaid
flowchart LR
    U1["Student"] --> FE["Next.js Frontend"]
    U2["Professor"] --> FE
    FE --> API["Next.js Route Handlers"]
    API --> AUTH["Supabase Auth"]
    API --> DB["Supabase PostgreSQL"]
    API --> ST["Supabase Storage"]
    API --> VEC["pgvector Retrieval"]
    API --> G["Groq LLM"]
    API --> GM["Google Gemini"]
```

## 2. Role-Based Product View

```mermaid
flowchart TD
    P["Professor Portal"] --> P1["Create course from syllabus"]
    P --> P2["Upload materials"]
    P --> P3["Create quiz / assignment request"]
    P --> P4["Review flagged questions"]
    P --> P5["View analytics"]
    P --> P6["Manage calendar & interviews"]

    S["Student Portal"] --> S1["Enroll in course"]
    S --> S2["Chat with AI tutor"]
    S --> S3["Submit quiz / assignment"]
    S --> S4["Track course-wise progress"]
    S --> S5["Use to-do and calendar"]
    S --> S6["Request interview"]
```

## 3. Backend Component Architecture

```mermaid
flowchart TD
    A["App Router Pages"] --> B["Route Handlers"]
    B --> C["Supabase Server Client"]
    B --> D["Supabase Admin Client"]
    B --> E["AI Services"]

    E --> E1["Groq for tutoring"]
    E --> E2["Gemini for parsing"]
    E --> E3["Gemini for evaluation"]
    E --> E4["Gemini for learning intelligence"]

    D --> F["Postgres tables"]
    D --> G["Storage buckets"]
    D --> H["Vector embeddings"]
```

## 4. Core Functional Architecture

### 4.1 Course Ingestion

```mermaid
sequenceDiagram
    participant P as Professor
    participant UI as Frontend
    participant API as Parse Syllabus API
    participant GM as Gemini
    participant DB as Supabase

    P->>UI: Upload syllabus PDF
    UI->>API: Send file
    API->>GM: Extract course structure
    GM-->>API: Parsed metadata
    API->>DB: Save course, units, textbooks
    API-->>UI: Return created course
```

### 4.2 Material Upload and RAG

```mermaid
sequenceDiagram
    participant P as Professor
    participant UI as Frontend
    participant API as Material Upload API
    participant ST as Storage
    participant GM as Gemini Embeddings
    participant DB as Supabase

    P->>UI: Upload PDF/DOCX/PPTX
    UI->>API: Send file
    API->>ST: Store original file
    API->>API: Extract and chunk text
    API->>GM: Generate embeddings
    API->>DB: Save material + vector chunks
    API-->>UI: Upload complete
```

### 4.3 Student Learning Flow

```mermaid
flowchart TD
    A["Student opens course"] --> B["AI Tutor"]
    A --> C["Assessments panel"]
    A --> D["Study buddies"]
    A --> E["Course materials"]
    B --> F["RAG retrieval"]
    C --> G["Quiz / assignment submission"]
    G --> H["AI evaluation"]
    H --> I["Progress intelligence updates"]
```

## 5. Analytics Architecture

```mermaid
flowchart TD
    CH["Chat history"] --> LI["Learning Intelligence"]
    AS["Assessment submissions"] --> LI
    ST["Struggle topics"] --> LI
    CO["Course objectives"] --> LI
    UN["Course units"] --> LI

    LI --> PR["Student Progress View"]
    LI --> AN["Professor Analytics View"]
```

## 6. Calendar Architecture

```mermaid
flowchart LR
    P["Professor"] --> EV["Calendar Events"]
    S["Student"] --> IR["Interview Requests"]
    EV --> CAL["Calendar Views"]
    IR --> CAL
    AS["Assessment deadlines"] --> CAL
    CAL --> SP["Student Calendar"]
    CAL --> PP["Professor Calendar"]
```

## 7. Important Data Entities

Main tables used in the final system:

- `profiles`
- `courses`
- `enrollments`
- `course_units`
- `textbooks`
- `course_materials`
- `course_embeddings`
- `chat_messages`
- `flagged_questions`
- `assessments`
- `quiz_questions`
- `assessment_submissions`
- `student_topic_struggles`
- `calendar_events`
- `interview_requests`

## 8. High-Level Data Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ COURSES : teaches
    PROFILES ||--o{ ENROLLMENTS : joins
    COURSES ||--o{ ENROLLMENTS : has
    COURSES ||--o{ COURSE_UNITS : contains
    COURSES ||--o{ COURSE_MATERIALS : has
    COURSE_MATERIALS ||--o{ COURSE_EMBEDDINGS : generates
    COURSES ||--o{ ASSESSMENTS : has
    ASSESSMENTS ||--o{ QUIZ_QUESTIONS : contains
    ASSESSMENTS ||--o{ ASSESSMENT_SUBMISSIONS : receives
    PROFILES ||--o{ CHAT_MESSAGES : writes
    COURSES ||--o{ CHAT_MESSAGES : contains
    COURSES ||--o{ FLAGGED_QUESTIONS : produces
    PROFILES ||--o{ STUDENT_TOPIC_STRUGGLES : accumulates
    COURSES ||--o{ STUDENT_TOPIC_STRUGGLES : tracks
    COURSES ||--o{ CALENDAR_EVENTS : schedules
    COURSES ||--o{ INTERVIEW_REQUESTS : relates
```

## 9. Architectural Highlights

- single full-stack codebase using Next.js App Router
- shared Supabase backend for auth, data, and storage
- hybrid AI design using Groq for tutoring and Gemini for structured tasks
- course-aware RAG pipeline through pgvector
- role-specific pages and assistants
- session-based validation for important student-facing operations
