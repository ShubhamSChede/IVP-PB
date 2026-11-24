"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import UnlockSheet from "./UnlockSheet";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

// Desktop (≥1024px): full top menu.
const DESKTOP = [
  { href: "/", label: "Live" },
  { href: "/matches", label: "Matches" },
  { href: "/standings", label: "Standings" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule" },
  { href: "/chat", label: "Chat", badge: true },
  { href: "/rules", label: "Rules" },
];
// Phones & tablets: app-style bottom tab bar (5 tabs max).
const TABS = [
  { href: "/", label: "Live", icon: "live" },
  { href: "/matches", label: "Matches", icon: "matches" },
  { href: "/standings", label: "Table", icon: "standings", also: ["/teams"] },
  { href: "/chat", label: "Chat", icon: "chat", badge: true },
  { href: "/more", label: "More", icon: "more", also: ["/schedule", "/rules"] },
];

const isActive = (path, item) =>
  item.href === "/"
    ? path === "/"
    : path === item.href || path.startsWith(`${item.href}/`) || item.also?.some((p) => path.startsWith(p));

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1.5 min-w-[18px] rounded-full bg-accent px-1 text-center text-[10px] leading-[18px] text-black">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ConnectionDot() {
  const { connection } = useLiveData();
  const label = connection === "live" ? "Live" : connection === "offline" ? "Reconnecting…" : "Connecting…";
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted" title={label} aria-label={`Connection: ${label}`}>
      <span className={`size-2 rounded-full ${connection === "live" ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "animate-pulse bg-warn"}`} />
      <span className={connection === "live" ? "hidden xl:inline" : ""}>{label}</span>
    </span>
  );
}

function EditButton() {
  const { editor, others, lock, checked } = useEditor();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  if (!checked) return <div className="size-10" />;

  if (editor) {
    return (
      <button
        onClick={async () => {
          await lock();
          toast("Edit mode off");
        }}
        className="flex h-10 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 pr-3 pl-2.5 text-sm text-accent"
        aria-label={`Editing as ${editor.name}. Tap to lock.`}
      >
        <Icon name="unlock" size={18} />
        <span className="max-w-20 truncate">{editor.name}</span>
        {others.length > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-xs text-black" title={`${others.length} other editor(s) online`}>
            +{others.length}
          </span>
        )}
      </button>
    );
  }
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-full border border-line text-muted hover:text-ink lg:flex lg:w-auto lg:gap-2 lg:px-4 lg:text-sm"
        aria-label="Unlock edit mode"
      >
        <Icon name="lock" size={18} />
        <span className="hidden lg:inline">Edit</span>
      </button>
      <UnlockSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function Nav() {
  const path = usePathname();
  const { settingsMap, unreadChat } = useLiveData();
  const title = settingsMap.event_title || "IVP Pickleball 2026";
  const chatBadge = path === "/chat" ? 0 : unreadChat;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6 lg:h-16">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 lg:flex-none">
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-accent">
              <span className="size-1.5 rounded-full bg-[#063d1c]" />
            </span>
            <span className="truncate text-base text-ink-strong lg:text-lg">{title}</span>
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main">
            {DESKTOP.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-3 py-2 text-sm transition-colors ${
                  isActive(path, item) ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
                {item.badge && <Badge count={chatBadge} />}
              </Link>
            ))}
          </nav>
          <ConnectionDot />
          <EditButton />
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((item) => {
            const active = isActive(path, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-accent" : "text-muted"}`}
                >
                  <span
                    className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${active ? "bg-accent/15" : ""}`}
                  >
                    <Icon name={item.icon} size={22} strokeWidth={active ? 2.4 : 2} />
                    {item.badge && <Badge count={chatBadge} />}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
