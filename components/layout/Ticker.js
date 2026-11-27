"use client";

import { computeStandings, tieResult } from "@/lib/tournament";
import { useLiveData } from "@/components/providers/LiveDataProvider";

// Stock-ticker style strip under the header: live ties, results (▲ winner,
// ▼ loser), what's next, the leader and the latest announcement. Content is
// rendered twice and slid left by 50% for a seamless loop; touch/hover pauses.

const UP = "text-[#4ade80]";
const DOWN = "text-[#ff8f8f]";
const ANNOUNCE_WINDOW_MS = 60 * 60 * 1000;

/** "Kapil Team" → "KAPIL"; generic names ("Team 3") stay whole. */
export function tickerSymbol(team) {
  if (!team) return "TBD";
  const first = team.name.trim().split(/\s+/)[0];
  return (/^team$/i.test(first) ? team.name : first).toUpperCase();
}

function buildItems({ matches, teamsById, teams, activity_log }) {
  const sym = (id) => tickerSymbol(teamsById.get(id));
  const items = [];
  const withTeams = matches.filter((m) => m.team_a_id && m.team_b_id).map((m) => [m, tieResult(m)]);

  // 1. Live ties
  for (const [m, r] of withTeams) {
    if (r.status === "completed" || !(m.is_live || r.status === "in_progress")) continue;
    items.push(
      <span key={`live-${m.id}`}>
        <span className="mr-2 inline-flex items-center gap-1 text-accent-ink">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" /> LIVE
        </span>
        {sym(m.team_a_id)} <span className="text-accent-ink">{r.setsA}–{r.setsB}</span> {sym(m.team_b_id)}
      </span>
    );
  }

  // 2. Latest announcement (last hour)
  const notice = activity_log.find((a) => a.kind === "announcement");
  if (notice && Date.parse(notice.created_at) > Date.now() - ANNOUNCE_WINDOW_MS) {
    items.push(
      <span key={`notice-${notice.id}`}>
        <span className="mr-2 text-accent-ink">NOTICE</span>
        {notice.message}
      </span>
    );
  }

  // 3. Results, newest first
  const done = withTeams.filter(([, r]) => r.status === "completed" && r.winnerSide).reverse();
  for (const [m, r] of done.slice(0, 10)) {
    const aWon = r.winnerSide === "a";
    const diff = Math.abs(r.ptsA - r.ptsB);
    items.push(
      <span key={`res-${m.id}`}>
        {sym(m.team_a_id)} <span className={aWon ? UP : DOWN}>{aWon ? "▲" : "▼"}</span>{" "}
        <span className="text-ink-strong">{r.setsA}–{r.setsB}</span>{" "}
        <span className={aWon ? DOWN : UP}>{aWon ? "▼" : "▲"}</span> {sym(m.team_b_id)}
        <span className="ml-1.5 text-muted">+{diff}</span>
      </span>
    );
  }

  // 4. Next up
  const next = matches.find((m) => tieResult(m).status === "pending" && !m.is_live);
  if (next) {
    const label = next.team_a_id && next.team_b_id ? `${sym(next.team_a_id)} v ${sym(next.team_b_id)}` : next.label.split(" (")[0];
    items.push(
      <span key={`next-${next.id}`}>
        <span className="mr-2 text-muted">NEXT {next.start_time}</span>
        {label}
      </span>
    );
  }

  // 5. Leader (once results exist)
  if (done.length) {
    const lead = computeStandings(teams, matches)[0];
    const diff = lead.diff > 0 ? `+${lead.diff}` : `${lead.diff}`;
    items.push(
      <span key="leader">
        <span className="mr-2 text-accent-ink">#1</span>
        {tickerSymbol(lead.team)} {lead.wins}-{lead.losses} <span className={lead.diff >= 0 ? UP : DOWN}>{diff}</span>
      </span>
    );
  }

  // Before any action: opening bell + first fixtures
  if (!items.length || (!done.length && !items.some((i) => String(i.key).startsWith("live")))) {
    const first = withTeams.filter(([m]) => m.round === 1).slice(0, 5);
    if (first.length) {
      items.unshift(
        <span key="bell">
          <span className="mr-2 text-accent-ink">OPENING BELL</span>
          {first[0][0].start_time}
        </span>,
        ...first.map(([m]) => (
          <span key={`fx-${m.id}`}>
            <span className="mr-2 text-muted">{m.start_time}</span>
            {sym(m.team_a_id)} v {sym(m.team_b_id)}
          </span>
        ))
      );
    }
  }
  // Always: where to watch replays
  items.push(
    <span key="replays">
      <span className="mr-2 text-accent-ink">REPLAYS</span>
      Full match clips on the FieldFlicks app
    </span>
  );
  return items;
}

function Row({ items, hidden }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          <span className="px-5">{item}</span>
          <span className="text-[8px] text-accent" aria-hidden="true">◆</span>
        </span>
      ))}
    </div>
  );
}

export default function Ticker() {
  const live = useLiveData();
  if (!live.loaded) return <div className="h-8 border-t border-line" />;

  const base = buildItems(live);
  if (!base.length) return <div className="h-8 border-t border-line" />;

  // A short tape must still be wider than the widest screen, or a gap opens
  // on the right as it slides: repeat it until it's ~12 items long.
  const reps = Math.max(1, Math.ceil(12 / base.length));
  const items = Array.from({ length: reps }, () => base).flat();

  // ~55px/s regardless of how much is on the tape.
  const approxWidth = items.length * 190;
  const duration = Math.max(18, Math.round(approxWidth / 55));

  return (
    <div className="ticker relative h-8 overflow-hidden border-t border-line text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-strong" role="marquee" aria-label="Live score ticker">
      <div className="ticker-track flex h-full w-max items-center" style={{ animationDuration: `${duration}s` }}>
        <Row items={items} />
        <Row items={items} hidden />
      </div>
      {/* soft fade at both edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg to-transparent" />
    </div>
  );
}
