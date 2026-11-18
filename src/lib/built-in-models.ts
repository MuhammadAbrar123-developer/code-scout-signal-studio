// Client-safe allowlist. IDs verified against the authenticated gateway catalog.
export const BUILT_IN_MODELS = [
  { id: "openai/gpt-6-astra", name: "GPT-6 Astra", label: "GPT-6 Astra · Recommended", protocol: "responses" },
  { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", label: "Gemini 3.8 Flash · Fast", protocol: "chat" },
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5", label: "Claude Sonnet 5 · Detailed review", protocol: "messages" },
] as const;
export const BUILT_IN_MODEL_IDS = ["openai/gpt-6-astra", "google/gemini-3.8-flash", "anthropic/claude-sonnet-5"] as const;
export type BuiltInModelId = (typeof BUILT_IN_MODEL_IDS)[number];
export const DEFAULT_BUILT_IN_MODEL: BuiltInModelId = "openai/gpt-6-astra";
export function builtInModel(id: string) {
  return BUILT_IN_MODELS.find((model) => model.id === id);
}