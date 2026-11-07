import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Why I built CodeGuard AI — The story and vision" },
      {
        name: "description",
        content:
          "A Computer Science student's story of why code analysis should be smarter, easier and accessible to every developer.",
      },
      { property: "og:title", content: "Why I built CodeGuard AI" },
      {
        property: "og:description",
        content:
          "Combining software engineering, cybersecurity and AI to help developers write safer, cleaner code.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const problems = [
  "Hidden errors that only show up when it's too late",
  "Security weaknesses beginners don't know to look for",
  "Manual code review that eats hours",
  "Too many separate tools for debugging, security and optimization",
];

function About() {
  return (
    <article className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-hero" />
      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> cd ..
        </Link>

        <p className="mt-12 font-mono text-sm text-primary">// the story</p>
        <h1 className="mt-3 animate-rise text-4xl font-semibold leading-tight sm:text-5xl">
          Why I built <span className="text-signal">CodeGuard AI</span>
        </h1>

        <div className="mt-10 space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            As a Computer Science student, I have realized that writing code is only one part of
            software development. Finding bugs, identifying security vulnerabilities, improving
            performance, and maintaining code quality are equally important challenges.
          </p>
          <p className="text-muted-foreground">
            Developers, especially students and beginners, often struggle with:
          </p>
        </div>

        <ul className="mt-5 space-y-3">
          {problems.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="mt-0.5 font-mono text-sm text-destructive">✕</span>
              <span className="text-foreground/90">{p}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            That is why I decided to build <strong className="text-foreground">CodeGuard AI</strong>{" "}
            — a platform designed to make code analysis smarter, easier, and more accessible.
          </p>
          <p>
            My goal is to bring essential code analysis tools together in one place, helping
            developers understand their code, detect potential problems, improve security, and
            write cleaner and more efficient software.
          </p>
          <p>
            This project represents my effort to combine{" "}
            <span className="text-primary">software engineering</span>,{" "}
            <span className="text-warning">cybersecurity</span>, and{" "}
            <span className="text-success">artificial intelligence</span> into one practical
            solution.
          </p>
        </div>

        <div className="mt-14 rounded-xl border border-primary/30 bg-card p-8 shadow-glow">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">My vision</p>
          <p className="mt-4 font-display text-2xl font-medium leading-snug">
            To help developers build better, safer, and more reliable software through
            intelligent code analysis.
          </p>
          <p className="mt-6 font-mono text-sm text-muted-foreground">— Muhammad Abrar</p>
        </div>
      </div>
    </article>
  );
}
