export default function Skeleton({ rows = 3, className = "h-40" }) {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`animate-pulse rounded-2xl border border-line bg-surface ${className}`} />
      ))}
    </div>
  );
}

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.6rem,5vw,2.4rem)] leading-tight text-ink-strong">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function ErrorNote({ message }) {
  return (
    <div className="rounded-2xl border border-danger/40 bg-[#140707] p-4 text-sm text-danger">
      Couldn&apos;t load live data: {message}
    </div>
  );
}
