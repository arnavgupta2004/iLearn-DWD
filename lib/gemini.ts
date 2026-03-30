import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// text-embedding-004 (768-dim output)
export const geminiEmbedding = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

/**
 * Embed text with optional task type.
 * - RETRIEVAL_DOCUMENT  → for indexing document chunks
 * - RETRIEVAL_QUERY     → for embedding search queries
 */
export async function embedText(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[]> {
  const result = await geminiEmbedding.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType,
  });
  return result.embedding.values;
}
