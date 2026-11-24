"use client";

import { useEffect } from "react";
import Icon from "./Icon";

// Bottom sheet on phones, centred dialog on md+.
export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl md:pb-5">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line md:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl text-ink-strong">{title}</h2>
          <button onClick={onClose} className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
