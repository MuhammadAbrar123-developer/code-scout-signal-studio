import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, ScanSearch, Wand2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, MAX_CODE_CHARS, MAX_TITLE_CHARS } from "@/lib/analysis";
import { analyzeCode } from "@/lib/analyze.functions";
import { providerName, type AnalysisProvider } from "@/lib/providers";
import { listProviders } from "@/lib/providers.functions";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze code — CodeGuard AI" },
      { name: "description", content: "Paste your code and get an AI review of bugs, security issues and performance." },
      { property: "og:title", content: "Analyze code — CodeGuard AI" },
      { property: "og:description", content: "AI review of bugs, security issues, performance and code quality." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyzePage,
});

const STEPS = [
  "Reading your code…",
  "Hunting for bugs…",
  "Checking for security weaknesses…",
  "Looking for slow spots…",
  "Writing your report…",
];

const SAMPLE = `def login(username, password):
    db = connect()
    q = f"SELECT * FROM users WHERE name='{username}'"
    user = db.execute(q).fetchone()
    if user.password == password:
        return True
    for row in db.execute("SELECT * FROM logs"):
        print(row)
`;

function AnalyzePage() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeCode);
  const fetchProviders = useServerFn(listProviders);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("auto");
  const [provider, setProvider] = useState<AnalysisProvider>("lovable");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const providers = useQuery({ queryKey: ["providers"], queryFn: () => fetchProviders() });

  const options: { id: AnalysisProvider; label: string; used: number; limit: number; model: string | null }[] = [];
  if (providers.data?.platform.configured) {
    options.push({
      id: "lovable",
      label: providerName("lovable"),
      used: providers.data.platform.usedLastHour,
      limit: providers.data.platform.limitPerHour,
      model: null,
    });
  }
  for (const p of providers.data?.personal ?? []) {
    if (p.connected && p.status === "connected" && p.model) {
      options.push({ id: p.provider, label: `${providerName(p.provider)} (your key)`, used: p.usedLastHour, limit: p.limitPerHour, model: p.model });
    }
  }
  const selected = options.find((o) => o.id === provider) ?? options[0];
  const remaining = selected ? Math.max(0, selected.limit - selected.used) : null;

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    return () => clearInterval(t);
  }, [busy]);

  const lines = code ? code.split("\n").length : 0;
  const tooLong = code.length > MAX_CODE_CHARS;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error("No AI provider is available right now.");
      return;
    }
    if (!consent) {
      toast.error("Please confirm you agree to send this code for AI analysis.");
      return;
    }
    if (code.trim().length < 10) {
      toast.error("Paste at least a few lines of code.");
      return;
    }
    if (tooLong) {
      toast.error("That code is too long.");
      return;
    }
    setBusy(true);
    try {
      const res = await analyze({ data: { code, title, language, provider: selected.id, consent: true } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      navigate({ to: "/reports/$id", params: { id: res.id } });
    } catch {
      toast.error("The analysis failed. Please try again.");
    } finally {
      setBusy(false);
      providers.refetch();
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        eyebrow="New scan"
        title="Analyze your code"
        description="Paste a file or snippet. You'll get bugs, security issues, speed tips and quality notes, explained in plain language."
      />

      <form onSubmit={onSubmit} className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Name (optional)</Label>
            <Input
              id="title"
              value={title}
              maxLength={MAX_TITLE_CHARS}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Login function, homework 3"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCode(SAMPLE)}>
                <Wand2 /> Try a sample
              </Button>
            </div>
            <textarea
              aria-label="Your code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              placeholder="Paste your code here…"
              className="block min-h-[420px] w-full resize-y bg-card p-4 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2 text-xs text-muted-foreground">
              <span>{lines} lines</span>
              <span className={tooLong ? "text-destructive" : ""}>
                {code.length.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()} characters
              </span>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l === "auto" ? "Detect automatically" : l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>AI provider</Label>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(v) => setProvider(v as AnalysisProvider)}
                disabled={options.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={providers.isLoading ? "Loading…" : "None available"} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected?.model && (
                <p className="text-xs text-muted-foreground">Model: {selected.model}</p>
              )}
              <Link
                to="/settings/providers"
                className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-primary hover:underline"
              >
                <KeyRound className="h-3.5 w-3.5" /> Use your own AI key
              </Link>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-5 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                I agree to send this code to {selected ? selected.label.replace(" (your key)", "") : "the AI provider"} for analysis.
              </span>{" "}
              Don't paste passwords, API keys or private data. You can delete reports at any time.
            </span>
          </label>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={busy || !consent || tooLong || remaining === 0 || !selected}
          >
            {busy ? <Loader2 className="animate-spin" /> : <ScanSearch />}
            {busy ? STEPS[step] : "Run analysis"}
          </Button>
          {remaining !== null && selected && (
            <p className="text-center text-xs text-muted-foreground">
              {remaining} of {selected.limit} scans left this hour
            </p>
          )}
        </aside>
      </form>
    </section>
  );
}
