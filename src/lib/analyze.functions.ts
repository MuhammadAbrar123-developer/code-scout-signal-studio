import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ANALYSES_PER_HOUR, LANGUAGES, MAX_CODE_CHARS, MAX_TITLE_CHARS } from "@/lib/analysis";

const inputSchema = z.object({
  title: z.string().trim().max(MAX_TITLE_CHARS),
  language: z.enum(LANGUAGES),
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

    // Rate limit, enforced on the server from a log users cannot edit or delete.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if (countError) return { ok: false, error: "Couldn't check your usage. Please try again." };
    if ((count ?? 0) >= ANALYSES_PER_HOUR) {
      return {
        ok: false,
        error: `You've reached the limit of ${ANALYSES_PER_HOUR} analyses per hour. Please try again later.`,
      };
    }

    const { error: logError } = await supabase
      .from("ai_usage_logs")
      .insert({ user_id: userId, kind: "analysis" });
    if (logError) return { ok: false, error: "Couldn't start the analysis. Please try again." };

    const { runCodeAnalysis, AnalysisError } = await import("@/lib/ai/analyze.server");

    let result;
    try {
      result = await runCodeAnalysis({ code: data.code, language: data.language });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof AnalysisError ? error.message : "The analysis failed. Please try again.",
      };
    }

    const firstLine = data.code.trim().split("\n")[0]?.slice(0, 60) ?? "Untitled";
    const { data: row, error: saveError } = await supabase
      .from("analyses")
      .insert({
        user_id: userId,
        title: data.title || `${result.detected_language} · ${firstLine}`,
        language: result.detected_language,
        code: data.code,
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
