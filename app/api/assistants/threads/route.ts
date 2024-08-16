import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Create a new thread
export async function POST() {
  console.log("POST /api/assistants/threads");
  const thread = await openai.beta.threads.create();
  return Response.json({ threadId: thread.id });
}
