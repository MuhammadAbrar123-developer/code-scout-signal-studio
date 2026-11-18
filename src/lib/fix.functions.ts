import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Finding } from "@/lib/analysis";
import { builtInModel, DEFAULT_BUILT_IN_MODEL } from "@/lib/built-in-models";
import type { AnalysisProvider } from "@/lib/providers";
import { PERSONAL_LIMIT_PER_HOUR, PLATFORM_LIMIT_PER_HOUR, providerName } from "@/lib/providers";

export type FixResponse =
  | { ok: true; corrected_code: string; changes: string[] }
  | { ok: false; error: string };

export const generateCorrectedCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<FixResponse> => {
    const { supabase, userId } = context;
    // RLS ensures only the owner can read the report.
    const { data: report } = await supabase
      .from("analyses")
      .select("code, code_purged, language, provider, ai_model, findings, corrected_code, corrected_notes")
      .eq("id", data.id)
      .maybeSingle();
    if (!report) return { ok: false, error: "Report not found." };
    if (report.corrected_code)
      return { ok: true, corrected_code: report.corrected_code, changes: (report.corrected_notes ?? []) as string[] };
    if (report.code_purged || !report.code)
      return { ok: false, error: "The code for this report was removed, so it can't be corrected." };

    const { runCodeFix, AnalysisError } = await import("@/lib/ai/analyze.server");
    type Target = Parameters<typeof runCodeFix>[0]["target"];
    let target: Target = { kind: "lovable", model: builtInModel(report.ai_model ?? DEFAULT_BUILT_IN_MODEL)?.id ?? DEFAULT_BUILT_IN_MODEL };
    const provider = report.provider as AnalysisProvider;
    if (provider !== "lovable") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cred } = await supabaseAdmin
        .from("user_provider_credentials")
        .select("ciphertext, iv, model, status")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();
      if (!cred || cred.status === "invalid" || !cred.model)
        return { ok: false, error: `Your ${providerName(provider)} key isn't ready. Check AI Providers.` };
      const { decryptSecret } = await import("@/lib/crypto.server");
      try {
        const apiKey = await decryptSecret(cred.ciphertext, cred.iv, `${userId}:${provider}`);
        target = { kind: "personal", provider, apiKey, model: cred.model };
      } catch {
        return { ok: false, error: "Your saved key couldn't be unlocked. Please save it again." };
      }
    }

    const limit = provider === "lovable" ? PLATFORM_LIMIT_PER_HOUR : PERSONAL_LIMIT_PER_HOUR;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("provider", provider)
      .gte("created_at", since);
    if ((count ?? 0) >= limit)
      return { ok: false, error: `You've reached the limit of ${limit} AI requests per hour. Please try again later.` };
    const { error: logError } = await supabase
      .from("ai_usage_logs")
      .insert({ user_id: userId, kind: "fix", provider });
    if (logError) return { ok: false, error: "Couldn't start. Please try again." };

    let out;
    try {
      out = await runCodeFix({
        code: report.code,
        language: report.language,
        findings: (report.findings ?? []) as unknown as Finding[],
        target,
      });
    } catch (e) {
      return { ok: false, error: e instanceof AnalysisError ? e.message : "Couldn't create the corrected code." };
    }
    // Users can't update reports directly; ownership was confirmed by the RLS read above.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    await admin
      .from("analyses")
      .update({ corrected_code: out.corrected_code, corrected_notes: out.changes })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true, ...out };
  });
