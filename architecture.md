# IVP Pickleball 2026 — Architecture

A live tournament site for 10 teams (Swiss stage, then IPL-style playoffs). Anyone can watch. Organisers unlock **edit mode** with one shared code. Everything is editable in edit mode, several editors can work at once, and every viewer's screen updates live without a reload.

> **Top priority: the site must be fully responsive and built mobile-first.** Most viewers and editors will be courtside on phones, so every screen, viewer and editor alike, is designed for a 360 px wide phone first and then scaled up to tablet and desktop. See [§7 Responsive & mobile-first](#7-responsive--mobile-first-top-priority).

Source of truth for the format: `IVP_Pickleball_2026_Swiss_Fixtures.xlsx.xlsx` (this folder). The site replaces the workbook's formulas with JavaScript. The workbook's data is loaded through `supabase/seed.sql`.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router), plain JavaScript** | One repo for UI and API routes. |
| Styling | Tailwind CSS v4 + CSS variables | Fast to build, one theme file (`app/globals.css`). |
| Font / theme | **Poppins**, bold by default; black background, light-green text (`#a6f5bd`), accent `#4ade80` | As requested. |
| Database | **Supabase Postgres** | Tables in `supabase/schema.sql`. |
| Live updates | **Supabase Realtime** (`postgres_changes` + Presence) | Viewers and editors get changes pushed within ~100–300 ms. |
| Writes | Next.js Route Handlers + Supabase **service role** key (server-only) | The public key can only read. Only the server can write, and only after checking the edit cookie. |
| Hosting | Vercel (recommended) + Supabase cloud | Both have free tiers that are enough for one event. |

No TypeScript, no ORM, no global state library: React state plus a small realtime hook.

---

## 2. What the Excel defines and where it lives now

| Sheet | Becomes |
|---|---|
| `Inputs_Rules` (tournament controls, how-to) | `settings` table → shown on **Rules / Info** page, editable |
| `Game_Rules` (R01–R20 + Spirit of the Game) | `rules` table → **Rules** page, editable |
| `Teams` (10 teams × captain + 6 players) | `teams` + `players` tables → **Teams** page (dummy names for now) |
| `Schedule` (W01–W19, break, buffer, end) | `schedule_items` table → **Schedule** page |
| `Swiss_Matches` (T01–T15, 3 courts per tie) | `matches` rows `SW-R{1-3}-T{01-15}` → **Matches** page |
| `Standings` | **computed in JS** from matches (`lib/tournament/standings.js`) |
| `Swiss_Engine` (auto-pairing R2/R3) | **computed in JS** (`lib/tournament/swiss.js`); the result is saved to `matches` |
| `IPL_Playoffs` + podium | `matches` rows `PL-Q1`, `PL-EL`, `PL-Q2`, `PL-GF`; slots filled from `a_source`/`b_source` |

### Tournament logic (ported from the workbook formulas)

- **Tie** = 3 sets played at the same time on Courts 1–3. The team that wins more sets wins the tie. A tie is *Completed* when all 6 court scores are entered. *In Progress* means some are entered; *Pending* means none.
- **Scoring**: Swiss, Q1 and Eliminator are played to 15, capped at 17. Q2 and the Grand Final are played to 21, capped at 23. Rally scoring, win by 2. The editor checks entered scores against these limits and warns (does not block) if a score looks wrong.
- **Ranking order** (same as the `Sort Score` formula): 1) tie wins → 2) sets won → 3) point difference → 4) points for → 5) original team order.
- **Round 1**: fixed draw T01 v T02, T03 v T04, T05 v T06, T07 v T08, T09 v T10.
- **Round 2** (auto, as soon as all 5 R1 ties are Completed): rank after R1. Pair seed 1 v 2, 3 v 4, 5 v 6, 7 v 8, 9 v 10. If seeds 5 and 6 already met in R1, play 5 v 7 and 6 v 8 instead (same swap as the workbook).
- **Round 3** (auto, after R2 completes): rank after R2. Take the highest unpaired seed and pair it with the highest-ranked opponent it has **not** played, and repeat. If that greedy pass would force a rematch at the bottom, backtrack. This gives the workbook's "zero rematch" result and also covers edge cases the 3-option bottom-4 formula doesn't.
- **Playoffs**: Q1 = 1st v 2nd, Eliminator = 3rd v 4th, Q2 = Q1 loser v Eliminator winner, Grand Final = Q1 winner v Q2 winner. Podium: GF winner, GF loser, Q2 loser, Eliminator loser.
- **Pairings are saved, not recomputed live.** When the last score of a round is saved, the server works out the next round's pairings, writes them to `matches`, and sets `pairing_locked = true`. Editing an old score later does not reshuffle a round that may already be on court. An editor can always override Team A/B by hand, or press **"Re-run pairing"** to recompute.

