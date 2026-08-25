import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS, readStorage, todayKey, writeStorage } from "@/lib/points";

export const DAILY_GIFT_POINTS = 200;

type TasksState = { completed: string[]; dailyClaimedOn: string | null };

const DEFAULT: TasksState = { completed: [], dailyClaimedOn: null };

export function useTasks(onEarn?: (amount: number) => void) {
  const [state, setState] = useState<TasksState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStorage<Partial<TasksState>>(STORAGE_KEYS.tasks, {});
    setState({
      completed: Array.isArray(stored.completed) ? stored.completed : [],
      dailyClaimedOn:
        typeof stored.dailyClaimedOn === "string" ? stored.dailyClaimedOn : null,
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.tasks, state);
  }, [state, hydrated]);

  const completedTasks = useMemo(
    () => new Set(state.completed),
    [state.completed],
  );

  const completeTask = useCallback(
    (id: string, fallbackPoints?: number) => {
      if (state.completed.includes(id)) return 0;
      const points =
        SOCIAL_TASKS.flatMap((g) => g.tasks).find((t) => t.id === id)?.points ??
        fallbackPoints ??
        0;
      setState((prev) =>
        prev.completed.includes(id)
          ? prev
          : { ...prev, completed: [...prev.completed, id] },
      );
      if (points > 0) onEarn?.(points);
      return points;
    },
    [onEarn, state.completed],
  );

  const dailyClaimed = hydrated && state.dailyClaimedOn === todayKey();

  const claimDaily = useCallback(() => {
    let claimed = false;
    setState((prev) => {
      const day = todayKey();
      if (prev.dailyClaimedOn === day) return prev;
      claimed = true;
      return { ...prev, dailyClaimedOn: day };
    });
    if (claimed) onEarn?.(DAILY_GIFT_POINTS);
    return claimed;
  }, [onEarn]);

  return {
    groups: SOCIAL_TASKS,
    completedTasks,
    completeTask,
    isCompleted: (id: string) => completedTasks.has(id),
    dailyClaimed,
    claimDaily,
    hydrated,
  };
}
