import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bug, Gauge, ShieldAlert, Sparkles } from "lucide-react";

import { ScanPreview } from "@/components/scan-preview";
import { Button } from "@/components/ui/button";

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
    title: "Bug detection",
    body: "Spot hidden errors, edge cases and crashes that are easy to miss when reviewing by hand.",
  },
  {
    icon: ShieldAlert,
    title: "Security scanning",
    body: "Catch weaknesses like injection, unsafe input handling and exposed secrets early.",
  },
  {
    icon: Gauge,
    title: "Performance",
    body: "Find slow loops, wasted queries and heavy operations, with clear ways to speed them up.",
  },
  {
    icon: Sparkles,
    title: "Code quality",
    body: "Get plain-language explanations that help you understand your code and write it cleaner.",
  },
];

function Index() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr] lg:pt-28">
          <div className="min-w-0 animate-rise">
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Engineering · Security · AI
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Write code.
              <br />
              <span className="text-signal">We'll guard it.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              CodeGuard AI finds bugs, security weaknesses and slow code in one place, and
              explains every problem so you actually learn from it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild variant="hero" size="xl" className="group">
                <Link to="/analyze">
                  Analyze your code
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/about">Why I built it</Link>
              </Button>
            </div>
          </div>
          <div className="min-w-0 animate-rise [animation-delay:150ms]">
            <ScanPreview />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">One platform, four checks</span>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              Stop juggling separate tools for debugging, security and speed.
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="group rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-6 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <span className="eyebrow">Our vision</span>
          <blockquote className="mt-6 font-display text-3xl font-medium leading-snug sm:text-4xl">
            “To help developers build <span className="text-signal">better, safer,</span> and
            more reliable software through intelligent code analysis.”
          </blockquote>
          <p className="mt-6 text-muted-foreground">
            Made for students and beginners first, useful for every developer.
          </p>
          <Button asChild variant="hero" size="lg" className="mt-9">
            <Link to="/analyze">Start your first scan</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
