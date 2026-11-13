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
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div className="min-w-0 animate-rise">
            <span className="eyebrow">Engineering · Security · AI</span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.5rem]">
              Write code.
              <br />
              <span className="text-signal">We'll guard it.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              CodeGuard AI finds bugs, security weaknesses and slow code in one place, and
              explains every problem so you actually learn from it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="hero" size="lg" className="group">
                <Link to="/analyze">
                  Analyze your code
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
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
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
          <div className="max-w-2xl">
            <span className="eyebrow">One platform, four checks</span>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              Stop juggling separate tools for debugging, security and speed.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <div className="max-w-2xl">
            <span className="eyebrow">Our vision</span>
            <p className="mt-4 font-display text-2xl font-medium leading-snug sm:text-3xl">
              To help developers build better, safer, and more reliable software through
              intelligent code analysis.
            </p>
            <p className="mt-4 text-muted-foreground">
              Made for students and beginners first, useful for every developer.
            </p>
          </div>
          <Button asChild variant="hero" size="lg" className="group shrink-0">
            <Link to="/analyze">
              Start your first scan
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
