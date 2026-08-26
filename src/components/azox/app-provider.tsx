import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePoints } from "@/hooks/usePoints";
import { useTasks } from "@/hooks/useTasks";
import { useUser, type AzoxUser } from "@/hooks/useUser";
import type { DbUser } from "@/lib/azox-backend";
import { useBoxAlert } from "@/hooks/useBoxAlert";
import type { Rank } from "@/lib/azox-data";

type AzoxState = {
  user: AzoxUser;
  dbUser: DbUser | null;
  points: number;
  rank: Rank;
  nextRank: Rank | null;
  progress: number;
  level: number;
  addPoints: (n: number) => void;
  tap: (fingers?: number) => number;
  completedTasks: Set<string>;
  completeTask: (id: string, fallbackPoints?: number, taskReward?: number) => void;
  dailyClaimed: boolean;
  claimDaily: () => void;
  globalWins: number;
  referrals: number;
  isBoxOpen: boolean;
  boxSecondsRemaining: number;
  boxAlreadyOpened: boolean;
};

const AzoxContext = createContext<AzoxState | null>(null);

export function AzoxProvider({ children }: { children: ReactNode }) {
  const { user, dbUser } = useUser();
  const {
    points,
    rank,
    nextRank,
    progress,
    level,
    addPoints,
    tap,
    globalWins,
  } = usePoints();
  const { completedTasks, completeTask, dailyClaimed, claimDaily } =
    useTasks(addPoints);
  const boxAlert = useBoxAlert();

  const value = useMemo<AzoxState>(
    () => ({
      user,
      dbUser,
      points,
      rank,
      nextRank,
      progress,
      level,
      addPoints,
      tap,
      completedTasks,
      completeTask,
      dailyClaimed,
      claimDaily,
      globalWins,
      referrals: dbUser?.referral_count ?? 0,
      isBoxOpen: boxAlert.isBoxOpen,
      boxSecondsRemaining: boxAlert.secondsRemaining,
      boxAlreadyOpened: boxAlert.alreadyOpened,
    }),
    [
      user,
      dbUser,
      points,
      rank,
      nextRank,
      progress,
      level,
      addPoints,
      tap,
      completedTasks,
      completeTask,
      dailyClaimed,
      claimDaily,
      globalWins,
      boxAlert,
    ],
  );

  return <AzoxContext.Provider value={value}>{children}</AzoxContext.Provider>;
}

export function useAzox() {
  const ctx = useContext(AzoxContext);
  if (!ctx) throw new Error("useAzox must be used within AzoxProvider");
  return ctx;
}
