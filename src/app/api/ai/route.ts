import { NextResponse } from "next/server";
import { APICallError, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { requireUser, getDocumentAccess } from "@/lib/api-auth";
import { aiAssistSchema } from "@/lib/validation/schemas";

const PROMPTS = {
  improve: "Improve this writing. Keep the meaning, fix clarity and flow. Return only the improved text:",
  summarize: "Summarize this text in 2-3 concise sentences. Return only the summary:",
  grammar: "Fix grammar and spelling. Return only the corrected text:",
  continue: "Continue this text naturally for 2-3 sentences. Return only the continuation:",
} as const;

export async function POST(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENAI_API_KEY in .env" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const parsed = aiAssistSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const access = await getDocumentAccess(parsed.data.documentId, authResult.userId);
  if (!access) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `${PROMPTS[parsed.data.action]}\n\n${parsed.data.text}`,
      maxTokens: 500,
    });

    return NextResponse.json({ result: text.trim() });
  } catch (err) {
    if (APICallError.isInstance(err)) {
      const status = err.statusCode === 429 ? 429 : err.statusCode ?? 502;
      return NextResponse.json({ error: err.message }, { status });
    }

    console.error("AI assist error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
