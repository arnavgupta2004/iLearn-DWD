import { embedText } from "./gemini";
import { supabaseAdmin } from "./supabase-admin";

/**
 * Required SQL function — run once in your Supabase SQL editor:
 *
 * CREATE OR REPLACE FUNCTION match_course_embeddings(
 *   query_embedding  vector(768),
 *   match_course_id  uuid,
 *   match_count      int DEFAULT 5
 * )
 * RETURNS TABLE (content text, similarity float)
 * LANGUAGE sql STABLE
 * AS $$
 *   SELECT
 *     content,
 *     1 - (embedding <=> query_embedding) AS similarity
 *   FROM course_embeddings
 *   WHERE course_id = match_course_id
 *   ORDER BY embedding <=> query_embedding
 *   LIMIT match_count;
 * $$;
 */

interface MatchRow {
  content: string;
  similarity: number;
}

/**
 * Embeds `query`, runs a pgvector cosine similarity search over
 * the course's indexed chunks, and returns a joined context string.
 *
 * @param courseId  UUID of the course
 * @param query     Natural-language question
 * @param topK      Number of chunks to retrieve (default 5)
 */
export async function retrieveContext(
  courseId: string,
  query: string,
  topK = 12
): Promise<string> {
  const queryEmbedding = await embedText(query, "RETRIEVAL_QUERY");

  const { data, error } = await supabaseAdmin.rpc("match_course_embeddings", {
    query_embedding: queryEmbedding,
    match_course_id: courseId,
    match_count: topK,
  });

  if (error) throw new Error(`RAG retrieval failed: ${error.message}`);

  const rows = (data as MatchRow[]) ?? [];
  if (rows.length === 0) return "";

  return rows.map((r) => r.content).join("\n\n---\n\n");
}

/**
 * For broad/summary queries: fetch all chunks for a course in insertion order
 * and truncate to ~30,000 chars to stay within context limits.
 */
export async function retrieveAllChunks(
  courseId: string,
  maxChars = 30000
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("course_embeddings")
    .select("content")
    .eq("course_id", courseId)
    .order("id", { ascending: true });

  if (error) throw new Error(`Chunk retrieval failed: ${error.message}`);

  const chunks = (data ?? []).map((r) => r.content as string);
  let combined = "";
  for (const chunk of chunks) {
    if ((combined + chunk).length > maxChars) break;
    combined += (combined ? "\n\n---\n\n" : "") + chunk;
  }
  return combined;
}
