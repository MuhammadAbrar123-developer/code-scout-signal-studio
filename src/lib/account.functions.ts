import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RETENTION_OPTIONS } from "@/lib/providers";

const CLIENT_EVENTS = ["sign_in", "password_changed", "signed_out_everywhere"] as const;

/** Lets the app record a few security events the browser witnesses (e.g. a completed sign-in). */
export const recordSecurityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ event: z.enum(CLIENT_EVENTS) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.event === "sign_in") {
      // Avoid duplicate rows when the sign-in page re-renders.
      const since = new Date(Date.now() - 2 * 60_000).toISOString();
      const { count } = await context.supabase
        .from("security_audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("event", "sign_in")
        .gte("created_at", since);
      if ((count ?? 0) > 0) return { ok: true };
    }
    const { logSecurityEvent } = await import("@/lib/audit.server");
    await logSecurityEvent(context.userId, data.event);
    return { ok: true };
  });

export const updatePrivacySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ code_retention: z.enum(RETENTION_OPTIONS.map((o) => o.value) as [string, ...string[]]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_privacy_settings")
      .upsert({ user_id: context.userId, code_retention: data.code_retention });
    if (error) return { ok: false as const, error: "Couldn't save your privacy settings." };

    let purged = 0;
    if (data.code_retention !== "forever") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: n } = await supabaseAdmin.rpc("purge_expired_code");
      purged = typeof n === "number" ? n : 0;
    }
    const { logSecurityEvent } = await import("@/lib/audit.server");
    await logSecurityEvent(context.userId, "privacy_updated", { code_retention: data.code_retention });
    return { ok: true as const, purged };
  });

export const deleteAllReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error, count } = await context.supabase
      .from("analyses")
      .delete({ count: "exact" })
      .eq("user_id", context.userId);
    if (error) return { ok: false as const, error: "Couldn't delete your reports." };
    const { logSecurityEvent } = await import("@/lib/audit.server");
    await logSecurityEvent(context.userId, "reports_deleted", { count: count ?? 0 });
    return { ok: true as const, count: count ?? 0 };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(input))
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove avatar files.
    const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId, { limit: 1000 });
    if (files?.length) {
      await supabaseAdmin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
    }
    // Remove all user-owned rows (tables without a cascade to the auth user).
    for (const table of [
      "analyses",
      "ai_usage_logs",
      "user_provider_credentials",
      "security_audit_logs",
    ] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) return { ok: false as const, error: "Couldn't delete all of your data. Nothing else was removed." };
    }
    await supabaseAdmin.from("user_privacy_settings").delete().eq("user_id", userId);

    // Deleting the auth user also removes the profile (cascade) and ends all sessions.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return { ok: false as const, error: "Your data was deleted, but the account couldn't be closed. Try again." };
    return { ok: true as const };
  });
