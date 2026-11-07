// Client-safe shared types and limits for code analysis.

export const MAX_CODE_CHARS = 20_000;
export const MAX_TITLE_CHARS = 120;
export const ANALYSES_PER_HOUR = 20;

export const LANGUAGES = [
  "auto",
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Kotlin",
  "Swift",
  "SQL",
  "Other",
] as const;

export type Category = "bug" | "security" | "performance" | "quality";
export type Severity = "low" | "medium" | "high" | "critical";

export type Finding = {
  category: Category;
  severity: Severity;
  title: string;
  line: number | null;
  explanation: string;
  fix: string;
  fixed_code: string | null;
};

export type AnalysisResult = {
  summary: string;
  detected_language: string;
  score: number;
  risk_level: Severity;
  findings: Finding[];
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const CATEGORY_LABEL: Record<Category, string> = {
  bug: "Bug",
  security: "Security",
  performance: "Performance",
  quality: "Quality",
};
