import { useEffect, useState } from "react";
import {
  displayName,
  fetchLeaderboard,
  type LeaderboardRow,
} from "@/lib/azox-backend";
import { rankForPoints, type RankKey } from "@/lib/azox-data";
import { RANK_ORDER } from "@/hooks/useLeaderboard";

export type LivePlayer = {
  name: string;
  points: number;
  tasks: number;
  referrals: number;
  rank: RankKey;
};

function toPlayer(row: LeaderboardRow): LivePlayer {
  const rank = (RANK_ORDER.includes(row.rank as RankKey)
    ? (row.rank as RankKey)
    : rankForPoints(row.points ?? 0).key) as RankKey;
  return {
    name: displayName(row),
    points: row.points ?? 0,
    tasks: row.tasks_done ?? 0,
    referrals: row.referral_count ?? 0,
    rank,
  };
}

/** Real leaderboard rows from the backend, grouped by rank. */
export function useSupabaseLeaderboard() {
  const [players, setPlayers] = useState<LivePlayer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboard("points", 200).then((rows) => {
      if (cancelled) return;
      setPlayers(rows.length ? rows.map(toPlayer) : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byRank = (key: RankKey) =>
    (players ?? [])
      .filter((p) => p.rank === key)
      .sort((a, b) => b.points - a.points)
      .map((p, i) => ({ ...p, position: i + 1 }));

  const byTasks = () =>
    [...(players ?? [])].sort((a, b) => b.tasks - a.tasks).slice(0, 50);

  const byReferrals = () =>
    [...(players ?? [])].sort((a, b) => b.referrals - a.referrals).slice(0, 50);

  return { players, byRank, byTasks, byReferrals, hasData: !!players?.length };
}
