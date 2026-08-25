import { Coins, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAzox } from "./app-provider";
import { formatPoints } from "@/lib/azox-data";
import { AZOX_IMAGES } from "@/lib/azox-images";
import { useAnnouncements } from "@/hooks/useAnnouncements";

export function TopBar() {
  const { points, rank } = useAzox();
  const { hasNew } = useAnnouncements();


  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="glass flex size-10 items-center justify-center overflow-hidden rounded-2xl">
            <img
              src={AZOX_IMAGES.token}
              alt="AZOX token logo"
              width={40}
              height={40}
              className="size-9 object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">AZOX</p>
            <p className="text-[11px] text-muted-foreground">
              Robinhood Chain token
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold"
            style={{ color: rank.color }}
          >
            {rank.key}
          </span>
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <Coins className="size-4 text-gold" aria-hidden="true" />
            <span className="text-sm font-bold tabular-nums">
              {formatPoints(points)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
