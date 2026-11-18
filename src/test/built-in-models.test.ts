import { describe, expect, it } from "vitest";
import { BUILT_IN_MODEL_IDS, BUILT_IN_MODELS, DEFAULT_BUILT_IN_MODEL, builtInModel } from "@/lib/built-in-models";

describe("built-in model selection without personal keys", () => {
  it("offers OpenAI, Gemini and Claude through built-in access", () => {
    expect(BUILT_IN_MODELS.map((m) => m.protocol)).toEqual(["responses", "chat", "messages"]);
    expect(BUILT_IN_MODEL_IDS).toEqual(["openai/gpt-6-astra", "google/gemini-3.8-flash", "anthropic/claude-sonnet-5"]);
  });
  it("preserves the existing default", () => {
    expect(DEFAULT_BUILT_IN_MODEL).toBe("openai/gpt-6-astra");
  });
  it("rejects unapproved model identifiers", () => {
    expect(builtInModel("attacker/arbitrary-model")).toBeUndefined();
  });
});