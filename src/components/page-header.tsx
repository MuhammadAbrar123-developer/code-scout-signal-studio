import type { ReactNode } from "react";

/** Consistent page heading: eyebrow, title, description and optional actions, aligned on one grid. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
