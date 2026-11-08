// Client-safe description of supported AI providers. No secrets here.

export const PROVIDER_IDS = ["openai", "gemini", "anthropic", "groq", "openrouter"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type AnalysisProvider = "lovable" | ProviderId;

export const PLATFORM_LIMIT_PER_HOUR = 20;
export const PERSONAL_LIMIT_PER_HOUR = 60;

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  short: string;
  keyPlaceholder: string;
  keyUrl: string;
  tone: "primary" | "warning" | "success" | "destructive" | "muted";
};

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    short: "OA",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    tone: "success",
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    short: "G",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/app/apikey",
    tone: "primary",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    short: "A",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
    tone: "warning",
  },
  groq: {
    id: "groq",
    name: "Groq",
    short: "GQ",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    tone: "destructive",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    short: "OR",
    keyPlaceholder: "sk-or-...",
    keyUrl: "https://openrouter.ai/keys",
    tone: "muted",
  },
};

export function providerName(p: string) {
  if (p === "lovable") return "CodeGuard built-in AI";
  return PROVIDERS[p as ProviderId]?.name ?? p;
}

/** Shows only the first 3 and last 4 characters, e.g. sk-••••••••1234. */
export function maskKey(key: string) {
  const k = key.trim();
  if (k.length <= 8) return "••••••••";
  return `${k.slice(0, 3)}••••••••${k.slice(-4)}`;
}

export const RETENTION_OPTIONS = [
  { value: "forever", label: "Keep until I delete it" },
  { value: "30d", label: "Delete code after 30 days" },
  { value: "7d", label: "Delete code after 7 days" },
  { value: "none", label: "Don't keep my code (reports only)" },
] as const;
export type Retention = (typeof RETENTION_OPTIONS)[number]["value"];
