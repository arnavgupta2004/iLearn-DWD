# API Flows and Backend Sequences

## 1. API Groups

### Authentication and Navigation Support
- Supabase Auth via server/client helpers
- middleware-based route redirection by role

### Course and Content APIs
- `/api/courses/parse-syllabus`
- `/api/materials/upload`

### Learning and Chat APIs
- `/api/chat`
- `/api/page-chat`

### Assessment APIs
- `/api/assessments/create`
- `/api/assessments/[assessmentId]/questions`
- `/api/assessments/[assessmentId]/submit-quiz`
- `/api/assessments/[assessmentId]/submit-assignment`
- `/api/assessments/micro`

### Analytics and Support APIs
- `/api/analytics/student`
- `/api/study-match`
- `/api/flagged/answer`

### Calendar APIs
- `/api/calendar/events`
- `/api/calendar/interviews/request`
- `/api/calendar/interviews/respond`

## 2. Chat Flow

### Purpose
Provide a course-aware AI tutor using RAG and stream the answer back to the student.

```mermaid
sequenceDiagram
    participant S as Student UI
    participant API as /api/chat
    participant DB as Supabase
    participant RAG as pgvector Retrieval
    participant G as Groq

    S->>API: Send messages + course context
    API->>DB: Validate session and enrollment
    API->>RAG: Retrieve relevant chunks
    API->>G: Send system prompt + messages
    G-->>API: Stream response
    API-->>S: SSE text stream
    API->>DB: Save chat messages
    API->>DB: Save flagged question if needed
```

### Notes
- uses server-side session validation
- stores both user and assistant messages
- can tag struggle topics from student questions

## 3. Material Upload Flow

### Purpose
Convert uploaded documents into indexed course knowledge for retrieval.

```mermaid
sequenceDiagram
    participant P as Professor UI
    participant API as /api/materials/upload
    participant ST as Storage
    participant DP as Document Processor
    participant GM as Gemini Embeddings
    participant DB as Supabase

    P->>API: Upload file
    API->>ST: Save source file
    API->>DP: Extract text and chunk content
    API->>GM: Generate embeddings
    API->>DB: Save material row
    API->>DB: Save vector rows
    API-->>P: Upload status complete
```

## 4. Quiz Submission Flow

### Purpose
Evaluate a student quiz securely and store results.

```mermaid
sequenceDiagram
    participant S as Student UI
    participant API as /api/assessments/[id]/submit-quiz
    participant DB as Supabase
    participant GM as Gemini

    S->>API: Submit answers
    API->>DB: Validate session and enrollment
    API->>DB: Fetch quiz questions
    API->>API: Evaluate MCQ answers
    API->>GM: Evaluate short answers
    API->>DB: Save submission
    API->>DB: Recompute rank
    API-->>S: Return score, rank, feedback
```

### Notes
- does not trust browser-sent student identity
- supports both deterministic and AI-assisted grading

## 5. Assignment Submission Flow

### Purpose
Accept a PDF assignment, extract text, evaluate it, and store structured feedback.

```mermaid
sequenceDiagram
    participant S as Student UI
    participant API as /api/assessments/[id]/submit-assignment
    participant ST as Storage
    participant DB as Supabase
    participant GM as Gemini

    S->>API: Upload assignment PDF
    API->>DB: Validate session and enrollment
    API->>ST: Store PDF
    API->>API: Extract PDF text
    API->>GM: Evaluate submission
    API->>DB: Save feedback and score
    API->>DB: Recompute rank
    API-->>S: Return score and evaluation breakdown
```

## 6. Adaptive Micro-Quiz Flow

### Purpose
Generate a short quiz based on the student’s struggle topics.

```mermaid
sequenceDiagram
    participant S as Student UI
    participant API as /api/assessments/micro
    participant DB as Supabase
    participant GM as Gemini

    S->>API: Request micro-quiz for current course
    API->>DB: Validate session and enrollment
    API->>DB: Read top struggle topics
    API->>GM: Generate 3 MCQ questions
    API->>DB: Create assessment
    API->>DB: Insert quiz questions
    API-->>S: Return created quiz
```

## 7. Study Match Flow

### Purpose
Suggest peers who can support a student in struggle areas.

```mermaid
sequenceDiagram
    participant S as Student UI
    participant API as /api/study-match
    participant DB as Supabase

    S->>API: Request study buddies
    API->>DB: Validate session and enrollment
    API->>DB: Read student struggle topics
    API->>DB: Read enrolled classmates
    API->>API: Build match suggestions
    API-->>S: Return study buddy list
```

## 8. Calendar Event Flow

### Purpose
Allow professors to create academic events tied to courses or general schedule items.

```mermaid
sequenceDiagram
    participant P as Professor UI
    participant API as /api/calendar/events
    participant DB as Supabase

    P->>API: Create event
    API->>DB: Validate session and professor role
    API->>DB: Validate course ownership if course-linked
    API->>DB: Insert calendar event
    API-->>P: Return success
```

## 9. Interview Request Flow

### Student Request

```mermaid
sequenceDiagram
    participant S as Student UI
    participant API as /api/calendar/interviews/request
    participant DB as Supabase

    S->>API: Request interview
    API->>DB: Validate session and student role
    API->>DB: Validate enrollment in selected course
    API->>DB: Resolve professor from course
    API->>DB: Insert request
    API-->>S: Return success
```

### Professor Response

```mermaid
sequenceDiagram
    participant P as Professor UI
    participant API as /api/calendar/interviews/respond
    participant DB as Supabase

    P->>API: Approve / decline request
    API->>DB: Validate session and professor role
    API->>DB: Update only professor-owned request
    API-->>P: Return success
```

## 10. Page Assistant Flow

### Purpose
Provide contextual assistants with page-bounded data.

```mermaid
sequenceDiagram
    participant U as User
    participant UI as PageChatbot
    participant API as /api/page-chat
    participant DB as Session/Auth
    participant GM as Gemini

    U->>UI: Ask page-specific question
    UI->>API: Send scope + page context + messages
    API->>DB: Validate session and role
    API->>GM: Generate response from scoped prompt
    API-->>UI: Return answer
```

## 11. Final Backend Design Principles

- server-side session validation for important student/professor operations
- route handlers specialized by domain rather than one monolithic backend
- AI calls reserved for high-value tasks such as tutoring, parsing, grading, and intelligence
- pgvector retrieval for course-grounded responses
- persistent storage of learning events for analytics and progress computation
