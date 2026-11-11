import { Bug, Gauge, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CATEGORY_LABEL,
  SEVERITY_ORDER,
  type Category,
  type Finding,
  type Severity,
} from "@/lib/analysis";

const severityStyle: Record<Severity, string> = {
  critical: "text-destructive border-destructive/50 bg-destructive/15",
  high: "text-destructive border-destructive/40 bg-destructive/10",
  medium: "text-warning border-warning/40 bg-warning/10",
  low: "text-primary border-primary/40 bg-primary/10",
};

const lineStyle: Record<Severity, string> = {
  critical: "border-destructive bg-destructive/10",
  high: "border-destructive bg-destructive/8",
  medium: "border-warning bg-warning/8",
  low: "border-primary bg-primary/8",
};

const categoryIcon: Record<Category, typeof Bug> = {
  bug: Bug,
  security: ShieldAlert,
  performance: Gauge,
  quality: Sparkles,
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded border px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-wider ${severityStyle[severity]}`}
    >
      {severity}
    </span>
  );
}

export function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  return (
    <div className={`relative h-24 w-24 ${tone}`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} className="stroke-border" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-foreground">{score}</span>
        <span className="font-mono text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function ReportView({
  code,
  codePurged = false,
  findings,
}: {
  code: string;
  codePurged?: boolean;
  findings: Finding[];
}) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [findings],
  );
  const visible = filter === "all" ? sorted : sorted.filter((f) => f.category === filter);

  const flagged = useMemo(() => {
    const m = new Map<number, Severity>();
    for (const f of findings) {
      if (f.line == null) continue;
      const prev = m.get(f.line);
      if (!prev || SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[prev]) m.set(f.line, f.severity);
    }
    return m;
  }, [findings]);

  const counts = (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({
    c,
    n: findings.filter((f) => f.category === c).length,
  }));

  const codeLines = code.split("\n");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All · {findings.length}
          </FilterChip>
          {counts.map(({ c, n }) => {
            const Icon = categoryIcon[c];
            return (
              <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
                <Icon className="h-3.5 w-3.5" /> {CATEGORY_LABEL[c]} · {n}
              </FilterChip>
            );
          })}
        </div>

        {visible.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {findings.length === 0
              ? "No issues found. Nice work!"
              : "No issues in this category."}
          </div>
        )}

        {visible.map((f, i) => {
          const Icon = categoryIcon[f.category];
          return (
            <article
              key={i}
              onMouseEnter={() => setActiveLine(f.line)}
              onMouseLeave={() => setActiveLine(null)}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={f.severity} />
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" /> {CATEGORY_LABEL[f.category]}
                </span>
                {f.line != null && (
                  <span className="text-xs text-muted-foreground">· Line {f.line}</span>
                )}
              </div>
              <h3 className="mt-2.5 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{f.explanation}</p>
              <div className="mt-3 rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm leading-relaxed">
                <span className="font-semibold text-success">How to fix: </span>
                <span className="text-foreground/90">{f.fix}</span>
              </div>
              {f.fixed_code && (
                <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-surface p-3 font-mono text-[12px] leading-5 text-foreground/90">
                  <code>{f.fixed_code}</code>
                </pre>
              )}
            </article>
          );
        })}
        <p className="text-xs text-muted-foreground">
          AI suggestions can be wrong. Review fixes before using them — CodeGuard never runs your code.
        </p>
      </div>

      <div className="min-w-0">
        <div className="sticky top-20 overflow-hidden rounded-xl border border-border bg-card shadow-panel">
          <div className="border-b border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted-foreground">
            Your code
          </div>
          {codePurged && (
            <p className="p-6 text-sm text-muted-foreground">
              The code for this report was removed because of your privacy settings. The findings are kept.
            </p>
          )}
          <div className="max-h-[70vh] overflow-auto font-mono text-[12.5px] leading-6">
            {!codePurged && codeLines.map((ln, i) => {
              const n = i + 1;
              const sev = flagged.get(n);
              return (
                <div
                  key={n}
                  className={`flex w-max min-w-full border-l-2 pr-4 ${
                    sev ? lineStyle[sev] : "border-transparent"
                  } ${activeLine === n ? "outline outline-1 outline-primary/60" : ""}`}
                >
                  <span className="w-10 shrink-0 select-none pr-3 text-right text-muted-foreground/60">
                    {n}
                  </span>
                  <span className="whitespace-pre text-foreground/90">{ln || " "}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
