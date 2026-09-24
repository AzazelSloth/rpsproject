import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card-surface rounded-[12px] ${className}`}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-graphite">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const classes =
    tone === "success"
      ? "bg-accent-soft text-accent ring-line"
      : tone === "warning"
        ? "bg-page text-graphite ring-muted"
        : "bg-page text-graphite ring-line";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`rounded-[12px] bg-graphite px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(31,37,40,0.12)] transition hover:-translate-y-0.5 hover:bg-accent disabled:translate-y-0 disabled:opacity-100 disabled:bg-track disabled:text-muted ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`rounded-[12px] bg-graphite px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-100 disabled:bg-track disabled:text-muted ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
