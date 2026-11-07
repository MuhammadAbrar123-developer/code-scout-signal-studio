type Finding = { line: number; kind: "security" | "bug" | "perf"; text: string };

const code = [
  "def login(username, password):",
  "    db = connect()",
  '    q = f"SELECT * FROM users WHERE name=\'{username}\'"',
  "    user = db.execute(q).fetchone()",
  "    if user.password == password:",
  "        return True",
  "    for row in db.execute(\"SELECT * FROM logs\"):",
  "        print(row)",
];

const findings: Finding[] = [
  { line: 3, kind: "security", text: "SQL injection: user input inside query string" },
  { line: 5, kind: "bug", text: "user may be None, crashes on unknown name" },
  { line: 5, kind: "security", text: "Plain-text password comparison" },
  { line: 7, kind: "perf", text: "Loads the full logs table on every login" },
];

const kindStyle: Record<Finding["kind"], string> = {
  security: "text-destructive border-destructive/40 bg-destructive/10",
  bug: "text-warning border-warning/40 bg-warning/10",
  perf: "text-primary border-primary/40 bg-primary/10",
};

const kindLabel: Record<Finding["kind"], string> = {
  security: "SECURITY",
  bug: "BUG",
  perf: "PERF",
};

export function ScanPreview() {
  const flagged = new Map<number, Finding["kind"]>();
  findings.forEach((f) => {
    if (!flagged.has(f.line) || f.kind === "security") flagged.set(f.line, f.kind);
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">auth.py · example scan</span>
      </div>

      <div className="scan-line overflow-x-auto font-mono text-[12.5px] leading-6">
        {code.map((ln, i) => {
          const n = i + 1;
          const k = flagged.get(n);
          return (
            <div
              key={n}
              className={`flex w-max min-w-full border-l-2 pr-4 ${
                k === "security"
                  ? "border-destructive bg-destructive/8"
                  : k === "bug"
                    ? "border-warning bg-warning/8"
                    : k === "perf"
                      ? "border-primary bg-primary/8"
                      : "border-transparent"
              }`}
            >
              <span className="w-10 shrink-0 select-none pr-3 text-right text-muted-foreground/60">
                {n}
              </span>
              <span className="whitespace-pre text-foreground/90">{ln}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border bg-surface p-4">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-muted-foreground">4 issues found</span>
          <span className="text-destructive">risk: high</span>
        </div>
        {findings.map((f, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-0.5 shrink-0 rounded border px-1.5 py-px font-mono text-[10px] font-medium tracking-wider ${kindStyle[f.kind]}`}
            >
              {kindLabel[f.kind]}
            </span>
            <span className="font-mono text-xs text-muted-foreground">L{f.line}</span>
            <span className="text-foreground/85">{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
