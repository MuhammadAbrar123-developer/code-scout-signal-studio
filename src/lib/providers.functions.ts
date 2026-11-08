import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  maskKey,
  PERSONAL_LIMIT_PER_HOUR,
  PLATFORM_LIMIT_PER_HOUR,
  PROVIDER_IDS,
  type ProviderId,
} from "@/lib/providers";

const providerSchema = z.enum(PROVIDER_IDS);

export type ProviderStatus = {
  provider: ProviderId;
  connected: boolean;
  status: "untested" | "connected" | "invalid" | "error" | "not_configured";
  keyHint: string | null;
  model: string | null;
  models: string[];
  lastTestedAt: string | null;
  lastError: string | null;
  usedLastHour: number;
  used30d: number;
  limitPerHour: number;
};

export type ProvidersOverview = {
  platform: { configured: boolean; usedLastHour: number; used30d: number; limitPerHour: number };
  personal: ProviderStatus[];
};

type Result = { ok: true; status: ProviderStatus["status"]; message: string } | { ok: false; error: string };

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function usageCounts(supabase: { from: (t: "ai_usage_logs") => any }, userId: string) {
  const hour = new Date(Date.now() - 3600_000).toISOString();
  const month = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data } = await supabase
    .from("ai_usage_logs")
    .select("provider, created_at")
    .eq("user_id", userId)
    .gte("created_at", month)
    .limit(5000);
  const rows = (data ?? []) as { provider: string; created_at: string }[];
  const out: Record<string, { hour: number; month: number }> = {};
  for (const r of rows) {
    const o = (out[r.provider] ??= { hour: 0, month: 0 });
    o.month++;
    if (r.created_at >= hour) o.hour++;
  }
  return out;
}

export const listProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProvidersOverview> => {
    const db = await admin();
    const { data: creds } = await db
      .from("user_provider_credentials")
      .select("provider, key_hint, model, models, status, last_error, last_tested_at")
      .eq("user_id", context.userId);
    const usage = await usageCounts(context.supabase, context.userId);

    const personal = PROVIDER_IDS.map((p): ProviderStatus => {
      const c = creds?.find((r) => r.provider === p);
      return {
        provider: p,
        connected: !!c,
        status: (c?.status as ProviderStatus["status"]) ?? "not_configured",
        keyHint: c?.key_hint ?? null,
        model: c?.model ?? null,
        models: Array.isArray(c?.models) ? (c!.models as string[]) : [],
        lastTestedAt: c?.last_tested_at ?? null,
        lastError: c?.last_error ?? null,
        usedLastHour: usage[p]?.hour ?? 0,
        used30d: usage[p]?.month ?? 0,
        limitPerHour: PERSONAL_LIMIT_PER_HOUR,
      };
    });

    return {
      platform: {
        configured: !!process.env["LOVABLE_API_KEY"],
        usedLastHour: usage["lovable"]?.hour ?? 0,
        used30d: usage["lovable"]?.month ?? 0,
        limitPerHour: PLATFORM_LIMIT_PER_HOUR,
      },
      personal,
    };
  });

function pickDefaultModel(models: string[], current: string | null) {
  if (current && models.includes(current)) return current;
  const prefs = [/gpt-4o-mini/, /gpt-4\.1-mini/, /gemini-.*flash/, /claude-.*sonnet/, /llama-3\.3-70b/, /openai\/gpt-4o-mini/];
  for (const re of prefs) {
    const hit = models.find((m) => re.test(m));
    if (hit) return hit;
  }
  return models[0] ?? null;
}

