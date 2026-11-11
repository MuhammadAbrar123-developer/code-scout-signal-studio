// Provider adapters for personal (bring-your-own-key) AI credentials.
// Each adapter can verify a key, list usable models and build a model for analysis.
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

import type { ProviderId } from "@/lib/providers";

export const PROVIDER_TIMEOUT_MS = 90_000;
const TEST_TIMEOUT_MS = 15_000;

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: "invalid" | "rate_limited" | "unreachable" | "error",
  ) {
    super(message);
  }
}

export interface ProviderAdapter {
  id: ProviderId;
  /** Verifies the key and returns model ids that can analyze code. */
  listModels(apiKey: string): Promise<string[]>;
  /** Builds a chat model for this key. */
  model(apiKey: string, modelId: string): LanguageModel;
  /** Whether the provider enforces JSON schemas natively. */
  strictJson: boolean;
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TEST_TIMEOUT_MS) });
  } catch {
    throw new ProviderError("Couldn't reach the provider. Check your connection and try again.", "unreachable");
  }
  if (res.status === 401 || res.status === 403)
    throw new ProviderError("The provider rejected this API key.", "invalid");
  if (res.status === 400) throw new ProviderError("The provider says this API key is not valid.", "invalid");
  if (res.status === 429)
    throw new ProviderError("The provider is rate-limiting this key. Try again shortly.", "rate_limited");
  if (!res.ok) throw new ProviderError(`The provider returned an error (${res.status}).`, "error");
  try {
    return await res.json();
  } catch {
    throw new ProviderError("The provider sent an unreadable response.", "error");
  }
}

function ids(list: unknown, field = "id"): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((m) => (m && typeof m === "object" ? (m as Record<string, unknown>)[field] : null))
    .filter((v): v is string => typeof v === "string");
}

const NON_CHAT = /(embed|whisper|tts|audio|image|dall-e|moderation|realtime|transcribe|search|guard|vision-preview|davinci|babbage|computer-use)/i;

function tidy(list: string[], limit = 120) {
  return Array.from(new Set(list.filter((m) => !NON_CHAT.test(m)))).sort().slice(0, limit);
}

function compatible(name: string, baseURL: string, apiKey: string, strict: boolean, extra?: Record<string, string>) {
  return createOpenAICompatible({
    name,
    baseURL,
    apiKey,
    headers: extra ?? {},
    supportsStructuredOutputs: strict,
  });
}

export const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  openai: {
    id: "openai",
    strictJson: true,
    async listModels(key) {
      const j = (await getJson("https://api.openai.com/v1/models", { Authorization: `Bearer ${key}` })) as {
        data?: unknown;
      };
      return tidy(ids(j.data).filter((m) => /^(gpt|o\d|chatgpt)/.test(m)));
    },
    model: (key, m) => compatible("openai", "https://api.openai.com/v1", key, true).chatModel(m),
  },
  gemini: {
    id: "gemini",
    strictJson: false,
    async listModels(key) {
      const j = (await getJson("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
        "x-goog-api-key": key,
      })) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
      const list = (j.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter((m) => m.startsWith("gemini"));
      return tidy(list);
    },
    model: (key, m) =>
      compatible("gemini", "https://generativelanguage.googleapis.com/v1beta/openai", key, false).chatModel(m),
  },
  anthropic: {
    id: "anthropic",
    strictJson: true,
    async listModels(key) {
      const j = (await getJson("https://api.anthropic.com/v1/models?limit=100", {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      })) as { data?: unknown };
      return tidy(ids(j.data));
    },
    model: (key, m) => createAnthropic({ apiKey: key })(m),
  },
  groq: {
    id: "groq",
    strictJson: false,
    async listModels(key) {
      const j = (await getJson("https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${key}` })) as {
        data?: unknown;
      };
      return tidy(ids(j.data));
    },
    model: (key, m) => compatible("groq", "https://api.groq.com/openai/v1", key, false).chatModel(m),
  },
  openrouter: {
    id: "openrouter",
    strictJson: false,
    async listModels(key) {
      // /key verifies the key itself; the model catalogue is public.
      await getJson("https://openrouter.ai/api/v1/key", { Authorization: `Bearer ${key}` });
      const j = (await getJson("https://openrouter.ai/api/v1/models", {})) as { data?: unknown };
      return tidy(ids(j.data), 200);
    },
    model: (key, m) =>
      compatible("openrouter", "https://openrouter.ai/api/v1", key, false, {
        "X-Title": "CodeGuard AI",
      }).chatModel(m),
  },
};
