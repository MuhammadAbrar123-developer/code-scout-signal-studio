import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LANGUAGES, MAX_CODE_CHARS, MAX_TITLE_CHARS } from "@/lib/analysis";
import { BUILT_IN_MODEL_IDS, DEFAULT_BUILT_IN_MODEL } from "@/lib/built-in-models";
import {
  PERSONAL_LIMIT_PER_HOUR,
  PLATFORM_LIMIT_PER_HOUR,
  PROVIDER_IDS,
  providerName,
} from "@/lib/providers";

const inputSchema = z.object({
  title: z.string().trim().max(MAX_TITLE_CHARS),
  language: z.enum(LANGUAGES),
  provider: z.enum(["lovable", ...PROVIDER_IDS]).default("lovable"),
  model: z.enum(BUILT_IN_MODEL_IDS).default(DEFAULT_BUILT_IN_MODEL),
  code: z
    .string()
    .max(MAX_CODE_CHARS, `Code must be under ${MAX_CODE_CHARS.toLocaleString()} characters.`)
    .refine((c) => c.trim().length >= 10, "Paste at least a few lines of code."),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please confirm you agree to send this code for AI analysis." }),
  }),
});

export type AnalyzeResponse = { ok: true; id: string } | { ok: false; error: string };

export const analyzeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<AnalyzeResponse> => {
    const { supabase, userId } = context;
    const { logSecurityEvent } = await import("@/lib/audit.server");
    const { runCodeAnalysis, AnalysisError } = await import("@/lib/ai/analyze.server");
    type Target = Parameters<typeof runCodeAnalysis>[0]["target"];

    // Resolve the provider on the server; the browser only names which one to use.
    let target: Target = { kind: "lovable", model: data.model };
    if (data.provider !== "lovable") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cred } = await supabaseAdmin
        .from("user_provider_credentials")
        .select("ciphertext, iv, model, status")
        .eq("user_id", userId)
        .eq("provider", data.provider)
        .maybeSingle();
      if (!cred) return { ok: false, error: `No ${providerName(data.provider)} key is connected.` };
      if (cred.status === "invalid")
        return { ok: false, error: `Your ${providerName(data.provider)} key was rejected. Update it in AI Providers.` };
      if (!cred.model) return { ok: false, error: "Pick a model for this provider in AI Providers first." };
      const { decryptSecret } = await import("@/lib/crypto.server");
      let apiKey: string;
      try {
        apiKey = await decryptSecret(cred.ciphertext, cred.iv, `${userId}:${data.provider}`);
      } catch {
        return { ok: false, error: "Your saved key couldn't be unlocked. Please save it again." };
      }
      target = { kind: "personal", provider: data.provider, apiKey, model: cred.model };
    }

    // Per-provider hourly quota, counted from a log users cannot edit or delete.
    const limit = data.provider === "lovable" ? PLATFORM_LIMIT_PER_HOUR : PERSONAL_LIMIT_PER_HOUR;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("provider", data.provider)
      .gte("created_at", since);
    if (countError) return { ok: false, error: "Couldn't check your usage. Please try again." };
    if ((count ?? 0) >= limit) {
      await logSecurityEvent(userId, "usage_limit_reached", { provider: data.provider, limit });
      return {
        ok: false,
        error: `You've reached the limit of ${limit} scans per hour with ${providerName(data.provider)}. Please try again later.`,
      };
    }

    const { error: logError } = await supabase
      .from("ai_usage_logs")
      .insert({ user_id: userId, kind: "analysis", provider: data.provider });
    if (logError) return { ok: false, error: "Couldn't start the analysis. Please try again." };

    let result;
    try {
      result = await runCodeAnalysis({ code: data.code, language: data.language, target });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof AnalysisError ? error.message : "The analysis failed. Please try again.",
      };
    }

    const { data: privacy } = await supabase
      .from("user_privacy_settings")
      .select("code_retention")
      .eq("user_id", userId)
      .maybeSingle();
    const keepCode = privacy?.code_retention !== "none";

    const firstLine = data.code.trim().split("\n")[0]?.slice(0, 60) ?? "Untitled";
    const { data: row, error: saveError } = await supabase
      .from("analyses")
      .insert({
        user_id: userId,
        title: data.title || (keepCode ? `${result.detected_language} · ${firstLine}` : `${result.detected_language} scan`),
        language: result.detected_language,
        code: keepCode ? data.code : "",
        code_purged: !keepCode,
        provider: data.provider,
        ai_model: target.kind === "lovable" ? data.model : target.model,
        summary: result.summary,
        risk_level: result.risk_level,
        score: result.score,
        findings: result.findings,
      })
      .select("id")
      .single();

    if (saveError || !row) return { ok: false, error: "The report was created but couldn't be saved." };
    return { ok: true, id: row.id };
  });
