import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readStorage, writeStorage } from "@/lib/points";
import { getTelegramUser } from "@/lib/telegram";

const STORAGE_KEY = "azox_game_tasks";
const STREAK_KEY = "azox_daily_streak";

type GameTasksState = {
  tasksDone: number;
  completedOnce: string[];
};

type StreakState = {
  dates: string[];
};

function loadState(): GameTasksState {
  const raw = readStorage<Partial<GameTasksState>>(STORAGE_KEY, {});
  return {
    tasksDone: typeof raw?.tasksDone === "number" ? raw.tasksDone : 0,
    completedOnce: Array.isArray(raw?.completedOnce) ? raw.completedOnce : [],
  };
}

function saveState(s: GameTasksState) {
  writeStorage(STORAGE_KEY, s);
}

function syncTasksDone(tasksDone: number) {
  const tgUser = getTelegramUser();
  if (tgUser?.id) {
    void supabase
      .from("users")
      .update({ tasks_done: tasksDone })
      .eq("telegram_id", tgUser.id);
  }
}

export function useGameTasks() {
  // AZOX Word — +2 Tasks when ALL 5 words answered correctly
  const onWordComplete = useCallback((allCorrect: boolean) => {
    if (!allCorrect) return 0;
    const state = loadState();
    const today = new Date().toISOString().split("T")[0];
    const key = `game-word-complete-${today}`;
    if (state.completedOnce.includes(key)) return 0;
    state.completedOnce.push(key);
    state.tasksDone += 2;
    saveState(state);
    syncTasksDone(state.tasksDone);
    return 2;
  }, []);

  // AZOX Box — +1 Task when box opened successfully
  const onBoxOpen = useCallback(() => {
    const state = loadState();
    state.tasksDone += 1;
    saveState(state);
    syncTasksDone(state.tasksDone);
    return 1;
  }, []);

  // Question Day — +2 Tasks when ALL questions answered correctly
  const onQuestionComplete = useCallback((allCorrect: boolean) => {
    if (!allCorrect) return 0;
    const state = loadState();
    const today = new Date().toISOString().split("T")[0];
    const key = `game-question-complete-${today}`;
    if (state.completedOnce.includes(key)) return 0;
    state.completedOnce.push(key);
    state.tasksDone += 2;
    saveState(state);
    syncTasksDone(state.tasksDone);
    return 2;
  }, []);

  // Global Button — +1 Task each time successfully pressed
  const onGlobalButtonWin = useCallback(() => {
    const state = loadState();
    state.tasksDone += 1;
    saveState(state);
    syncTasksDone(state.tasksDone);
    return 1;
  }, []);

  // Shoot / Snake / TakBom — +10 Tasks on new global best score
  const onNewGlobalBest = useCallback(
    async (gameId: string, newScore: number): Promise<number> => {
      if (newScore <= 0) return 0;

      // Get global best from Supabase
      const { data } = await supabase
        .from("game_scores")
        .select("score")
        .eq("game_id", gameId)
        .order("score", { ascending: false })
        .limit(1)
        .single();

      const globalBest = data?.score ?? 0;

      // Only award if beats global best
      if (newScore <= globalBest) return 0;

      // New global best! Update Supabase and award tasks
      const tgUser = getTelegramUser();
      if (tgUser?.id) {
        await supabase.from("game_scores").upsert(
          {
            telegram_id: tgUser.id,
            game_id: gameId,
            score: newScore,
            is_best: true,
          },
          { onConflict: "telegram_id,game_id" },
        );
      }

      // Award +10 tasks
      const state = loadState();
      state.tasksDone += 10;
      saveState(state);
      syncTasksDone(state.tasksDone);

      return 10;
    },
    [],
  );

  // Daily Gift streak — +3 Tasks every 5 consecutive days
  const onDailyGiftClaimed = useCallback(() => {
    const state = loadState();
    const streak = readStorage<StreakState>(STREAK_KEY, { dates: [] });
    const today = new Date().toISOString().split("T")[0] as string;

    if (!streak.dates.includes(today)) {
      streak.dates.push(today);
      if (streak.dates.length > 10) streak.dates = streak.dates.slice(-10);
    }

    let tasksEarned = 0;
    if (streak.dates.length >= 5) {
      const last5 = [...streak.dates].sort().slice(-5);
      let consecutive = true;
      for (let i = 1; i < last5.length; i++) {
        const diff =
          (new Date(last5[i]!).getTime() - new Date(last5[i - 1]!).getTime()) /
          86_400_000;
        if (diff !== 1) {
          consecutive = false;
          break;
        }
      }
      if (consecutive) {
        tasksEarned = 3;
        state.tasksDone += 3;
        streak.dates = [];
      }
    }

    writeStorage(STREAK_KEY, streak);
    saveState(state);
    if (tasksEarned > 0) syncTasksDone(state.tasksDone);
    return tasksEarned;
  }, []);

  const getGameTasksDone = useCallback(() => loadState().tasksDone, []);
  const getStreak = useCallback(
    () => readStorage<StreakState>(STREAK_KEY, { dates: [] }).dates.length,
    [],
  );

  return {
    onWordComplete,
    onBoxOpen,
    onQuestionComplete,
    onGlobalButtonWin,
    onNewGlobalBest,
    onDailyGiftClaimed,
    getGameTasksDone,
    getStreak,
  };
}
