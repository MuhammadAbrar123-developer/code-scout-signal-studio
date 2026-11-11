import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, PlugZap, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVIDERS } from "@/lib/providers";
import {
  listProviders,
  removeProviderKey,
  saveProviderKey,
  setProviderModel,
  testProviderConnection,
  type ProviderStatus,
} from "@/lib/providers.functions";

export const Route = createFileRoute("/_authenticated/settings/providers")({
  head: () => ({
    meta: [
      { title: "AI Providers — CodeGuard AI" },
      { name: "description", content: "Connect your own OpenAI, Gemini, Claude, Groq or OpenRouter key to CodeGuard AI." },
      { property: "og:title", content: "AI Providers — CodeGuard AI" },
      { property: "og:description", content: "Manage the AI providers CodeGuard AI uses to analyze your code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProvidersPage,
});

const toneClass = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  muted: "bg-secondary text-foreground",
} as const;

function StatusPill({ status }: { status: ProviderStatus["status"] }) {
  const map = {
    connected: { label: "Connected", cls: "border-success/40 bg-success/10 text-success", Icon: CheckCircle2 },
    invalid: { label: "Key rejected", cls: "border-destructive/40 bg-destructive/10 text-destructive", Icon: XCircle },
    error: { label: "Needs attention", cls: "border-warning/40 bg-warning/10 text-warning", Icon: XCircle },
    untested: { label: "Not tested", cls: "border-border bg-secondary text-muted-foreground", Icon: PlugZap },
    not_configured: { label: "Not connected", cls: "border-border bg-secondary text-muted-foreground", Icon: PlugZap },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${map.cls}`}>
      <map.Icon className="h-3.5 w-3.5" /> {map.label}
    </span>
  );
}

function ProvidersPage() {
  const fetchProviders = useServerFn(listProviders);
  const q = useQuery({ queryKey: ["providers"], queryFn: () => fetchProviders() });

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        eyebrow="Settings"
        title="AI Providers"
        description="Choose which AI analyzes your code. Use the built-in AI for free, or connect your own key. Saved keys are encrypted and never shown again."
      />

      <h2 className="mt-12 text-lg font-semibold">Platform-managed</h2>
      <p className="mt-1 text-sm text-muted-foreground">Provided by CodeGuard AI. No key needed.</p>
      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-signal text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">CodeGuard built-in AI</p>
            {q.data && <StatusPill status={q.data.platform.configured ? "connected" : "not_configured"} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Powered by Lovable AI. Used by default for every scan.</p>
        </div>
        {q.data && (
          <div className="text-sm text-muted-foreground sm:text-right">
            <p>
              <span className="font-semibold text-foreground">{q.data.platform.usedLastHour}</span> / {q.data.platform.limitPerHour} scans this hour
            </p>
            <p>{q.data.platform.used30d} scans in the last 30 days</p>
          </div>
        )}
      </div>

      <h2 className="mt-12 text-lg font-semibold">Your personal keys</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bring your own key. Scans run on your provider account and its costs and data policy apply.
      </p>
      {q.isLoading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading providers…
        </div>
      )}
      {q.isError && <p className="mt-6 text-sm text-destructive">Couldn't load your providers. Refresh to try again.</p>}
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {q.data?.personal.map((p) => <ProviderCard key={p.provider} p={p} />)}
      </div>
    </section>
  );
}

function ProviderCard({ p }: { p: ProviderStatus }) {
  const meta = PROVIDERS[p.provider];
  const queryClient = useQueryClient();
  const save = useServerFn(saveProviderKey);
  const test = useServerFn(testProviderConnection);
  const setModel = useServerFn(setProviderModel);
  const remove = useServerFn(removeProviderKey);
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "test" | "model" | "remove">(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["providers"] });

  async function run(kind: NonNullable<typeof busy>, fn: () => Promise<{ ok: boolean; message?: string; error?: string; status?: string }>) {
    setBusy(kind);
    try {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Something went wrong.");
      else if (r.status === "connected" || r.status === "not_configured") toast.success(r.message);
      else toast.warning(r.message);
      if (r.ok && kind === "save") setKey("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
      refresh();
    }
  }

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-base font-bold ${toneClass[meta.tone]}`}>
          {meta.short}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{meta.name}</p>
          <div className="mt-1.5">
            <StatusPill status={p.status} />
          </div>
        </div>
        <a
          href={meta.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          Get a key <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {p.lastError && p.status !== "connected" && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">{p.lastError}</p>
      )}

      <div className="mt-5 space-y-1.5">
        <Label htmlFor={`key-${p.provider}`}>{p.connected ? "Saved key" : "API key"}</Label>
        {p.connected && (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm tracking-wide text-muted-foreground">
            {p.keyHint}
          </p>
        )}
        <div className="relative">
          <Input
            id={`key-${p.provider}`}
            type={show ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={p.connected ? "Paste a new key to replace it" : meta.keyPlaceholder}
            className="pr-10 font-mono"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide key" : "Show key"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {p.connected && p.models.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <Label>Model</Label>
          <Select
            value={p.model ?? undefined}
            onValueChange={(m) => run("model", () => setModel({ data: { provider: p.provider, model: m } }))}
            disabled={busy !== null}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a model" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {p.models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {p.usedLastHour} / {p.limitPerHour} scans this hour
        </span>
        <span>{p.used30d} in the last 30 days</span>
        {p.lastTestedAt && <span>Tested {new Date(p.lastTestedAt).toLocaleString()}</span>}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
        <Button
          variant="hero"
          size="sm"
          className="h-9 px-4"
          disabled={busy !== null || key.trim().length < 10}
          onClick={() => run("save", () => save({ data: { provider: p.provider, apiKey: key } }))}
        >
          {busy === "save" && <Loader2 className="animate-spin" />} Save changes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-4"
          disabled={busy !== null || !p.connected}
          onClick={() => run("test", () => test({ data: { provider: p.provider } }))}
        >
          {busy === "test" ? <Loader2 className="animate-spin" /> : <PlugZap />} Test connection
        </Button>
        {p.connected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy !== null}>
                <Trash2 /> Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove your {meta.name} key?</AlertDialogTitle>
                <AlertDialogDescription>
                  The key is permanently deleted from CodeGuard AI and can't be used for any more scans.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => run("remove", () => remove({ data: { provider: p.provider } }))}>
                  Remove key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </article>
  );
}
