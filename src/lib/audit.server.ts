import { getRequestHeader } from "@tanstack/react-start/server";

export type SecurityEvent =
  | "sign_in"
  | "sign_in_failed"
  | "password_changed"
  | "signed_out_everywhere"
  | "credential_added"
  | "credential_updated"
  | "credential_removed"
  | "provider_test_passed"
  | "provider_test_failed"
  | "provider_model_changed"
  | "usage_limit_reached"
  | "privacy_updated"
  | "reports_deleted";

/**
 * Writes a security event with the server-only admin client.
 * Details must never contain API keys, passwords, tokens or source code.
 */
export async function logSecurityEvent(
  userId: string,
  event: SecurityEvent,
  details: Record<string, string | number | boolean | null> = {},
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ua = (getRequestHeader("user-agent") ?? "").slice(0, 300) || null;
  const { error } = await supabaseAdmin
    .from("security_audit_logs")
    .insert({ user_id: userId, event, details, user_agent: ua });
  if (error) console.error("[audit] failed to write event", { event });
}
