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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9b7223]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
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
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "warning"
        ? "bg-[#f4ead6] text-[#8a651f] ring-[#e6cf9f]"
        : "bg-slate-100 text-slate-700 ring-slate-200";

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
      className={`rounded-[12px] bg-[#181818] px-5 py-3 text-sm font-semibold shadow-[0_14px_28px_rgba(24,24,24,0.12)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:translate-y-0 disabled:opacity-60 ${className}`}
      style={{ color: '#ffffff' }}
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
      className={`rounded-[12px] bg-[#181818] px-5 py-3 text-sm font-semibold transition hover:bg-[#242424] disabled:opacity-60 ${className}`}
      style={{ color: '#ffffff' }}
      {...props}
    >
      {children}
    </button>
  );
}
