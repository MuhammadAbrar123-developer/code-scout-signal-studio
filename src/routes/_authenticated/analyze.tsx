import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ScanSearch } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

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
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ANALYSES_PER_HOUR, LANGUAGES, MAX_CODE_CHARS, MAX_TITLE_CHARS } from "@/lib/analysis";
import { analyzeCode } from "@/lib/analyze.functions";

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
  const { session } = useAuth();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("auto");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const usage = useQuery({
    queryKey: ["usage", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_usage_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    return () => clearInterval(t);
  }, [busy]);

  const lines = code ? code.split("\n").length : 0;
  const tooLong = code.length > MAX_CODE_CHARS;
  const remaining = usage.data === undefined ? null : Math.max(0, ANALYSES_PER_HOUR - usage.data);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consent) { toast.error("Please confirm you agree to send this code for AI analysis."); return; }
    if (code.trim().length < 10) { toast.error("Paste at least a few lines of code."); return; }
    if (tooLong) { toast.error("That code is too long."); return; }
    setBusy(true);
    try {
      const res = await analyze({ data: { code, title, language, consent: true } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      navigate({ to: "/reports/$id", params: { id: res.id } });
    } catch {
      toast.error("The analysis failed. Please try again.");
    } finally {
      setBusy(false);
      usage.refetch();
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <p className="font-mono text-sm text-primary">// new scan</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Analyze your code</h1>
      <p className="mt-2 text-muted-foreground">
        Paste a file or snippet. You'll get bugs, security issues, speed tips and quality notes,
        explained in plain language.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
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
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            </div>
            <button
              type="button"
              onClick={() => setCode(SAMPLE)}
              className="font-mono text-xs text-muted-foreground hover:text-primary"
            >
              try a sample
            </button>
          </div>
          <textarea
            aria-label="Your code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="// paste your code here"
            className="block min-h-[360px] w-full resize-y bg-card p-4 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2 font-mono text-xs text-muted-foreground">
            <span>{lines} lines</span>
            <span className={tooLong ? "text-destructive" : ""}>
              {code.length.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()} chars
            </span>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            <span className="text-foreground">I agree to send this code to an AI service for analysis.</span>{" "}
            Don't paste passwords, API keys or private data. The code and its report are saved to
            your history, and you can delete them at any time.
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-mono text-xs text-muted-foreground">
            {remaining === null ? "" : `${remaining} of ${ANALYSES_PER_HOUR} scans left this hour`}
          </span>
          <Button
            type="submit"
            variant="hero"
            size="lg"
            disabled={busy || !consent || tooLong || remaining === 0}
          >
            {busy ? <Loader2 className="animate-spin" /> : <ScanSearch />}
            {busy ? STEPS[step] : "Run analysis"}
          </Button>
        </div>
      </form>
    </section>
  );
}
