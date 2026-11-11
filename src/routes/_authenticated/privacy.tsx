import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bot, FileText, KeyRound, Loader2, Trash2, UserX } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount, deleteAllReports, updatePrivacySettings } from "@/lib/account.functions";
import { PROVIDERS, RETENTION_OPTIONS, type Retention } from "@/lib/providers";
import { listProviders, removeProviderKey } from "@/lib/providers.functions";

export const Route = createFileRoute("/_authenticated/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & data — CodeGuard AI" },
      { name: "description", content: "Control how long CodeGuard AI keeps your code, delete reports, keys or your account." },
      { property: "og:title", content: "Privacy & data — CodeGuard AI" },
      { property: "og:description", content: "Control your code, reports, keys and account data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function Card({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

function PrivacyPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const savePrivacy = useServerFn(updatePrivacySettings);
  const wipeReports = useServerFn(deleteAllReports);
  const closeAccount = useServerFn(deleteAccount);
  const fetchProviders = useServerFn(listProviders);
  const removeKey = useServerFn(removeProviderKey);
  const [retention, setRetention] = useState<Retention>("forever");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const settings = useQuery({
    queryKey: ["privacy", session?.user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_privacy_settings").select("code_retention").maybeSingle();
      return (data?.code_retention as Retention | undefined) ?? "forever";
    },
  });
  const reports = useQuery({
    queryKey: ["analyses", "count"],
    queryFn: async () => {
      const { count } = await supabase.from("analyses").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => fetchProviders() });

  useEffect(() => {
    if (settings.data) setRetention(settings.data);
  }, [settings.data]);

  async function onRetention(value: Retention) {
    setRetention(value);
    setBusy("retention");
    const r = await savePrivacy({ data: { code_retention: value } });
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["privacy"] });
    toast.success(r.purged > 0 ? `Saved. Code removed from ${r.purged} older report(s).` : "Privacy setting saved.");
  }

  async function onDeleteReports() {
    setBusy("reports");
    const r = await wipeReports();
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
    toast.success(`Deleted ${r.count} report(s).`);
  }

  async function onRemoveKey(provider: keyof typeof PROVIDERS) {
    setBusy(provider);
    const r = await removeKey({ data: { provider } });
    setBusy(null);
    if (!r.ok) toast.error(r.error);
    else toast.success(r.message);
    queryClient.invalidateQueries({ queryKey: ["providers"] });
  }

  async function onDeleteAccount() {
    setBusy("account");
    try {
      const r = await closeAccount({ data: { confirm: "DELETE" } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      queryClient.clear();
      await supabase.auth.signOut({ scope: "local" });
      toast.success("Your account and data have been deleted.");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Couldn't delete your account. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const connected = providers.data?.personal.filter((p) => p.connected) ?? [];

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader
        eyebrow="Settings"
        title="Privacy & data"
        description="You decide what CodeGuard AI keeps. Every change here takes effect immediately."
      />

      <div className="mt-10 space-y-5">
        <Card
          icon={<Bot className="h-5 w-5" />}
          title="Who sees your code"
          description="When you run a scan, your code is sent to the AI provider you pick: CodeGuard's built-in AI (powered by Lovable AI), or your own provider account if you connected a key. Nothing is sent until you tick the consent box on the analyze page. AI suggestions are never run automatically."
        >
          <Button asChild variant="outline" size="sm" className="h-9 px-4">
            <Link to="/settings/providers">Manage AI providers</Link>
          </Button>
        </Card>

        <Card
          icon={<FileText className="h-5 w-5" />}
          title="Keep my code for"
          description="Reports and findings stay until you delete them. This controls how long the code you pasted is stored with each report."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Select value={retention} onValueChange={(v) => onRetention(v as Retention)} disabled={busy === "retention"}>
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {busy === "retention" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </Card>

        <Card
          icon={<FileText className="h-5 w-5" />}
          title="Saved reports"
          description={`You have ${reports.data ?? "…"} saved report(s). Delete them one by one from your history, or remove them all at once.`}
        >
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 px-4">
              <Link to="/history">View history</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-4 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive" disabled={!reports.data || busy !== null}>
                  <Trash2 /> Delete all reports
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all reports?</AlertDialogTitle>
                  <AlertDialogDescription>All your reports and the code saved with them will be permanently removed.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteReports}>Delete all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        <Card
          icon={<KeyRound className="h-5 w-5" />}
          title="Connected API keys"
          description="Keys are stored encrypted and only unlocked on our server when you run a scan with that provider."
        >
          {connected.length === 0 ? (
            <p className="text-sm text-muted-foreground">No personal keys connected.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {connected.map((p) => (
                <li key={p.provider} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{PROVIDERS[p.provider].name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.keyHint}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={busy !== null}
                    onClick={() => onRemoveKey(p.provider)}
                  >
                    {busy === p.provider ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <UserX className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Delete my account</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Permanently deletes your account, profile, photo, reports, saved code, API keys, usage and security history. This can't be undone.
              </p>
              <AlertDialog onOpenChange={() => setConfirmText("")}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mt-5" disabled={busy !== null}>
                    Delete my account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account for good?</AlertDialogTitle>
                    <AlertDialogDescription>Type DELETE to confirm. All of your data will be erased immediately.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button variant="destructive" disabled={confirmText !== "DELETE" || busy === "account"} onClick={onDeleteAccount}>
                      {busy === "account" && <Loader2 className="animate-spin" />} Delete everything
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
