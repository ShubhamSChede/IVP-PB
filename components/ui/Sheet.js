"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

// Modal sheet. Rendered into <body> via a portal: parents with backdrop-filter
// or transform (e.g. the blurred sticky header) would otherwise become the
// containing block for `position: fixed` and trap the sheet inside them.
//
// Default: bottom sheet on phones, centred dialog on md+.
// `center`: centred dialog on every screen size (used for the unlock prompt).
export default function Sheet({ open, onClose, title, children, center = false }) {
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

  const panel = center
    ? "max-w-md rounded-3xl p-5"
    : "rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl md:pb-5";

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex justify-center ${center ? "items-center p-4" : "items-end md:items-center"}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button aria-label="Close" className="sheet-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`sheet-panel relative max-h-[90dvh] w-full overflow-y-auto border border-line bg-surface ${panel}`}>
        {!center && <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line md:hidden" />}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl text-ink-strong">{title}</h2>
          <button onClick={onClose} className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
