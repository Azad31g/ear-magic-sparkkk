import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Reads the single all-time world record row for a game. */
export function useGlobalBest(gameId: string) {
  const [globalBest, setGlobalBest] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase as any)
        .from("global_best_scores")
        .select("best_score")
        .eq("game_id", gameId)
        .maybeSingle();
      if (!cancelled) setGlobalBest(data?.best_score ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return globalBest;
}
