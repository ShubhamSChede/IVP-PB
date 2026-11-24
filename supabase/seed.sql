-- Generated from IVP_Pickleball_2026_Swiss_Fixtures.xlsx — dummy teams/players, blank scores.
-- Safe to re-run: wipes tournament tables first.
truncate activity_log, chat_messages, schedule_items, matches, players, teams, rules, settings restart identity cascade;

insert into settings (key, label, value, notes, sort) values
  ('total_teams', 'Total Teams', '10', 'Team names & rosters are edited on the Teams page; everything updates live.', 0),
  ('roster_pairings', 'Roster & Pairings', '6 Players', 'Min. 1 female player per team. Captains decide the 3 pairs & court assignments on the spot before each tie.', 1),
  ('tournament_courts', 'Tournament Courts', '3', 'All 3 sets of a team tie run simultaneously on Courts 1, 2, and 3 (best of 3 sets wins the tie).', 2),
  ('practice_warmup_court', 'Practice / Warm-up Court', '1', 'Court 4 reserved strictly for next-wave teams to warm up 5 mins before their slot.', 3),
  ('event_window', 'Event Window', '3:30 PM – 10:00 PM', '390 mins total: 330 mins net play + 45 mins break + 15 mins trophy wrap-up.', 4),
  ('midevent_break', 'Mid-Event Break', '45 mins', 'Scheduled 7:15 PM – 8:00 PM after Swiss Round 3 (dinner + Top-4 seed check).', 5),
  ('trophy_wrapup', 'Trophy & Wrap-up', '15 mins', 'Scheduled 9:45 PM – 10:00 PM right after the Grand Final.', 6),
  ('swiss_stage_15_ties', 'Swiss Stage (15 Ties)', '15 pts (Cap at 17)', 'Rally scoring, win by 2, hard cap at 17. 15-min wave slots. Finish all 3 courts for tiebreakers.', 7),
  ('autoswiss_pairing', 'Auto-Swiss Pairing', 'ENABLED (Zero Rematch)', 'Round 2 & Round 3 matchups fill in automatically as soon as the previous round''s 5 ties finish.', 8),
  ('playoffs_q1_eliminator', 'Playoffs: Q1 & Eliminator', '15 pts (Cap at 17)', 'Rally scoring, win by 2, hard cap at 17. 20-min wave slots.', 9),
  ('playoffs_q2_grand_final', 'Playoffs: Q2 & Grand Final', '21 pts (Cap at 23)', 'Rally scoring, win by 2, hard cap at 23. 25-min wave slots.', 10),
  ('freeze_point_rule', 'Freeze Point Rule', 'OFF (Recommended)', 'Keep OFF in Swiss/Q1/Elim to prevent overruns. Optional ONLY at 20-20 in Grand Final.', 11);

