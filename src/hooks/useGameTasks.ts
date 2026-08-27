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

/**
 * Total tasks_done = social tasks from user_tasks + game tasks from localStorage.
 */
async function syncGameTasksToSupabase(gameTasks: number) {
  const tgUser = getTelegramUser();
  if (!tgUser?.id) return;

  const { count: socialCount } = await (supabase as any)
    .from("user_tasks")
    .select("*", { count: "exact", head: true })
    .eq("telegram_id", tgUser.id);

  const totalTasks = (socialCount ?? 0) + gameTasks;

  await (supabase as any)
    .from("users")
    .update({ tasks_done: totalTasks })
    .eq("telegram_id", tgUser.id);
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
    void syncGameTasksToSupabase(state.tasksDone);
    return 2;
  }, []);

  // AZOX Box — +1 Task when box opened successfully
  const onBoxOpen = useCallback(() => {
    const state = loadState();
    state.tasksDone += 1;
    saveState(state);
    void syncGameTasksToSupabase(state.tasksDone);
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
    void syncGameTasksToSupabase(state.tasksDone);
    return 2;
  }, []);

  // Global Button — +1 Task each time successfully pressed
  const onGlobalButtonWin = useCallback(() => {
    const state = loadState();
    state.tasksDone += 1;
    saveState(state);
    void syncGameTasksToSupabase(state.tasksDone);
    return 1;
  }, []);

  // Shoot / Snake / TakBom — +10 Tasks on new WORLD record (all users)
  const onNewGlobalBest = useCallback(
    async (gameId: string, newScore: number): Promise<number> => {
      if (newScore <= 0) return 0;

      // The ONE global best row for this game
      const { data: globalRecord } = await (supabase as any)
        .from("global_best_scores")
        .select("best_score")
        .eq("game_id", gameId)
        .maybeSingle();

      const currentGlobalBest = globalRecord?.best_score ?? 0;
      if (newScore <= currentGlobalBest) return 0;

      const tgUser = getTelegramUser();

      await (supabase as any).from("global_best_scores").upsert(
        {
          game_id: gameId,
          best_score: newScore,
          held_by: tgUser?.id ?? null,
          held_by_name: tgUser?.first_name ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "game_id" },
      );

      // Personal score record
      if (tgUser?.id) {
        await (supabase as any).from("game_scores").upsert(
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
      void syncGameTasksToSupabase(state.tasksDone);

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
    if (tasksEarned > 0) void syncGameTasksToSupabase(state.tasksDone);
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
