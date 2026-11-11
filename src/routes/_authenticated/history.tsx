import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCode2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/report-view";
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
import { supabase } from "@/integrations/supabase/client";
import type { Severity } from "@/lib/analysis";

const analysesQuery = queryOptions({
  queryKey: ["analyses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("analyses")
      .select("id, title, language, risk_level, score, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/history")({
  loader: ({ context }) => context.queryClient.ensureQueryData(analysesQuery),
  head: () => ({
    meta: [
      { title: "Scan history — CodeGuard AI" },
      { name: "description", content: "All your saved CodeGuard AI code analysis reports." },
      { property: "og:title", content: "Scan history — CodeGuard AI" },
      { property: "og:description", content: "All your saved code analysis reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

function scoreTone(score: number) {
  return score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
}

function HistoryPage() {
  const { data } = useSuspenseQuery(analysesQuery);
  const queryClient = useQueryClient();

  async function remove(id: string) {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete this report."); return; }
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
    queryClient.removeQueries({ queryKey: ["analysis", id] });
    toast.success("Report deleted.");
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        eyebrow="History"
        title="Your scans"
        description="Every report you've run. Open one to see the details, or delete what you don't need."
        actions={
          <Button asChild variant="hero" size="lg">
            <Link to="/analyze">
              <Plus /> New scan
            </Link>
          </Button>
        }
      />

      {data.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <FileCode2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-foreground">No scans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Your reports will appear here.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {data.map((a) => (
            <li key={a.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-surface">
              <span className={`w-10 text-right font-display text-xl font-semibold ${scoreTone(a.score)}`}>
                {a.score}
              </span>
              <Link to="/reports/$id" params={{ id: a.id }} className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground group-hover:text-primary">{a.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{a.language}</span>
                  <span>·</span>
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                </p>
              </Link>
              <SeverityBadge severity={a.risk_level as Severity} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete report">
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The report and the code you submitted will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(a.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