insert into settings (key, label, value, notes, sort) values
  ('event_title', 'Event Title', 'IVP Pickleball 2026', 'Shown in the site header', 100),
  ('how_to_run', 'How To Run (Tournament Day)', '1. Teams Tab: Enter your 10 team names, captains, and 6-player rosters. Pairings are flexible—captains assign pairs to Courts 1–3 on the spot.
2. Swiss Round 1 (3:30 PM – 4:45 PM): Enter Court 1, 2, and 3 scores in the yellow cells on ''Swiss_Matches'' for ties T01–T05.
3. Auto-Fill Round 2 (4:45 PM – 6:00 PM): The instant all 5 Round 1 ties are marked ''Completed'', Round 2 (T06–T10) auto-populates with 1–0 vs 1–0, 1–0 vs 0–1 (no rematch), and 0–1 vs 0–1!
4. Auto-Fill Round 3 (6:00 PM – 7:15 PM): The instant all 5 Round 2 ties are ''Completed'', Round 3 (T11–T15) auto-populates matching records (2–0, 1–1, 0–2) with automatic rematch avoidance!
5. IPL Playoffs (8:00 PM – 9:45 PM): Top 4 from ''Standings'' auto-populate into ''IPL_Playoffs'' (Q1: 1v2, Eliminator: 3v4). Enter scores to auto-advance to Q2, Grand Final, and Podium.', null, 101);

insert into rules (code, category, topic, ruling, sort) values
  ('R01', 'Officiating & Conduct', 'Umpire & Linesmen Authority', 'The Umpire''s and Linesmen''s decisions are FINAL and binding. Arguing, questioning calls, or delaying play will result in a warning; a second offense awards a penalty point to the opponent.', 5),
  ('R02', 'Officiating & Conduct', 'Line Calls (In vs. Out)', 'A ball touching ANY part of the boundary line (baseline or sideline) is IN. Only if there is clear visible space between the ball and the line is it OUT. When in doubt, the ball is IN.', 6),
  ('R03', 'Officiating & Conduct', 'No Replay / No Captain Appeals', 'There are no video replays or captain challenges. If a linesman''s view is completely blocked, only the Umpire may call a replay (let) of the rally.', 7),
  ('R04', 'Indoor / Venue Rules', 'Ball Hits Ceiling / Lights / Beams', 'If the ball hits the ceiling, lights, rafters, fans, or any permanent overhead fixture, it is an immediate FAULT — point is awarded to the opponent.', 8),
  ('R05', 'Indoor / Venue Rules', 'Ball Enters from Adjacent Court', 'If a stray ball from another court rolls onto the playing court during a rally, any player until the Umpire calls ''BALL ON!/STOP'' — game should not be halted.', 9),
  ('R06', 'Indoor / Venue Rules', 'Net Post / Side Curtain / Wall', 'If the ball hits a net post, side wall, or curtain before bouncing in-bounds, it is OUT (point to opponent). Around-the-post (ATP) shots that land in-bounds are LEGAL.', 10),
  ('R07', 'Scoring & Format', 'Rally Scoring (Badminton Style)', 'Every rally awards 1 point regardless of who served. Serving side: right-side player serves on EVEN team score (0, 2, 4...), left-side player serves on ODD team score (1, 3, 5...).', 11),
  ('R08', 'Scoring & Format', 'Points to Win & Hard Caps', 'Swiss Stage, Qualifier 1 & Eliminator: Race to 15, win by 2, HARD CAP at 17 (first to 17 wins). Qualifier 2 & Grand Final: Race to 21, win by 2, HARD CAP at 23.', 12),
  ('R09', 'Scoring & Format', 'Freeze Point Rule', 'Freeze point (win on serve only) is OFF for all Swiss, Q1, Eliminator, and Q2 matches to stay on schedule. Optional ONLY at 20–20 in the Grand Final if on time (still capped at 23).', 13),
  ('R10', 'Scoring & Format', 'Side Switch (Mid-Game)', 'mid-game side switch in 15-point games is at 7 points. In 21-point games (Q2 & Grand Final), teams switch ends once when the first team reaches 11 points (1-minute changeover max).', 14),
  ('R11', 'Serve & Return', 'Legal Underhand Serve', 'Serve must be hit underhand (paddle moving upward, contact below waist/navel, paddle head below wrist). Both feet must be behind the baseline until the ball is struck. Drop serves are legal.', 15),
  ('R12', 'Serve & Return', 'Serve Landing & Kitchen Line', 'The serve must land diagonally in the opponent''s service box and clear the 7-ft Non-Volley Zone (Kitchen) line. A serve that lands ON the Kitchen line is a FAULT (point to receiver).', 16),
  ('R13', 'Serve & Return', 'Let Serves (Hits Net & Lands In)', 'There are NO let serves. If a serve clips the top of the net and lands cleanly in the correct diagonal service box (past the Kitchen line), the ball is LIVE and must be played.', 17),
  ('R14', 'Serve & Return', 'Double-Bounce Rule', 'The serve must bounce once before the receiver hits it, and the return must bounce once before the serving team hits it. Volleying before both bounces occur is a FAULT.', 18),
  ('R15', 'Kitchen (NVZ) Rules', 'No Volleying in the Kitchen', 'Players cannot hit a volley (out of the air) while any part of their foot, body, paddle, or clothing touches the Kitchen or the Kitchen line.', 19),
  ('R16', 'Kitchen (NVZ) Rules', 'Momentum Fault', 'If a player hits a volley outside the Kitchen and their momentum carries them into the Kitchen (even after the ball is dead or bounces twice), it is a FAULT — point to opponent.', 20),
  ('R17', 'Kitchen (NVZ) Rules', 'Re-Establishing Feet', 'After stepping into the Kitchen to play a bounced ball, BOTH feet must clearly touch the ground outside the Kitchen before the player can legally hit a volley.', 21),
  ('R18', 'Faults & Logistics', 'Net Touch & Body Hit', 'Touching the net or net post with your body, paddle, or clothing while the ball is in play is a FAULT. If a live ball hits a player''s body/clothes (other than paddle hand below wrist), it is a FAULT.', 22),
  ('R19', 'Faults & Logistics', 'Double Hits & Carries', 'An unintentional double hit on one continuous single-direction swing is LEGAL. Deliberately catching, carrying, or scooping the ball on the paddle is a FAULT.', 23),
  ('R20', 'Faults & Logistics', 'On-the-Spot Lineups & Punctuality', 'Captains must submit Court 1, 2 & 3 pairings simultaneously 2 minutes before the wave starts. Teams not on court within 3 minutes of their wave start forfeit 0–15 on the delayed court(s).', 24),
  ('SPIRIT', 'Spirit of the Game', 'Spirit of the Game', 'Respect umpires, linesmen, and opponents. Any edge-case situation not listed above will be decided by the Tournament Organizers and their decision will be final.', 99);

insert into teams (code, name, captain, sort) values
  ('T01', 'Team 1', 'Captain 1', 1),
  ('T02', 'Team 2', 'Captain 2', 2),
  ('T03', 'Team 3', 'Captain 3', 3),
  ('T04', 'Team 4', 'Captain 4', 4),
  ('T05', 'Team 5', 'Captain 5', 5),
  ('T06', 'Team 6', 'Captain 6', 6),
  ('T07', 'Team 7', 'Captain 7', 7),
  ('T08', 'Team 8', 'Captain 8', 8),
  ('T09', 'Team 9', 'Captain 9', 9),
  ('T10', 'Team 10', 'Captain 10', 10);

insert into players (team_id, name, sort)
select t.id, 'T' || t.sort || ' Player ' || p, p
from teams t cross join generate_series(1, 6) p;

insert into matches (id, stage, round, label, wave, start_time, end_time, race_to, cap, a_source, b_source, sort) values
  ('SW-R1-T01', 'swiss', 1, 'Round 1', 'W01', '03:30 PM', '03:45 PM', 15, 17, null, null, 1),
  ('SW-R1-T02', 'swiss', 1, 'Round 1', 'W02', '03:45 PM', '04:00 PM', 15, 17, null, null, 2),
  ('SW-R1-T03', 'swiss', 1, 'Round 1', 'W03', '04:00 PM', '04:15 PM', 15, 17, null, null, 3),
  ('SW-R1-T04', 'swiss', 1, 'Round 1', 'W04', '04:15 PM', '04:30 PM', 15, 17, null, null, 4),
  ('SW-R1-T05', 'swiss', 1, 'Round 1', 'W05', '04:30 PM', '04:45 PM', 15, 17, null, null, 5),
  ('SW-R2-T06', 'swiss', 2, 'Round 2', 'W06', '04:45 PM', '05:00 PM', 15, 17, null, null, 6),
  ('SW-R2-T07', 'swiss', 2, 'Round 2', 'W07', '05:00 PM', '05:15 PM', 15, 17, null, null, 7),
  ('SW-R2-T08', 'swiss', 2, 'Round 2', 'W08', '05:15 PM', '05:30 PM', 15, 17, null, null, 8),
  ('SW-R2-T09', 'swiss', 2, 'Round 2', 'W09', '05:30 PM', '05:45 PM', 15, 17, null, null, 9),
  ('SW-R2-T10', 'swiss', 2, 'Round 2', 'W10', '05:45 PM', '06:00 PM', 15, 17, null, null, 10),
  ('SW-R3-T11', 'swiss', 3, 'Round 3', 'W11', '06:00 PM', '06:15 PM', 15, 17, null, null, 11),
  ('SW-R3-T12', 'swiss', 3, 'Round 3', 'W12', '06:15 PM', '06:30 PM', 15, 17, null, null, 12),
  ('SW-R3-T13', 'swiss', 3, 'Round 3', 'W13', '06:30 PM', '06:45 PM', 15, 17, null, null, 13),
  ('SW-R3-T14', 'swiss', 3, 'Round 3', 'W14', '06:45 PM', '07:00 PM', 15, 17, null, null, 14),
  ('SW-R3-T15', 'swiss', 3, 'Round 3', 'W15', '07:00 PM', '07:15 PM', 15, 17, null, null, 15),
  ('PL-Q1', 'playoff', null, 'Qualifier 1 (1st vs 2nd)', 'W16', '08:00 PM', '08:20 PM', 15, 17, 'standing:1', 'standing:2', 16),
  ('PL-EL', 'playoff', null, 'Eliminator (3rd vs 4th)', 'W17', '08:20 PM', '08:40 PM', 15, 17, 'standing:3', 'standing:4', 17),
  ('PL-Q2', 'playoff', null, 'Qualifier 2 (L-Q1 vs W-Elim)', 'W18', '08:40 PM', '09:05 PM', 21, 23, 'loser:PL-Q1', 'winner:PL-EL', 18),
  ('PL-GF', 'playoff', null, 'Grand Final (W-Q1 vs W-Q2)', 'W19', '09:20 PM', '09:45 PM', 21, 23, 'winner:PL-Q1', 'winner:PL-Q2', 19);

-- Round 1 fixed draw: T01 v T02, T03 v T04, ... T09 v T10
update matches set team_a_id = (select id from teams where code = 'T01'), team_b_id = (select id from teams where code = 'T02') where id = 'SW-R1-T01';
update matches set team_a_id = (select id from teams where code = 'T03'), team_b_id = (select id from teams where code = 'T04') where id = 'SW-R1-T02';
update matches set team_a_id = (select id from teams where code = 'T05'), team_b_id = (select id from teams where code = 'T06') where id = 'SW-R1-T03';
update matches set team_a_id = (select id from teams where code = 'T07'), team_b_id = (select id from teams where code = 'T08') where id = 'SW-R1-T04';
update matches set team_a_id = (select id from teams where code = 'T09'), team_b_id = (select id from teams where code = 'T10') where id = 'SW-R1-T05';

insert into schedule_items (wave, start_time, end_time, mins, phase, match_id, title, format, warmup, officials, sort) values
  ('W01', '03:30 PM', '03:45 PM', 15, 'Swiss Round 1', 'SW-R1-T01', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 02 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 1),
  ('W02', '03:45 PM', '04:00 PM', 15, 'Swiss Round 1', 'SW-R1-T02', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 03 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 2),
  ('W03', '04:00 PM', '04:15 PM', 15, 'Swiss Round 1', 'SW-R1-T03', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 04 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 3),
  ('W04', '04:15 PM', '04:30 PM', 15, 'Swiss Round 1', 'SW-R1-T04', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 05 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 4),
  ('W05', '04:30 PM', '04:45 PM', 15, 'Swiss Round 1', 'SW-R1-T05', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 06 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 5),
  ('W06', '04:45 PM', '05:00 PM', 15, 'Swiss Round 2', 'SW-R2-T06', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 07 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 6),
  ('W07', '05:00 PM', '05:15 PM', 15, 'Swiss Round 2', 'SW-R2-T07', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 08 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 7),
  ('W08', '05:15 PM', '05:30 PM', 15, 'Swiss Round 2', 'SW-R2-T08', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 09 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 8),
  ('W09', '05:30 PM', '05:45 PM', 15, 'Swiss Round 2', 'SW-R2-T09', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 10 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 9),
  ('W10', '05:45 PM', '06:00 PM', 15, 'Swiss Round 2', 'SW-R2-T10', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 11 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 10),
  ('W11', '06:00 PM', '06:15 PM', 15, 'Swiss Round 3', 'SW-R3-T11', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 12 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 11),
  ('W12', '06:15 PM', '06:30 PM', 15, 'Swiss Round 3', 'SW-R3-T12', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 13 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 12),
  ('W13', '06:30 PM', '06:45 PM', 15, 'Swiss Round 3', 'SW-R3-T13', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 14 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 13),
  ('W14', '06:45 PM', '07:00 PM', 15, 'Swiss Round 3', 'SW-R3-T14', null, '3 Parallel Sets (15 pts, Cap 17)', 'Wave 15 teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 14),
  ('W15', '07:00 PM', '07:15 PM', 15, 'Swiss Round 3', 'SW-R3-T15', null, '3 Parallel Sets (15 pts, Cap 17)', 'Break / cool-down', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 15),
  ('BREAK', '07:15 PM', '08:00 PM', 45, 'Mid-Event Break', null, 'Dinner / Refreshments & Top-4 Seed Verification', 'No Matches', 'Open / Rest', 'Organizers', 16),
  ('W16', '08:00 PM', '08:20 PM', 20, 'IPL Playoffs', 'PL-Q1', null, 'Qualifier 1 — 3 Sets (15 pts, Cap 17)', 'Eliminator teams warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 17),
  ('W17', '08:20 PM', '08:40 PM', 20, 'IPL Playoffs', 'PL-EL', null, 'Eliminator — 3 Sets (15 pts, Cap 17)', 'Q1 Loser cool-down', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 18),
  ('W18', '08:40 PM', '09:05 PM', 25, 'IPL Playoffs', 'PL-Q2', null, 'Qualifier 2 — 3 Sets (21 pts, Cap 23)', 'Q1 Winner light warm-up', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 19),
  ('BUFF', '09:05 PM', '09:20 PM', 15, 'Buffer / Rest', null, 'Overrun Buffer + Rest for Qualifier 2 Winner', 'Court Reset', 'Finalists warm-up', 'Organizers', 20),
  ('W19', '09:20 PM', '09:45 PM', 25, 'Grand Final', 'PL-GF', null, 'Grand Final — 3 Sets (21 pts, Cap 23)', 'Trophy desk prep', 'Ct1: ___ | Ct2: ___ | Ct3: ___', 21),
  ('END', '09:45 PM', '10:00 PM', 15, 'Closing', null, 'Trophy Celebration, Group Photos & Wrap-up', 'Awards Ceremony', 'Pack-up', 'All Teams', 22);
