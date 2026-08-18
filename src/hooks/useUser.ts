import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/points";
import { initTelegram, type TelegramUser } from "@/lib/telegram";

export type AzoxUser = {
  id: string;
  name: string;
  username: string;
  initials: string;
  photoUrl: string | null;
  isTelegram: boolean;
  joinedAt: string;
  referralLink: string;
};

const GUEST: AzoxUser = {
  id: "guest",
  name: "AZOX Player",
  username: "azox_player",
  initials: "AZ",
  photoUrl: null,
  isTelegram: false,
  joinedAt: new Date().toISOString().slice(0, 10),
  referralLink: "https://t.me/AZOX_bot?start=azox_player",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AZ";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function fromTelegram(tg: TelegramUser, joinedAt: string): AzoxUser {
  const name =
    [tg.first_name, tg.last_name].filter(Boolean).join(" ") ||
    tg.username ||
    "AZOX Player";
  const username = tg.username ?? `azox_${tg.id}`;
  return {
    id: String(tg.id),
    name,
    username,
    initials: initialsOf(name),
    photoUrl: tg.photo_url ?? null,
    isTelegram: true,
    joinedAt,
    referralLink: `https://t.me/AZOX_bot?start=${username}`,
  };
}

export function useUser() {
  const [user, setUser] = useState<AzoxUser>(GUEST);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStorage<AzoxUser | null>(STORAGE_KEYS.user, null);
    const joinedAt = stored?.joinedAt ?? new Date().toISOString().slice(0, 10);
    const tg = initTelegram();
    const next = tg ? fromTelegram(tg, joinedAt) : (stored ?? { ...GUEST, joinedAt });
    setUser(next);
    writeStorage(STORAGE_KEYS.user, next);
    setReady(true);
  }, []);

  const updateUser = useCallback((patch: Partial<AzoxUser>) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      writeStorage(STORAGE_KEYS.user, next);
      return next;
    });
  }, []);

  return { user, ready, updateUser };
}
