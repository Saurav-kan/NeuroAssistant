/**
 * Smart Router for Multi-Provider Free Tier Mesh
 * Balances load across Groq, SiliconFlow, Google Gemini, GitHub Models, and HuggingFace
 */

export interface RouterInput {
  text: string;
  hasImage?: boolean;
  historyLength?: number;
  taskType?: "simple" | "complex_reasoning" | "long_context" | "vision";
  wordCount?: number;
}

export interface ModelSelection {
  provider: "groq" | "siliconflow" | "gemini" | "github" | "huggingface";
  modelId: string;
  baseUrl?: string;
  reason: string;
}

/**
 * Selects the optimal model based on input characteristics
 */
export function selectModel(input: RouterInput): ModelSelection {
  const wordCount = input.wordCount || input.text.split(/\s+/).length;
  const hasImage = input.hasImage || false;
  const historyLength = input.historyLength || 0;
  const taskType = input.taskType || "simple";

  // Strategy 1: Vision or very long text -> Gemini (1M token window, handles images)
  if (hasImage || wordCount > 10000 || input.text.length > 50000) {
    return {
      provider: "gemini",
      modelId: "gemini-1.5-flash",
      reason: "Large context or image input - Gemini handles 1M tokens and vision",
    };
  }

  // Strategy 2: Complex reasoning -> Try GitHub GPT-4o, fallback to HuggingFace/SiliconFlow
  if (taskType === "complex_reasoning") {
    // Use HuggingFace for complex reasoning (good free tier models)
    return {
      provider: "huggingface",
      modelId: "meta-llama/Llama-3.1-8B-Instruct",
      baseUrl: "https://api-inference.huggingface.co/v1",
      reason: "Complex reasoning task - Using HuggingFace Llama model",
    };
  }

  // Strategy 3: Long conversation history -> SiliconFlow (high TPM)
  if (historyLength > 10) {
    return {
      provider: "siliconflow",
      modelId: "Qwen/Qwen2.5-7B-Instruct",
      baseUrl: "https://api.siliconflow.cn/v1",
      reason: "Long conversation history - SiliconFlow has 500K TPM capacity",
    };
  }

  // Strategy 4: Default -> Groq (fastest for short interactions)
  return {
    provider: "groq",
    modelId: "llama-3.1-8b-instant",
    baseUrl: "https://api.groq.com/openai/v1",
    reason: "Short interaction - Groq provides instant latency (~0.2s)",
  };
}

/**
 * Compressed system prompt for token savings
 */
export const COMPRESSED_SYSTEM_PROMPT =
  "Study assistant. Be concise. Use bullet points. Omit polite filler. Max 100 words.";

/**
 * Manages context window by limiting history
 */
export function getOptimizedHistory(
  history: Array<{ role: string; content: string }>,
  provider: "groq" | "siliconflow" | "gemini" | "github" | "huggingface"
): Array<{ role: string; content: string }> {
  // Groq, SiliconFlow, and HuggingFace: Only last 6 messages (rolling window)
  if (provider === "groq" || provider === "siliconflow" || provider === "huggingface") {
    return history.slice(-6);
  }

  // Gemini: Can handle full history (1M token window)
  if (provider === "gemini") {
    return history;
  }

  // GitHub: Conservative - last 10 messages
  if (provider === "github") {
    return history.slice(-10);
  }

  return history;
}

/**
 * Determines if screenshot optimization should be used
 */
export function shouldUseScreenshotHack(wordCount: number): boolean {
  // If text > 1000 words, screenshot hack saves ~80% tokens
  return wordCount > 1000;
}

