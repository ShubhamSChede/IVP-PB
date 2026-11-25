"use client";

// Form atoms for editor sheets. 48px tall, 16px text (no iOS focus zoom).
const base =
  "w-full rounded-xl border border-line bg-bg px-3.5 text-base text-ink-strong placeholder:text-muted/60 focus:border-accent focus:outline-none";

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs font-medium text-muted/80">{hint}</span>}
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return <input className={`${base} h-12 ${className}`} {...props} />;
}

export function TextArea({ className = "", rows = 4, ...props }) {
  return <textarea rows={rows} className={`${base} py-3 leading-relaxed ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${base} h-12 appearance-none bg-[length:14px] bg-[right_0.9rem_center] bg-no-repeat pr-9 ${className}`} {...props}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235e8f6b' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  );
}

export function PrimaryButton({ busy, children, className = "", ...props }) {
  return (
    <button
      className={`h-12 w-full rounded-md bg-accent text-[13px] font-semibold uppercase tracking-[0.08em] text-on-accent hover:bg-accent-hover disabled:opacity-40 ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy ? "Saving…" : children}
    </button>
  );
}

export function GhostButton({ children, className = "", danger = false, ...props }) {
  return (
    <button
      className={`h-12 rounded-md border px-4 text-[13px] font-semibold uppercase tracking-[0.08em] ${danger ? "border-danger/40 text-danger" : "border-ink-strong/25 text-ink-strong hover:border-ink-strong"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Small round icon button used for edit affordances on cards. */
export function EditIconButton({ label = "Edit", ...props }) {
  return (
    <button
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-md border border-line text-muted hover:text-ink"
      {...props}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      </svg>
    </button>
  );
}