All tournament maths lives in `lib/tournament/*` as pure functions with no I/O. The browser runs them to show standings, and the server runs the same code to auto-pair. Each piece of logic exists in one place.

---

## 3. Data model (`supabase/schema.sql`)

```
settings        key PK, label, value, notes, sort
teams           id, code (T01..T10), name, captain, color, sort
players         id, team_id → teams, name, gender (M/F, optional), sort
matches         id ('SW-R1-T01' | 'PL-Q1'…), stage, round, label, wave, start_time, end_time,
                race_to, cap, team_a_id, team_b_id, a_source, b_source, pairing_locked,
                c1_a c1_b c2_a c2_b c3_a c3_b (ints),
                lineups jsonb  {c1:{a:[playerId,playerId], b:[…]}, c2:…, c3:…},
                court_officials jsonb, is_live, notes, sort
schedule_items  id, wave, start/end, mins, phase, match_id → matches (nullable), title, format, warmup, officials, sort
rules           id, code, category, topic, ruling, sort
chat_messages   id, author, body (≤500), is_editor, created_at
activity_log    id, kind, match_id, message, actor, created_at   ← the live feed
```

Every editable table has `updated_at` (set by a trigger) and `updated_by` (the editor's display name).

**Per-court lineups** are optional but valuable. If editors record which two players played each court, the team page can show player-level stats: sets won, pair win rate, and the best pair. Without lineups, analysis stays at team level.

---

## 4. Access model: viewer vs editor

```
Viewer (default)                          Editor (after entering the code)
─────────────────                         ─────────────────────────────────
reads via anon key (RLS: SELECT only)     same reads + inline edit controls
realtime subscriptions                    writes → POST /api/admin/* (service role)
can post in chat (name + message)         chat messages tagged "Organiser"
```

- **Unlock**: `🔒 Edit` button → modal asks for the **code** and a **display name**. `POST /api/auth/unlock` checks the code against `EDIT_CODE` with a constant-time compare and sets an **httpOnly, signed (HMAC-SHA256) cookie** that lasts 24 h. Wrong codes are rate-limited (8 tries per 10 min per IP).
- **Every write route** calls `getEditor()` (`lib/auth.js`) first and returns `401` without a valid cookie. The service role key never reaches the browser.
- **Lock**: `POST /api/auth/lock` clears the cookie. Changing `EDIT_CODE` in the env *and* rotating `SESSION_SECRET` logs out every editor.
- Edit mode is **the same pages with controls switched on**, not a separate admin site. Editors see exactly what viewers see.

Chat goes through `POST /api/chat`, not a direct anon insert. The server limits length, rate-limits each IP and strips markup. An editor can delete a message.

---

## 5. Live updates and several editors at once

### Live feed for viewers (no hard reload)
`lib/hooks/useLiveTable.js`:
1. On mount: one `select *` from the anon client to load the table.
2. Subscribe to `postgres_changes` for that table and apply each INSERT/UPDATE/DELETE to local state.
3. Changed values get the `.flash` class (a 1.2 s green fade), so viewers can see what just changed.
4. When the connection drops (sleeping phone, flaky Wi-Fi), the hook re-fetches on reconnect and on `visibilitychange`. A screen woken from sleep is never stale.

Standings, pairings shown before they are saved, team analysis and the podium are all **derived in the browser** from `matches` and `teams`. One score update is enough to refresh every view.

### Several editors at once
- **Field-level writes.** Each input saves only its own column (`PATCH {c2_a: 13}`), not the whole row. Two people scoring different courts of the same tie never overwrite each other. If two people edit the *same* field, the last write wins, and the other editor sees the new value appear instantly.
- **Optimistic UI.** The input updates at once, saves in the background, and rolls back with a toast if the save fails.
- **Presence.** A Supabase Presence channel shows "3 editors online" and marks a tie as *"Asha is editing"* while someone has it focused. Most collisions are avoided before they happen.
- **Server-side follow-ups.** The score route writes an `activity_log` line ("Team 3 take Court 2, 15–11") and, if a round just finished, runs auto-pairing. Auto-pairing is idempotent (it skips rounds with `pairing_locked`), so two editors finishing the round at the same moment can't pair it twice.

---

## 6. Pages

| Route | Viewer | Editor extras |
|---|---|---|
| `/` **Live** | Matches on court now (`is_live`), next wave, live feed (activity_log), mini standings, podium once decided | Toggle "on court", post an announcement to the feed |
| `/schedule` | Wave timeline 3:30–10:00 PM, fixture names filled from matches | Edit any time, phase, format, warm-up, officials, row |
| `/matches` | Swiss R1/R2/R3 + playoffs as tie cards: 3 court scores, sets, winner, status | Enter scores, lineups per court, officials, override teams, re-run pairing |
| `/standings` | Ranked table, top-4 qualification badges, tiebreak columns | — (derived) |
| `/teams` | 10 team cards with captain and roster | Edit names, captain, players, gender, colour; add or remove players |
| `/teams/[code]` **Analysis** | Team switcher chips, record + form, sets / point diff / avg margin / close sets, record by court, match history with court scores and pairs, player and best-pair stats (from lineups) | Edit name, captain, roster, gender |
| `/chat` | Live chat; name remembered in localStorage | Delete messages; messages tagged "Organiser" |
| `/rules` | Search + category filter over R01–R20; "Format" tab with tournament controls | Edit / add / delete rules; edit controls and the site title |
| `/more` | Links to Teams, Schedule, Rules + "Add to Home Screen" tip (phones) | — |

---

## 7. Responsive & mobile-first (top priority)

Every page must work well on a phone before it counts as done. Viewers follow the event courtside, and organisers enter scores standing at the courts.

### Breakpoints (Tailwind defaults)
| Width | Target | Layout |
|---|---|---|
| **< 640 px** (base styles) | Phones, from 360 px | Single column, bottom tab bar, cards instead of tables |
| `sm` ≥ 640 px | Large phones / small tablets | 2-column card grids where useful |
| `md` ≥ 768 px | Tablets | Bottom tab bar still; 2-column card grids, side-by-side sections |
| `lg` ≥ 1024 px | Laptops / projector screens | Top menu replaces tab bar; multi-column dashboards (Live: on-court + feed + standings) |

Base styles are written for phones. `sm:`/`md:`/`lg:` classes only **add** layout for bigger screens and never patch a desktop layout down to fit a phone.

### Rules
- **No horizontal page scroll** at 360 px, ever. Wide data (standings, schedule) becomes **stacked cards** on phones. Where a table is kept, it sits in its own horizontally scrolling container with the first column (rank/team) sticky.
- **Navigation:** a fixed **bottom tab bar** below 1024 px (**Live · Matches · Table · Chat · More**). The active tab gets a highlight behind its icon, Chat shows an unread badge, and the bar respects `env(safe-area-inset-bottom)` for iPhone home bars. Teams open from the Table, and Schedule, Rules and Teams sit under More. The full top menu appears only at `lg` (≥ 1024 px), because 7 links don't fit at tablet widths.
- **Touch targets ≥ 44×44 px** for every button, tab and score field, with at least 8 px between them.
- **Score entry built for thumbs:** each court is a row with large `−`/`+` steppers and a number field using `inputMode="numeric"`, so the phone opens the number keypad. There is no tiny spreadsheet grid on mobile.
- **Text:** body text at least 16 px. This also stops iOS zooming in when an input gets focus. Headings scale with `clamp()`. Long team names truncate with an ellipsis instead of breaking the layout.
- **Modals** (unlock, edit roster, lineups) open as **bottom sheets** on phones and as centred dialogs on `md`+.
- **Feels like an app:**
  - **Installable (PWA):** `app/manifest.js` plus the generated `icon` and `apple-icon` files. "Add to Home Screen" opens the site full-screen with a black status bar.
  - **Native-style touch:** no tap highlight or double-tap delay, press feedback on buttons, sticky segmented tabs (Matches rounds, Rules search), and swipeable chip rows (team switcher, rule categories).
  - **Page transitions:** pages fade in via `app/template.js`. Opacity only, because an animated `transform` would make the page the containing block for `position: fixed` children such as the chat composer and bottom sheets.
- **Chat composer** is pinned above the tab bar. On Android, `interactiveWidget: resizes-content` keeps it above the keyboard.
- **Chat:** the input is pinned to the bottom and stays visible above the on-screen keyboard. The page uses `100dvh`, not `100vh`, so mobile browser bars don't hide it.
- **Performance on mobile data:** pages load small, there are no heavy chart libraries on first load (charts are lazy-loaded on the team analysis page), and realtime sends only the changed rows.
- **Viewport:** `width=device-width, initial-scale=1`, and pinch-zoom is never disabled.

### Testing checklist (every page, viewer + edit mode)
- [ ] 360×740 (small Android), 390×844 (iPhone), 768×1024 (tablet), 1440×900 (desktop)
- [ ] Portrait and landscape on phones
- [ ] No horizontal scroll; nothing cut off by the notch or home bar
- [ ] All controls usable one-handed with a thumb
- [ ] Realtime updates and the flash highlight still visible on small screens

---

## 8. Folder structure

```
app/
  layout.js, globals.css          theme + Poppins
  page.js                         Live
  schedule/  matches/  standings/  teams/  teams/[code]/  chat/  rules/
  api/
    auth/unlock|lock|session/     edit-code session
    admin/[table]/route.js        generic PATCH/POST/DELETE with per-table column allowlist
    matches/[id]/score/route.js   score save + activity log + auto-pairing
    chat/route.js                 post / delete chat
components/
  layout/                         Nav, EditToggle, UnlockModal, PresenceBadge
  ui/                             EditableText, EditableNumber, Select, Toast, Card
  matches/ standings/ teams/ chat/ schedule/ rules/
lib/
  supabase/browser.js             anon client (read + realtime)
  supabase/admin.js               service-role client (server only)
  auth.js                         HMAC cookie session
  tournament/                     pure logic: tie.js, standings.js, swiss.js, playoffs.js, stats.js
  hooks/                          useLiveTable, useEditor, usePresence
supabase/
  schema.sql                      tables, RLS, realtime
  seed.sql                        generated from the Excel (dummy names, blank scores)
```

**Generic admin route.** `/api/admin/[table]` takes `{ id, patch }` and accepts only the columns in an allowlist for that table (for example, `teams: [name, captain, color, sort]`). Most "everything is editable" screens then need no new backend code. The match score route is separate because saving a score has side effects.

---

## 9. Build order

1. ✅ Project setup, theme, Supabase clients, edit-code auth routes, schema + seed *(done)*
2. ✅ `lib/tournament/*` + unit checks against the Excel's logic (`npm run test:logic`)
3. ✅ Realtime provider + Nav + unlock sheet + presence
4. ✅ Matches page (scoring) → Standings → Live
5. ✅ Teams + analysis page, per-court lineups & umpires (feeds player/pair stats)
6. ✅ Schedule, Rules, Chat; app shell (PWA install, bottom tabs, sheets, transitions)
7. Polish: loading skeletons, empty states, toasts; run the §7 mobile checklist on every page; deploy to Vercel

## 10. Setup

1. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql`.
2. `cp .env.example .env.local` and fill in the values.
3. `npm run dev` → http://localhost:3000

**Replacing dummy names later:** edit them in the Teams page in edit mode, or send the list and it can go into `seed.sql`. Do this before scores are entered, because re-running the seed wipes everything.
