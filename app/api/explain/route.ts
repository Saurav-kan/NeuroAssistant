import { NextRequest } from "next/server";
import { selectModel } from "@/lib/smart-router";
import { streamFromProvider, checkApiKeys } from "@/lib/ai-providers";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { term, taskType, context } = await req.json();

    if (!term || typeof term !== "string") {
      return new Response(JSON.stringify({ error: "Term is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Select optimal model based on input
    let modelSelection = selectModel({
      text: term,
      taskType: taskType || "simple",
      wordCount: term.split(/\s+/).length,
    });

    // Check if API key is available for selected provider
    let keyCheck = checkApiKeys(modelSelection.provider);

    // If primary provider key is missing, try fallback providers in order
    if (!keyCheck.available) {
      const fallbackProviders: Array<
        "groq" | "siliconflow" | "gemini" | "github" | "huggingface"
      > = ["groq", "siliconflow", "huggingface", "gemini", "github"];

      // Remove the already-tried provider from fallback list
      const availableFallbacks = fallbackProviders.filter(
        (p) => p !== modelSelection.provider
      );

      let foundProvider = false;
      for (const provider of availableFallbacks) {
        const providerCheck = checkApiKeys(provider);
        if (providerCheck.available) {
          // Use the first available provider
          modelSelection = {
            provider,
            modelId:
              provider === "groq"
                ? "llama-3.1-8b-instant"
                : provider === "siliconflow"
                ? "Qwen/Qwen2.5-7B-Instruct"
                : provider === "gemini"
                ? "gemini-1.5-flash"
                : provider === "huggingface"
                ? "meta-llama/Llama-3.1-8B-Instruct"
                : "gpt-4o",
            baseUrl:
              provider === "groq"
                ? "https://api.groq.com/openai/v1"
                : provider === "siliconflow"
                ? "https://api.siliconflow.cn/v1"
                : provider === "huggingface"
                ? "https://api-inference.huggingface.co/v1"
                : provider === "github"
                ? "https://models.inference.ai.azure.com"
                : undefined,
            reason: `Primary provider unavailable, using ${provider} as fallback`,
          };
          keyCheck = providerCheck;
          foundProvider = true;
          break;
        }
      }

      // If no providers are configured, return error
      if (!foundProvider) {
        return new Response(
          JSON.stringify({
            error: `No API keys configured. Please configure at least one provider (GROQ_API_KEY, SILICONFLOW_API_KEY, HUGGINGFACE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or GITHUB_TOKEN) in your environment variables.`,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Build prompt with context if available
    let prompt: string;
    if (context && typeof context === "string" && context.trim().length > 0) {
      prompt = `Explain the term "${term}" in the context of this passage:\n\n"${context}"\n\nProvide a simple explanation that relates to how the term is used in this specific context. Use an analogy if helpful.`;
    } else {
      prompt = `Explain the term "${term}" in simple terms using an analogy.`;
    }

    // Stream from selected provider
    const stream = await streamFromProvider({
      model: modelSelection,
      prompt,
      systemPrompt:
        "Study assistant. Be concise. Use bullet points. Omit polite filler. Max 100 words. Focus on the meaning in the given context.",
      maxTokens: 50,
    });

    // Convert OpenAIStream to Response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in explain API:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate explanation",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