async function testAndStore(userId: string, provider: ProviderId, apiKey: string, existingModel: string | null) {
  const { ADAPTERS, ProviderError } = await import("@/lib/ai/providers.server");
  const db = await admin();
  try {
    const models = await ADAPTERS[provider].listModels(apiKey);
    if (models.length === 0) {
      await db
        .from("user_provider_credentials")
        .update({ status: "error", last_error: "No usable chat models found for this key.", last_tested_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", provider);
      return { status: "error" as const, message: "Connected, but no usable chat models were found for this key." };
    }
    await db
      .from("user_provider_credentials")
      .update({
        status: "connected",
        last_error: null,
        models,
        model: pickDefaultModel(models, existingModel),
        last_tested_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", provider);
    return { status: "connected" as const, message: `Connected. ${models.length} models available.` };
  } catch (e) {
    const err = e instanceof ProviderError ? e : new ProviderError("Connection test failed.", "error");
    const status = err.kind === "invalid" ? "invalid" : "error";
    await db
      .from("user_provider_credentials")
      .update({ status, last_error: err.message, last_tested_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", provider);
    return { status, message: err.message } as const;
  }
}

export const saveProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: providerSchema,
        apiKey: z
          .string()
          .trim()
          .min(10, "That key looks too short.")
          .max(400, "That key looks too long.")
          .refine((k) => !/\s/.test(k), "API keys can't contain spaces."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Result> => {
    const { ADAPTERS, ProviderError } = await import("@/lib/ai/providers.server");
    const { encryptSecret } = await import("@/lib/crypto.server");
    const { logSecurityEvent } = await import("@/lib/audit.server");
    const db = await admin();

    // Verify the key before storing it, so rejected keys are never saved.
    try {
      await ADAPTERS[data.provider].listModels(data.apiKey);
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "invalid") {
        await logSecurityEvent(context.userId, "provider_test_failed", { provider: data.provider, reason: "invalid_key" });
        return { ok: false, error: e.message };
      }
      // Network / rate limit problems: store anyway, the user can re-test later.
    }

    const { data: existing } = await db
      .from("user_provider_credentials")
      .select("id, model")
      .eq("user_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();

    const { ciphertext, iv } = await encryptSecret(data.apiKey, `${context.userId}:${data.provider}`);
    const { error } = await db.from("user_provider_credentials").upsert(
      {
        user_id: context.userId,
        provider: data.provider,
        ciphertext,
        iv,
        key_hint: maskKey(data.apiKey),
        status: "untested",
        last_error: null,
      },
      { onConflict: "user_id,provider" },
    );
    if (error) return { ok: false, error: "Couldn't save the key. Please try again." };

    await logSecurityEvent(context.userId, existing ? "credential_updated" : "credential_added", {
      provider: data.provider,
    });
    const tested = await testAndStore(context.userId, data.provider, data.apiKey, existing?.model ?? null);
    return { ok: true, status: tested.status, message: tested.message };
  });

export const testProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: providerSchema }).parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const { decryptSecret } = await import("@/lib/crypto.server");
    const { logSecurityEvent } = await import("@/lib/audit.server");
    const db = await admin();
    const { data: row } = await db
      .from("user_provider_credentials")
      .select("ciphertext, iv, model")
      .eq("user_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();
    if (!row) return { ok: false, error: "No key saved for this provider." };

    let key: string;
    try {
      key = await decryptSecret(row.ciphertext, row.iv, `${context.userId}:${data.provider}`);
    } catch {
      return { ok: false, error: "The saved key couldn't be unlocked. Please save it again." };
    }
    const tested = await testAndStore(context.userId, data.provider, key, row.model);
    await logSecurityEvent(
      context.userId,
      tested.status === "connected" ? "provider_test_passed" : "provider_test_failed",
      { provider: data.provider },
    );
    return { ok: true, status: tested.status, message: tested.message };
  });

export const setProviderModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ provider: providerSchema, model: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Result> => {
    const { logSecurityEvent } = await import("@/lib/audit.server");
    const db = await admin();
    const { data: row } = await db
      .from("user_provider_credentials")
      .select("models")
      .eq("user_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();
    const models = Array.isArray(row?.models) ? (row!.models as string[]) : [];
    if (!models.includes(data.model)) return { ok: false, error: "That model isn't available for your key." };
    const { error } = await db
      .from("user_provider_credentials")
      .update({ model: data.model })
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    if (error) return { ok: false, error: "Couldn't save the model." };
    await logSecurityEvent(context.userId, "provider_model_changed", { provider: data.provider, model: data.model });
    return { ok: true, status: "connected", message: "Model saved." };
  });

export const removeProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: providerSchema }).parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const { logSecurityEvent } = await import("@/lib/audit.server");
    const db = await admin();
    const { error } = await db
      .from("user_provider_credentials")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    if (error) return { ok: false, error: "Couldn't remove the key." };
    await logSecurityEvent(context.userId, "credential_removed", { provider: data.provider });
    return { ok: true, status: "not_configured", message: "Key permanently deleted." };
  });
