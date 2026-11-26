"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// One realtime channel for the core tables, shared by every page, so moving
// between pages is instant and every view stays live without reloads.
// Flow: load all → subscribe to postgres_changes → patch rows in place.
// Re-loads on reconnect, when the tab becomes visible, and when back online,
// so a phone woken from sleep is never stale.

const TABLES = {
  teams: { pk: "id", order: "sort" },
  players: { pk: "id", order: "sort" },
  matches: { pk: "id", order: "sort" },
  settings: { pk: "key", order: "sort" },
  activity_log: { pk: "id", order: "created_at", desc: true, limit: 40 },
  schedule_items: { pk: "id", order: "sort" },
  rules: { pk: "id", order: "sort" },
  chat_messages: { pk: "id", order: "created_at", desc: true, limit: 150, keep: (r) => r.pinned_at },
  // optional: until the chat migration is run, this just stays empty
  chat_reactions: { pk: "id", order: "created_at", limit: 5000, optional: true },
};

const CHAT_SEEN_KEY = "pb_chat_seen";

const LiveDataContext = createContext(null);

function sortRows(table, rows) {
  const { order, desc, limit, keep } = TABLES[table];
  const sorted = [...rows].sort((a, b) => {
    const x = a[order];
    const y = b[order];
    const cmp = x < y ? -1 : x > y ? 1 : 0;
    return desc ? -cmp : cmp;
  });
  if (!limit) return sorted;
  // rows past the limit survive if `keep` says so (pinned chat messages)
  return sorted.filter((r, i) => i < limit || keep?.(r));
}

function upsert(table, rows, incoming) {
  const pk = TABLES[table].pk;
  const map = new Map(rows.map((r) => [r[pk], r]));
  for (const row of incoming) map.set(row[pk], { ...map.get(row[pk]), ...row });
  return sortRows(table, [...map.values()]);
}

const empty = Object.fromEntries(Object.keys(TABLES).map((t) => [t, []]));

export function LiveDataProvider({ children }) {
  const [data, setData] = useState(empty);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState("connecting"); // connecting | live | offline
  const [error, setError] = useState(null);
  // Chat unread badge: timestamp of the newest message this device has seen.
  const [chatSeenAt, setChatSeenAt] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(CHAT_SEEN_KEY) ?? ""
  );

  const loadAll = useCallback(async () => {
    const sb = getBrowserSupabase();
    try {
      const results = await Promise.all(
        Object.entries(TABLES).map(async ([table, cfg]) => {
          let q = sb.from(table).select("*").order(cfg.order, { ascending: !cfg.desc });
          if (cfg.limit) q = q.limit(cfg.limit);
          const { data: rows, error: err } = await q;
          if (err) {
            if (cfg.optional) return [table, []];
            throw err;
          }
          if (table === "chat_messages") {
            // pinned messages can be older than the newest 150
            const { data: pinned } = await sb.from(table).select("*").not("pinned_at", "is", null);
            if (pinned?.length) return [table, upsert(table, rows, pinned)];
          }
          return [table, rows];
        })
      );
      setData(Object.fromEntries(results));
      setError(null);
    } catch (e) {
      setError(e.message || "Could not load data");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const sb = getBrowserSupabase();
    let joinedBefore = false;

    // Initial load (async — state is set after the fetch resolves).
    const first = setTimeout(loadAll, 0);

    const onChange = (table) => (payload) => {
        setData((prev) => {
          const pk = TABLES[table].pk;
          if (payload.eventType === "DELETE") {
            return { ...prev, [table]: prev[table].filter((r) => r[pk] !== payload.old[pk]) };
          }
          return { ...prev, [table]: upsert(table, prev[table], [payload.new]) };
        });
      };

    let channel = sb.channel("live-db");
    for (const [table, cfg] of Object.entries(TABLES)) {
      if (!cfg.optional) channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange(table));
    }
    // Optional tables get their own channel: if one isn't set up yet, it
    // can't take the core live updates down with it.
    let extra = sb.channel("live-db-extra");
    for (const [table, cfg] of Object.entries(TABLES)) {
      if (cfg.optional) extra = extra.on("postgres_changes", { event: "*", schema: "public", table }, onChange(table));
    }
    extra.subscribe();
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnection("live");
        if (joinedBefore) loadAll(); // catch up on anything missed while disconnected
        joinedBefore = true;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnection("offline");
      }
    });

    const onVisible = () => document.visibilityState === "visible" && loadAll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", loadAll);

    return () => {
      clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", loadAll);
      sb.removeChannel(channel);
      sb.removeChannel(extra);
    };
  }, [loadAll]);

  /** Apply rows returned by our API immediately (realtime echo is harmless). */
  const applyRows = useCallback((table, rows) => {
    const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
    if (list.length) setData((prev) => ({ ...prev, [table]: upsert(table, prev[table], list) }));
  }, []);

  const removeRow = useCallback((table, id) => {
    const pk = TABLES[table].pk;
    setData((prev) => ({ ...prev, [table]: prev[table].filter((r) => r[pk] !== id) }));
  }, []);

  const markChatSeen = useCallback((iso) => {
    if (!iso) return;
    setChatSeenAt((prev) => {
      if (iso <= prev) return prev;
      localStorage.setItem(CHAT_SEEN_KEY, iso);
      return iso;
    });
  }, []);

  const value = useMemo(() => {
    const teamsById = new Map(data.teams.map((t) => [t.id, t]));
    const settings = Object.fromEntries(data.settings.map((s) => [s.key, s.value]));
    const playersByTeam = new Map();
    for (const p of data.players) {
      if (!playersByTeam.has(p.team_id)) playersByTeam.set(p.team_id, []);
      playersByTeam.get(p.team_id).push(p);
    }
    const reactionsByMessage = new Map();
    for (const x of data.chat_reactions) {
      if (!reactionsByMessage.has(x.message_id)) reactionsByMessage.set(x.message_id, []);
      reactionsByMessage.get(x.message_id).push(x);
    }
    const unreadChat = data.chat_messages.filter((m) => m.created_at > chatSeenAt).length;
    return {
      ...data,
      teamsById,
      playersByTeam,
      playersById: new Map(data.players.map((p) => [p.id, p])),
      settingsMap: settings,
      reactionsByMessage,
      unreadChat: chatSeenAt ? unreadChat : 0, // first visit: no badge for old history
      markChatSeen,
      loaded,
      connection,
      error,
      applyRows,
      removeRow,
      reload: loadAll,
    };
  }, [data, loaded, connection, error, applyRows, removeRow, loadAll, chatSeenAt, markChatSeen]);

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useLiveData() {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error("useLiveData must be used inside <LiveDataProvider>");
  return ctx;
}
