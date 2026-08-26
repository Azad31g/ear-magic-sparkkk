import { useEffect, useState } from "react";
import {
  Gift,
  Send,
  Twitter,
  Instagram,
  Music2,
  Youtube,
  MessagesSquare,
  ExternalLink,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useAzox } from "@/components/azox/app-provider";
import { useGameTasks } from "@/hooks/useGameTasks";
import { useSupabaseTasks } from "@/hooks/useSupabaseTasks";
import { verifyTelegramMembership } from "@/lib/telegram-verify.functions";
import { type SocialTask, type SocialTaskGroup } from "@/lib/azox-data";
import { AzoxFooter } from "@/components/azox/footer";
import { cn } from "@/lib/utils";

function ThreadsIcon(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 192 192"
        width="20"
        height="20"
        fill="white"
      >
        <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.204.195 97.07 0h-.113C68.882.195 47.292 9.643 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.068c.224 28.617 6.882 51.447 19.788 67.852C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553Z" />
      </svg>
    </div>
  );
}

const PLATFORM_ICONS: Record<string, typeof Send> = {
  Telegram: Send,
  "X (Twitter)": Twitter,
  Instagram: Instagram,
  TikTok: Music2,
  Threads: ThreadsIcon as unknown as typeof Send,
  YouTube: Youtube,
  Discord: MessagesSquare,
};

const TASK_ORDER = [
  "telegram",
  "instagram",
  "tiktok",
  "threads",
  "x",
  "youtube",
  "discord",
];

const PLATFORM_KEY: Record<string, string> = {
  Telegram: "telegram",
  Instagram: "instagram",
  TikTok: "tiktok",
  Threads: "threads",
  "X (Twitter)": "x",
  YouTube: "youtube",
  Discord: "discord",
};

const SECTION_STYLES: Record<
  string,
  { color: string; textColor: string; label: string }
> = {
  threads: { color: "#000000", textColor: "#FFFFFF", label: "Threads" },
};


function TaskRow({ task, color }: { task: SocialTask; color: string }) {
  const { completedTasks, completeTask, user } = useAzox();
  const claimed = completedTasks.has(task.id);
  const [state, setState] = useState<"idle" | "claimable" | "done">("idle");
  const [verifying, setVerifying] = useState(false);
  const verify = useServerFn(verifyTelegramMembership);
  const status = claimed ? "done" : state;
  const needsVerification = Boolean(task.verifyChat);

  const handleOpen = () => {
    window.open(task.url, "_blank", "noopener,noreferrer");
    setState("claimable");
  };

  const handleClaim = () => {
    completeTask(task.id, task.points, task.taskReward ?? 0);
    setState("done");
    toast.success(`+${task.points} points added`);
  };

  const handleVerify = async () => {
    const telegramId = Number(user.id);
    if (!user.isTelegram || !Number.isFinite(telegramId)) {
      toast.error("Open the app inside Telegram to verify membership");
      return;
    }
    setVerifying(true);
    try {
      const res = await verify({
        data: { telegramId, chatUsername: task.verifyChat! },
      });
      if (res.member) {
        handleClaim();
      } else if (!res.ok && res.error === "not_configured") {
        toast.error("Membership check is not configured yet");
      } else {
        toast.error("❌ Please join the group first");
      }
    } catch {
      toast.error("Could not verify right now, try again");
    } finally {
      setVerifying(false);
    }
  };


  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.label}</p>
        <p className="text-xs font-semibold text-gold">
          +{task.points} pts{(task.taskReward ?? 0) > 0 ? ` & +${task.taskReward} Task` : ""}
        </p>
      </div>
      {status === "done" ? (
        <span className="flex items-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
          <Check className="size-4" aria-hidden="true" /> Done
        </span>
      ) : status === "claimable" ? (
        needsVerification ? (
          <Button
            size="sm"
            onClick={handleVerify}
            disabled={verifying}
            className="rounded-lg bg-[#229ED9] font-semibold text-white hover:bg-[#229ED9]/90"
          >
            {verifying ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-4" aria-hidden="true" />
            )}
            {verifying ? "Checking…" : "Check Membership"}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleClaim}
            className="rounded-lg bg-success font-semibold text-success-foreground hover:bg-success/90"
          >
            <Check className="size-4" aria-hidden="true" />
            Claim
          </Button>
        )
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpen}
          className="rounded-lg bg-transparent font-semibold"
          style={{ borderColor: color, color }}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Open
        </Button>
      )}
    </div>
  );
}

