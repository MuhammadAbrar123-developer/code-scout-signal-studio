import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, KeyRound, LogIn, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { recordSecurityEvent } from "@/lib/account.functions";
import { providerName } from "@/lib/providers";

const eventsQuery = queryOptions({
  queryKey: ["security-events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("security_audit_logs")
      .select("id, event, details, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/security")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  head: () => ({
    meta: [
      { title: "Security activity — CodeGuard AI" },
      { name: "description", content: "Recent sign-ins, failed attempts, key changes and usage warnings on your account." },
      { property: "og:title", content: "Security activity — CodeGuard AI" },
      { property: "og:description", content: "See what's happening on your CodeGuard AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

type Tone = "ok" | "warn" | "bad" | "info";
const EVENT_LABEL: Record<string, { label: string; tone: Tone; icon: typeof LogIn }> = {
  sign_in: { label: "Signed in", tone: "ok", icon: LogIn },
  sign_in_failed: { label: "Failed sign-in attempt", tone: "bad", icon: ShieldAlert },
  password_changed: { label: "Password changed", tone: "info", icon: KeyRound },
  signed_out_everywhere: { label: "Signed out of all devices", tone: "info", icon: LogOut },
  credential_added: { label: "API key added", tone: "info", icon: KeyRound },
  credential_updated: { label: "API key replaced", tone: "info", icon: KeyRound },
  credential_removed: { label: "API key deleted", tone: "info", icon: KeyRound },
  provider_test_passed: { label: "Provider connection OK", tone: "ok", icon: ShieldCheck },
  provider_test_failed: { label: "Provider connection failed", tone: "warn", icon: AlertTriangle },
  provider_model_changed: { label: "Provider model changed", tone: "info", icon: KeyRound },
  usage_limit_reached: { label: "Hourly scan limit reached", tone: "warn", icon: AlertTriangle },
  privacy_updated: { label: "Privacy setting changed", tone: "info", icon: ShieldCheck },
  reports_deleted: { label: "All reports deleted", tone: "info", icon: ShieldCheck },
};
const toneCls: Record<Tone, string> = {
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-warning",
  bad: "bg-destructive/15 text-destructive",
  info: "bg-primary/10 text-primary",
};

function device(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function detailText(details: unknown) {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d["provider"] === "string") parts.push(providerName(d["provider"]));
  if (typeof d["model"] === "string") parts.push(d["model"]);
  if (typeof d["code_retention"] === "string") parts.push(`code retention: ${d["code_retention"]}`);
  if (typeof d["count"] === "number") parts.push(`${d["count"]} reports`);
  if (typeof d["limit"] === "number") parts.push(`limit ${d["limit"]}/hour`);
  return parts.join(" · ") || null;
}

function SecurityPage() {
  const { data } = useSuspenseQuery(eventsQuery);
  const record = useServerFn(recordSecurityEvent);
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);
  const monthAgo = Date.now() - 30 * 86400_000;
  const recent = data.filter((e) => new Date(e.created_at).getTime() > monthAgo);
  const lastSignIn = data.find((e) => e.event === "sign_in");

  const stats = [
    { label: "Last sign-in", value: lastSignIn ? new Date(lastSignIn.created_at).toLocaleDateString() : "—" },
    { label: "Failed sign-ins (30 days)", value: recent.filter((e) => e.event === "sign_in_failed").length },
    { label: "Key changes (30 days)", value: recent.filter((e) => e.event.startsWith("credential_")).length },
    { label: "Limit warnings (30 days)", value: recent.filter((e) => e.event === "usage_limit_reached").length },
  ];

  async function signOutEverywhere() {
    setBusy(true);
    try {
      await record({ data: { event: "signed_out_everywhere" } });
      await supabase.auth.signOut({ scope: "global" });
      toast.success("Signed out on every device.");
    } catch {
      toast.error("Couldn't sign out everywhere. Please try again.");
    } finally {
      setBusy(false);
      await signOut();
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        eyebrow="Security"
        title="Security activity"
        description="Recent activity on your account. If something looks wrong, sign out everywhere and reset your password."
        actions={
          <Button variant="outline" size="lg" onClick={signOutEverywhere} disabled={busy}>
            <LogOut /> Sign out of all devices
          </Button>
        }
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-lg font-semibold">Recent events</h2>
      {data.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data.map((e) => {
            const meta = EVENT_LABEL[e.event] ?? { label: e.event, tone: "info" as Tone, icon: ShieldCheck };
            const extra = detailText(e.details);
            return (
              <li key={e.id} className="flex items-center gap-4 px-5 py-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneCls[meta.tone]}`}>
                  <meta.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[extra, device(e.user_agent)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
