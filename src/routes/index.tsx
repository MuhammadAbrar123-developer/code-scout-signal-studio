import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bug, Gauge, ShieldAlert, Sparkles } from "lucide-react";

import { ScanPreview } from "@/components/scan-preview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeGuard AI — Smarter code analysis for safer software" },
      {
        name: "description",
        content:
          "CodeGuard AI brings bug detection, security scanning, performance tips and code quality review together in one place.",
      },
      { property: "og:title", content: "CodeGuard AI — Smarter code analysis for safer software" },
      {
        property: "og:description",
        content:
          "Find bugs, security weaknesses and slow code before they ship. One platform for intelligent code analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const pillars = [
  {
    icon: Bug,
    tag: "01",
    title: "Bug detection",
    body: "Spot hidden errors, edge cases and crashes that are easy to miss when reviewing by hand.",
  },
  {
    icon: ShieldAlert,
    tag: "02",
    title: "Security scanning",
    body: "Catch weaknesses like injection, unsafe input handling and exposed secrets early.",
  },
  {
    icon: Gauge,
    tag: "03",
    title: "Performance",
    body: "Find slow loops, wasted queries and heavy operations, with clear ways to speed them up.",
  },
  {
    icon: Sparkles,
    tag: "04",
    title: "Code quality",
    body: "Get plain-language explanations that help you understand your code and write it cleaner.",
  },
];

function Index() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr] lg:pt-28">
          <div className="min-w-0 animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              software engineering × cybersecurity × AI
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] sm:text-6xl">
              Write code.
              <br />
              <span className="text-signal">We'll guard it.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              CodeGuard AI finds bugs, security weaknesses and slow code in one place, and
              explains every problem so you actually learn from it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/about"
                className="group inline-flex items-center gap-2 rounded-md bg-signal px-5 py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Why I built it
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="font-mono text-sm text-muted-foreground">
                <span className="text-warning">›</span> analyzer coming soon
              </span>
            </div>
          </div>
          <div className="min-w-0 animate-rise [animation-delay:150ms]">
            <ScanPreview />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="font-mono text-sm text-primary">// one platform, four checks</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Stop juggling separate tools for debugging, security and speed.
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="group relative bg-card p-7 transition-colors hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <p.icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
                  <span className="font-mono text-xs text-muted-foreground">{p.tag}</span>
                </div>
                <h3 className="mt-8 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="border-t border-border/60 bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="font-mono text-sm text-warning">$ cat vision.txt</p>
          <blockquote className="mt-6 font-display text-3xl font-medium leading-snug sm:text-4xl">
            “To help developers build <span className="text-signal">better, safer,</span> and
            more reliable software through intelligent code analysis.”
          </blockquote>
          <p className="mt-6 text-muted-foreground">
            Made for students and beginners first, useful for every developer.
          </p>
        </div>
      </section>
    </>
  );
}
