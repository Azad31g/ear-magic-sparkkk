import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SOCIAL_TASKS,
  type SocialTask,
  type SocialTaskGroup,
} from "@/lib/azox-data";

/** Supabase platform value -> display platform name used by the UI. */
export const PLATFORM_LABELS: Record<string, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
  youtube: "YouTube",
  discord: "Discord",
};

type TaskRow = {
  id: string;
  platform: string;
  title: string;
  url: string;
  points: number;
  status: string;
  sort_order: number;
};

/** Brand colors already defined for each platform in the static data. */
function groupMeta(label: string) {
  const existing = SOCIAL_TASKS.find((g) => g.platform === label);
  return {
    color: existing?.color ?? "#a3e635",
    ...(existing?.accent ? { accent: existing.accent } : {}),
  };
}

/** Telegram public group username, used for membership verification. */
function telegramChat(url: string): string | undefined {
  const m = url.match(/t\.me\/([A-Za-z0-9_]+)/);
  return m?.[1];
}

export function useSupabaseTasks() {
  const [groups, setGroups] = useState<SocialTaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error: err } = await supabase
        .from("tasks")
        .select("id, platform, title, url, points, status, sort_order")
        .eq("status", "active")
        .order("platform", { ascending: true })
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setGroups([]);
        setLoading(false);
        return;
      }

      const byPlatform = new Map<string, SocialTask[]>();
      for (const row of (data ?? []) as TaskRow[]) {
        const label = PLATFORM_LABELS[row.platform] ?? row.platform;
        const chat = telegramChat(row.url);
        const task: SocialTask = {
          id: row.id,
          platform: label,
          label: row.title,
          points: row.points,
          url: row.url,
          ...(row.platform === "telegram" && chat ? { verifyChat: chat } : {}),
        };
        const list = byPlatform.get(label) ?? [];
        list.push(task);
        byPlatform.set(label, list);
      }

      setGroups(
        [...byPlatform.entries()].map(([platform, tasks]) => ({
          platform,
          ...groupMeta(platform),
          tasks,
        })),
      );
      setError(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { groups, loading, error };
}
