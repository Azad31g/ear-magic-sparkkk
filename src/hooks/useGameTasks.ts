import { useCallback } from "react";
import { readStorage, writeStorage } from "@/lib/points";

const STORAGE_KEY = "azox_game_tasks";
const STREAK_KEY = "azox_daily_streak";

type GameTasksState = {
  tasksDone: number;
  completedOnce: string[];
  worldBestScores: Record<string, number>;
};

type StreakState = {
  dates: string[];
};

function loadState(): GameTasksState {
  return readStorage<GameTasksState>(STORAGE_KEY, {
    tasksDone: 0,
    completedOnce: [],
    worldBestScores: {},
  });
}

function saveState(s: GameTasksState) {
  writeStorage(STORAGE_KEY, s);
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
    return 2;
  }, []);

  // AZOX Box — +1 Task when box opened successfully
  const onBoxOpen = useCallback(() => {
    const state = loadState();
    state.tasksDone += 1;
    saveState(state);
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
    return 2;
  }, []);

  // Global Button — +1 Task each time successfully pressed
  const onGlobalButtonWin = useCallback(() => {
    const state = loadState();
    state.tasksDone += 1;
    saveState(state);
    return 1;
  }, []);

  // Shoot / Snake / TakBom — +10 Tasks on new WORLD best score
  const onNewGlobalBest = useCallback((gameId: string, newScore: number) => {
    const state = loadState();
    const currentWorldBest = state.worldBestScores[gameId] ?? 0;
    if (newScore <= currentWorldBest) return 0;
    state.worldBestScores[gameId] = newScore;
    state.tasksDone += 10;
    saveState(state);
    return 10;
  }, []);

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
    return tasksEarned;
  }, []);

  const getGameTasksDone = useCallback(() => loadState().tasksDone, []);
  const getGlobalBest = useCallback(
    (gameId: string) => loadState().worldBestScores[gameId] ?? 0,
    [],
  );
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
    getGlobalBest,
    getStreak,
  };
}