function TaskGroup({ group }: { group: SocialTaskGroup }) {
  const Icon = PLATFORM_ICONS[group.platform] ?? Send;
  const iconColor = group.accent ?? group.color;
  const sectionStyle = SECTION_STYLES[PLATFORM_KEY[group.platform] ?? group.platform.toLowerCase()];
  const textColor = sectionStyle?.textColor;

  return (
    <section className="flex flex-col gap-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border-l-4 px-3 py-2",
          !sectionStyle && "bg-secondary/30",
        )}
        style={{
          borderLeftColor: iconColor,
          ...(sectionStyle ? { backgroundColor: sectionStyle.color } : {}),
        }}
      >
        <span
          className="flex size-7 items-center justify-center rounded-lg"
          style={{
            backgroundColor: sectionStyle ? sectionStyle.color : `${iconColor}26`,
            color: textColor ?? iconColor,
          }}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <h2
          className="text-sm font-bold"
          style={{ color: textColor }}
        >
          {sectionStyle?.label ?? group.platform}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {group.tasks.map((t) => (
          <TaskRow key={t.id} task={t} color={iconColor} />
        ))}
      </div>
    </section>
  );
}

export function TaskPage() {
  const { dailyClaimed, claimDaily } = useAzox();
  const { onDailyGiftClaimed, getStreak } = useGameTasks();
  const { groups, loading, error } = useSupabaseTasks();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(getStreak());
  }, [getStreak]);

  const handleClaimDaily = () => {
    claimDaily();
    const earned = onDailyGiftClaimed();
    if (earned > 0) toast.success("🔥 5-Day Streak! +3 Tasks earned!");
    setStreak(getStreak());
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Complete tasks to earn AZOX points.
        </p>
      </div>

      {/* Daily gift */}
      <section
        className={cn(
          "glass flex items-center gap-3 rounded-2xl border border-gold/60 p-4",
          !dailyClaimed && "glow-gold",
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-gold/15">
          <Gift className="size-6 text-gold" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Daily Gift</p>
          <p className="text-xs text-muted-foreground">
            +200 points for logging in today
          </p>
          <p className="text-xs font-semibold text-gold">
            {streak === 0
              ? "Start your streak! Claim daily for 5 days"
              : `Day ${streak}/5 streak 🔥`}
          </p>
        </div>
        <Button
          onClick={handleClaimDaily}
          disabled={dailyClaimed}
          className={cn(
            "rounded-xl font-semibold",
            dailyClaimed
              ? "bg-secondary text-muted-foreground"
              : "bg-success text-success-foreground hover:bg-success/90",
          )}
        >
          {dailyClaimed ? "Claimed" : "Claim +200"}
        </Button>
      </section>

      {/* Social tasks — ordered: Telegram, Instagram, TikTok, X, YouTube, Discord */}
      {error && (
        <p style={{ color: "red", padding: 16 }}>
          Error: {error}
        </p>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2
            className="size-6 animate-spin text-primary"
            aria-hidden="true"
          />
        </div>
      ) : (
        TASK_ORDER.map((platform) => {
          const group = groups.find((g) => PLATFORM_KEY[g.platform] === platform);
          return group && group.tasks.length > 0 ? (
            <TaskGroup key={group.platform} group={group} />
          ) : null;
        })
      )}


      <AzoxFooter />
    </div>
  );
}
