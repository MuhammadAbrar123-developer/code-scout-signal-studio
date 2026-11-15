import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Download, Loader2, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateCorrectedCode } from "@/lib/fix.functions";

export function CorrectedCode({
  id,
  initialCode,
  initialChanges,
  disabled,
}: {
  id: string;
  initialCode: string | null;
  initialChanges: string[];
  disabled: boolean;
}) {
  const run = useServerFn(generateCorrectedCode);
  const queryClient = useQueryClient();
  const [code, setCode] = useState(initialCode);
  const [changes, setChanges] = useState(initialChanges);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onGenerate() {
    setBusy(true);
    try {
      const res = await run({ data: { id } });
      if (!res.ok) return void toast.error(res.error);
      setCode(res.corrected_code);
      setChanges(res.changes);
      queryClient.invalidateQueries({ queryKey: ["analysis", id] });
    } catch {
      toast.error("Couldn't create the corrected code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onDownload() {
    if (!code) return;
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "corrected-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!code) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Want the corrected code?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {disabled
              ? "The original code for this report was removed, so a corrected version can't be made."
              : "CodeGuard can rewrite your full code with these issues fixed. This uses one AI request."}
          </p>
        </div>
        <Button variant="hero" onClick={onGenerate} disabled={busy || disabled}>
          {busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
          {busy ? "Fixing your code…" : "Get corrected code"}
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2.5">
        <span className="text-sm font-medium">Corrected code</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCopy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download /> Download
          </Button>
        </div>
      </div>
      {changes.length > 0 && (
        <ul className="list-disc space-y-1 border-b border-border px-8 py-4 text-sm text-foreground/85">
          {changes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
      <pre className="max-h-[70vh] overflow-auto p-4 font-mono text-[12.5px] leading-6 text-foreground/90">
        <code>{code}</code>
      </pre>
      <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        AI fixes can be wrong. Test the corrected code before using it.
      </p>
    </div>
  );
}
