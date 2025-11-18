/**
 * AI Provider Clients and Configuration
 * Multi-provider setup for free tier optimization
 */

import OpenAI from "openai";
import { streamText, OpenAIStream } from "ai";
import { ModelSelection, COMPRESSED_SYSTEM_PROMPT, getOptimizedHistory } from "./smart-router";

export interface StreamOptions {
  model: ModelSelection;
  prompt: string;
  systemPrompt?: string;
  history?: Array<{ role: string; content: string }>;
  maxTokens?: number;
}

/**
 * Streams text from the selected AI provider
 */
export async function streamFromProvider(options: StreamOptions) {
  const { model, prompt, systemPrompt, history, maxTokens } = options;

  // Use compressed system prompt by default
  const finalSystemPrompt = systemPrompt || COMPRESSED_SYSTEM_PROMPT;

  // Optimize history based on provider
  const optimizedHistory = history
    ? getOptimizedHistory(history, model.provider)
    : undefined;

  try {
    switch (model.provider) {
      case "groq": {
        // Groq uses OpenAI-compatible API
        const groqClient = new OpenAI({
          baseURL: model.baseUrl || "https://api.groq.com/openai/v1",
          apiKey: process.env.GROQ_API_KEY,
        });
        
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (finalSystemPrompt) {
          messages.push({ role: "system", content: finalSystemPrompt });
        }
        if (optimizedHistory) {
          messages.push(...optimizedHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);
        }
        messages.push({ role: "user", content: prompt });

        const response = await groqClient.chat.completions.create({
          model: model.modelId,
          messages,
          max_tokens: maxTokens || 200,
          stream: true,
        });

        return OpenAIStream(response);
      }

      case "siliconflow": {
        // SiliconFlow uses OpenAI-compatible API
        const sfClient = new OpenAI({
          baseURL: model.baseUrl || "https://api.siliconflow.cn/v1",
          apiKey: process.env.SILICONFLOW_API_KEY,
        });
        
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (finalSystemPrompt) {
          messages.push({ role: "system", content: finalSystemPrompt });
        }
        if (optimizedHistory) {
          messages.push(...optimizedHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);
        }
        messages.push({ role: "user", content: prompt });

        const response = await sfClient.chat.completions.create({
          model: model.modelId,
          messages,
          max_tokens: maxTokens || 500,
          stream: true,
        });

        return OpenAIStream(response);
      }

      case "gemini": {
        // Gemini - Note: AI SDK 3 doesn't have built-in Google support
        // For now, skip Gemini or use a different approach
        throw new Error("Gemini provider requires @ai-sdk/google package. Please install it or use a different provider.");
      }

      case "github": {
        // GitHub Models use OpenAI-compatible API
        const githubClient = new OpenAI({
          baseURL: model.baseUrl || "https://models.inference.ai.azure.com",
          apiKey: process.env.GITHUB_TOKEN,
        });
        
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (finalSystemPrompt) {
          messages.push({ role: "system", content: finalSystemPrompt });
        }
        if (optimizedHistory) {
          messages.push(...optimizedHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);
        }
        messages.push({ role: "user", content: prompt });

        const response = await githubClient.chat.completions.create({
          model: model.modelId,
          messages,
          max_tokens: maxTokens || 500,
          stream: true,
        });

        return OpenAIStream(response);
      }

      case "huggingface": {
        // HuggingFace Inference API uses OpenAI-compatible endpoint
        const hfClient = new OpenAI({
          baseURL: model.baseUrl || "https://api-inference.huggingface.co/v1",
          apiKey: process.env.HUGGINGFACE_API_KEY,
        });
        
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (finalSystemPrompt) {
          messages.push({ role: "system", content: finalSystemPrompt });
        }
        if (optimizedHistory) {
          messages.push(...optimizedHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);
        }
        messages.push({ role: "user", content: prompt });

        const response = await hfClient.chat.completions.create({
          model: model.modelId,
          messages,
          max_tokens: maxTokens || 500,
          stream: true,
        });

        return OpenAIStream(response);
      }

      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  } catch (error) {
    // Try fallback providers if primary provider fails
    if (model.provider !== "siliconflow") {
      console.warn(
        `Provider ${model.provider} failed, trying fallback providers:`,
        error
      );

      // Try fallback providers in order of preference
      const fallbackProviders: Array<
        "groq" | "siliconflow" | "gemini" | "huggingface"
      > = ["groq", "siliconflow", "huggingface", "gemini"].filter(
        (p) => p !== model.provider
      ) as Array<"groq" | "siliconflow" | "gemini" | "huggingface">;

      for (const fallbackProvider of fallbackProviders) {
        const keyCheck = checkApiKeys(fallbackProvider);
        if (!keyCheck.available) continue;

        try {
          if (fallbackProvider === "groq") {
            const groqClient = new OpenAI({
              baseURL: "https://api.groq.com/openai/v1",
              apiKey: process.env.GROQ_API_KEY,
            });
            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
            if (finalSystemPrompt) {
              messages.push({ role: "system", content: finalSystemPrompt });
            }
            if (optimizedHistory) {
              messages.push(...optimizedHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);
            }
            messages.push({ role: "user", content: prompt });
            const response = await groqClient.chat.completions.create({
              model: "llama-3.1-8b-instant",
              messages,
              max_tokens: maxTokens || 200,
              stream: true,
            });
            return OpenAIStream(response);
          }

          if (fallbackProvider === "siliconflow") {
            const sfClient = new OpenAI({
              baseURL: "https://api.siliconflow.cn/v1",
              apiKey: process.env.SILICONFLOW_API_KEY,
            });
            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
            if (finalSystemPrompt) {
              messages.push({ role: "system", content: finalSystemPrompt });
            }
            if (optimizedHistory) {
              messages.push(...optimizedHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);
            }
            messages.push({ role: "user", content: prompt });
            const response = await sfClient.chat.completions.create({
              model: "Qwen/Qwen2.5-7B-Instruct",
              messages,
              max_tokens: maxTokens || 500,
              stream: true,
            });
            return OpenAIStream(response);
          }

          if (fallbackProvider === "huggingface") {
            const hfClient = new OpenAI({
              baseURL: "https://api-inference.huggingface.co/v1",
              apiKey: process.env.HUGGINGFACE_API_KEY,
            });
            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
            if (finalSystemPrompt) {
              messages.push({ role: "system", content: finalSystemPrompt });
            }
            if (optimizedHistory) {
              messages.push(...optimizedHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);
            }
            messages.push({ role: "user", content: prompt });
            const response = await hfClient.chat.completions.create({
              model: "meta-llama/Llama-3.1-8B-Instruct",
              messages,
              max_tokens: maxTokens || 500,
              stream: true,
            });
            return OpenAIStream(response);
          }

          if (fallbackProvider === "gemini") {
            // Skip Gemini in fallback for now
            continue;
          }
        } catch (fallbackError) {
          console.warn(
            `Fallback provider ${fallbackProvider} also failed:`,
            fallbackError
          );
          continue; // Try next fallback
        }
      }
    }

    // If all providers failed, throw the original error
    throw error;
  }
}

/**
 * Checks if required API keys are available
 */
export function checkApiKeys(
  provider: "groq" | "siliconflow" | "gemini" | "github" | "huggingface"
): {
  available: boolean;
  missing: string[];
} {
  const required: Record<string, string> = {
    groq: "GROQ_API_KEY",
    siliconflow: "SILICONFLOW_API_KEY",
    gemini: "GOOGLE_GENERATIVE_AI_API_KEY",
    github: "GITHUB_TOKEN",
    huggingface: "HUGGINGFACE_API_KEY",
  };

  const key = required[provider];
  const available = !!process.env[key];

  return {
    available,
    missing: available ? [] : [key],
  };
}

