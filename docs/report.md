# iLearn DWD
## Final Project Report

## 1. Abstract

iLearn DWD is an AI-powered academic platform designed for IIIT Dharwad to improve both teaching and learning workflows. The system supports two primary actors: professors and students. Professors can create courses from syllabus PDFs, upload materials, create quizzes and assignment requests, answer flagged student questions, analyze class performance, and manage academic calendar events. Students can enroll in courses, interact with an AI tutor grounded in course materials, complete professor-requested assessments, track course-wise progress, request interviews with professors, and receive personalized learning guidance.

The project combines **Next.js**, **Supabase**, **Groq**, **Google Gemini**, and **pgvector-based retrieval** to deliver a practical academic AI system rather than a standalone chatbot. It focuses on personalized learning, measurable course progress, and actionable professor analytics.

## 2. Problem Statement

Traditional course management systems usually provide only static content delivery and generic assessment workflows. They do not:

- personalize support based on student learning pace and struggle areas
- help professors detect student weak topics quickly
- provide AI-assisted course-specific doubt solving
- connect student progress to course objectives
- unify learning, evaluation, analytics, and scheduling in one platform

This project addresses those limitations by building a role-based academic platform where AI actively supports learning, teaching, evaluation, and planning.

## 3. Objectives

The main objectives of the project were:

- build a role-based academic portal for professors and students
- support AI-based course tutoring grounded in uploaded materials
- enable professor-controlled quizzes and assignment submission requests
- generate course-wise student progress intelligence
- provide professor analytics around student strengths, weak topics, and objective completion
- add calendar support for deadlines, classes, meetings, and interviews
- create page-specific assistants for focused contextual help

## 4. Major Features

### 4.1 Professor Features

- course creation from syllabus PDF using Gemini
- course material upload and embedding pipeline
- quiz creation and assignment request creation
- flagged question review and professor response
- analytics dashboard with student progress intelligence
- topic strength mapping across students
- calendar event creation for classes, meetings, and office hours
- student interview request review
- page-scoped assistants for courses, analytics, flagged questions, and calendar

### 4.2 Student Features

- course enrollment by course code
- AI tutor for course-specific doubt solving
- access to uploaded course materials
- professor-requested quiz and assignment submission flow
- course-wise progress dashboard
- AI-generated strengths, growth priorities, and recommendations
- to-do dashboard for pending assessments
- calendar view for deadlines, classes, and interview requests
- study buddy matching
- interview request workflow
- page-scoped assistants for courses, progress, to-do, and calendar

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| Vector Search | pgvector |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| LLM for Chat | Groq LLaMA 3.3 70B Versatile |
| LLM for Parsing/Evaluation | Google Gemini 2.0 Flash |
| Deployment | Vercel |

## 6. System Modules

### 6.1 Course Ingestion Module

This module allows professors to upload a syllabus PDF. Gemini extracts structured academic information such as:

- course title and code
- course objectives
- units and topics
- textbooks
- grading breakdown

This reduces manual setup effort and helps initialize a course quickly.

### 6.2 Material Processing and RAG Module

Professors upload PDF, DOCX, or PPTX files. The system:

1. extracts text from the uploaded file
2. chunks the content
3. generates embeddings
4. stores vectors in `course_embeddings`
5. retrieves relevant chunks during student chat

This enables a course-aware AI tutor rather than a generic LLM response system.

### 6.3 AI Tutor Module

Students interact with a course-specific AI tutor. The tutor uses:

- retrieved material chunks from pgvector
- course metadata
- difficulty level
- model reasoning via Groq

If the system lacks confidence and no meaningful course context is available, the question can be flagged for professor attention.

### 6.4 Assessment Module

The project uses a single active submission system:

- `assessments`
- `quiz_questions`
- `assessment_submissions`

Professors create either:

- quizzes
- assignment requests

Students can submit only after the professor has created the assessment. Quizzes are auto-evaluated using rule-based logic and Gemini for short answers. Assignment PDFs are parsed and evaluated by Gemini with generated feedback.

### 6.5 Learning Intelligence Module

This is one of the most important parts of the project. The system infers:

- course objective completion
- weekly momentum
- theory versus practical strength
- strongest topics per student
- struggle topics
- personalized improvement suggestions
- course-level talent/topic expertise mapping

This intelligence powers both professor analytics and student progress views.

### 6.6 Calendar and Scheduling Module

The calendar system supports:

- class schedules
- meetings
- office hours
- quiz and assignment deadlines
- student interview requests

Students can request discussion slots with professors. Professors can review, approve, or decline these requests.

### 6.7 Page-Specific Assistant Module

Instead of one general chatbot everywhere, the platform deploys **page-scoped assistants**. Each assistant is limited to the context of the current page, such as:

- To Do
- My Progress
- My Courses
- Analytics
- Flagged Questions
- Calendar

This improves answer relevance and reduces off-topic responses.

## 7. Design Decisions

Some important design decisions were:

- use **Next.js App Router** for full-stack role-based pages and APIs
- use **Supabase** to unify auth, database, and storage
- keep a **single active submission model** instead of multiple overlapping systems
- use **RAG** for course-grounded tutoring
- separate **student-facing contextual assistants** by page instead of creating one unrestricted assistant
- compute learning intelligence from existing course signals instead of requiring a large new schema

## 8. Security and Access Control

For the final project version, important student-facing APIs were hardened to validate the authenticated session server-side. The system now derives identity from `auth.getUser()` rather than trusting browser-sent student IDs for critical operations like:

- quiz submission
- assignment submission
- AI course chat
- adaptive micro-quiz generation
- study-buddy matching
- page-scoped assistant access
- interview request creation

This makes the final build more robust and suitable for submission/demo use.

## 9. Outcomes

The final system demonstrates:

- practical use of AI in an educational product
- integration of LLMs for real tasks beyond simple chat
- measurable student progress support
- actionable professor analytics
- a full-stack production-style academic workflow

The project is not just an AI chatbot. It is a complete academic platform with role-specific workflows, persistent data, scheduling support, analytics, and secure evaluation flows.

## 10. Limitations

Current limitations include:

- AI evaluations still depend on LLM judgment quality
- learning intelligence is inference-based, not based on explicit weekly quiz tables
- calendar functionality depends on the corresponding Supabase tables being created
- the system is optimized for academic workflows at course scale, not very large institutional scale

## 11. Future Scope

Possible future improvements include:

- Python microservice for advanced analytics and recommendation models
- background workers for asynchronous long-running AI tasks
- richer professor interventions and automated alerts
- attendance analytics and classroom engagement modeling
- peer group formation using stronger matching logic
- exportable reports for faculty review
- multi-course academic performance forecasting

## 12. Conclusion

iLearn DWD demonstrates how AI can be integrated meaningfully into education by combining tutoring, evaluation, analytics, and academic planning into one coherent platform. The project moves beyond a generic chatbot and shows how LLMs can support real course workflows for both students and professors.

It is a strong demonstration of full-stack development, AI integration, database design, secure API handling, and product-oriented academic system thinking.
