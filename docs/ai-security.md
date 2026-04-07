# AI and Security Notes

## 1. AI Architecture

The project uses multiple AI paths for different tasks instead of forcing one model to do everything.

### Groq Usage

Groq is used for:

- real-time student chat tutoring
- streaming course-aware responses
- low-latency interactive answers

### Gemini Usage

Gemini is used for:

- syllabus parsing
- assignment evaluation
- short-answer grading
- learning-intelligence inference
- page assistant reasoning
- embedding generation for RAG

This separation is intentional:

- Groq provides strong interactive chat performance
- Gemini is used where structured output or evaluation behavior is more useful

## 2. RAG Design

The student course chatbot uses retrieval-augmented generation:

1. course materials are uploaded
2. text is extracted and chunked
3. embeddings are generated
4. vectors are stored in `course_embeddings`
5. relevant chunks are retrieved during chat
6. the LLM answers with course-grounded context

Benefits:

- reduces hallucination compared to a generic chatbot
- makes answers align better with professor materials
- preserves flexibility for deeper explanation

## 3. Learning Intelligence Design

The learning intelligence system combines:

- assessment performance
- student chat activity
- struggle topics
- course objectives
- unit-level course structure

It produces:

- objective completion estimates
- strength and weakness summaries
- topic specialization signals
- personalized student improvement suggestions
- professor-facing intervention insights

This creates a bridge between raw interaction data and useful educational recommendations.

## 4. Page-Scoped AI Assistants

Each important dashboard page includes its own assistant. These assistants are intentionally scoped.

Examples:

- `To Do` assistant helps prioritize pending work
- `My Progress` assistant focuses on improvement and performance strategy
- `My Courses` assistant answers course-specific questions
- `Analytics` assistant helps professors analyze course performance
- `Flagged Questions` assistant helps prioritize responses
- `Calendar` assistant reasons about schedules and deadlines

This design improves relevance and helps prevent drift into unrelated topics.

## 5. Final Security Improvements

The final project version includes server-side validation for important operations.

### Problems Addressed

Earlier, some routes trusted IDs sent directly by the browser. That could allow a client to:

- pretend to be another student
- submit work for a different student
- access course-related operations without actual enrollment
- query certain support features for arbitrary users

### Final Fix

Important APIs now:

- validate the logged-in user through `auth.getUser()`
- validate role where needed
- validate course ownership or course enrollment server-side
- derive student identity from the session instead of the browser payload

### Protected Areas

- student course chat
- quiz submission
- assignment submission
- micro-quiz generation
- study buddy matching
- page-scoped assistant access
- interview request creation
- calendar event ownership checks

## 6. Why This Matters

Even for a course project, this matters because:

- grades and submissions should not be spoofable
- analytics should reflect real user behavior
- demo data should remain trustworthy
- role boundaries should be properly enforced

These changes improve the credibility of the project during evaluation.

## 7. Reliability Considerations

The project also includes practical operational safeguards:

- duplicate submission prevention
- private storage buckets for materials and submissions
- structured JSON prompts for evaluation tasks
- professor escalation when the tutor lacks confidence
- clearer validation around calendar timestamps and scheduling

## 8. Suggested Future Improvements

- formal Supabase Row Level Security policies across all tables
- background jobs for long-running AI evaluation tasks
- audit logging for key professor/student actions
- retry and fallback strategies for LLM failures
- more deterministic analytics scoring in addition to LLM inference
