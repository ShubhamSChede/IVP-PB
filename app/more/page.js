import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/Skeleton";
import InstallHint from "@/components/layout/InstallHint";

const LINKS = [
  { href: "/teams", label: "Teams", desc: "Rosters, history & player stats", icon: "teams" },
  { href: "/schedule", label: "Schedule", desc: "Every wave, 3:30 PM – 10:00 PM", icon: "schedule" },
  { href: "/rules", label: "Rules", desc: "On-court rulings & tournament format", icon: "rules" },
];

export default function MorePage() {
  return (
    <div>
      <PageTitle title="More" />
      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {LINKS.map((l, i) => (
          <li key={l.href} className={i ? "border-t border-line/70" : ""}>
            <Link href={l.href} className="flex items-center gap-4 p-4 active:bg-surface-2">
              <span className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent-ink"><Icon name={l.icon} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-base text-ink-strong">{l.label}</span>
                <span className="block text-sm font-medium text-muted">{l.desc}</span>
              </span>
              <span className="text-muted" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <InstallHint />
    </div>
  );
}
