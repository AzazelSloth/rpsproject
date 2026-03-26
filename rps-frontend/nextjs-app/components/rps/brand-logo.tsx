export function BrandLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-end gap-2 ${className}`}>
      <div className="brand-wordmark leading-none">
        <span className={compact ? "text-[2rem]" : "text-[3.8rem]"}>Lar</span>
        <span className="relative inline-flex items-center justify-center px-[0.02em] align-baseline">
          <span
            className={`${compact ? "h-[0.8em] w-[0.8em]" : "h-[0.82em] w-[0.82em]"} rounded-full border-[0.11em] border-[#e1a63b] bg-[#f0c15a] shadow-[inset_0_0_0_0.08em_rgba(255,255,255,0.5)]`}
          />
          <span
            className={`absolute ${compact ? "-bottom-[0.2em] right-[0.02em] h-[0.38em] w-[0.15em]" : "-bottom-[0.22em] right-[0.02em] h-[0.4em] w-[0.16em]"} rotate-[34deg] rounded-full bg-[#e1a63b]`}
          />
        </span>
        <span className={compact ? "text-[2rem]" : "text-[3.8rem]"}>che</span>
      </div>
      <span className={`${compact ? "pb-1 text-base" : "pb-2 text-2xl"} font-semibold tracking-tight text-slate-900`}>
        360
      </span>
    </div>
  );
}
