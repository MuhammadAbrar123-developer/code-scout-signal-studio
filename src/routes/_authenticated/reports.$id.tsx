import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ReportView, ScoreRing, SeverityBadge } from "@/components/report-view";
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
import type { Finding, Severity } from "@/lib/analysis";

const reportQuery = (id: string) =>
  queryOptions({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, language, code, summary, risk_level, score, findings, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/_authenticated/reports/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(reportQuery(params.id));
    if (!data) throw notFound();
    return null;
  },
  head: () => ({
    meta: [
      { title: "Scan report — CodeGuard AI" },
      { name: "description", content: "Your CodeGuard AI code analysis report." },
      { property: "og:title", content: "Scan report — CodeGuard AI" },
      { property: "og:description", content: "Bugs, security issues, performance and quality findings." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Report not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/history">Back to history</Link>
      </Button>
    </div>
  ),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(reportQuery(id));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  if (!data) return null;

  const findings = (data.findings ?? []) as unknown as Finding[];

  async function onDelete() {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete this report."); return; }
    queryClient.removeQueries({ queryKey: ["analysis", id] });
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
    toast.success("Report deleted.");
    navigate({ to: "/history", replace: true });
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/history"
        className="inline-flex items-center gap-2 font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> history
      </Link>

      <div className="mt-6 flex flex-col gap-6 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <ScoreRing score={data.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
            <span>{data.language}</span>
            <span>·</span>
            <span>{new Date(data.created_at).toLocaleString()}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              risk <SeverityBadge severity={data.risk_level as Severity} />
            </span>
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold">{data.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{data.summary}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="self-start">
              <Trash2 /> Delete
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
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mt-6">
        <ReportView code={data.code} findings={findings} />
      </div>
    </section>
  );
}
