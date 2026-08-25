import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Megaphone } from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";

function formatStamp(iso: string) {
  return new Date(iso)
    .toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(",", " •");
}

export function AnnouncementsPage() {
  const { announcements, markSeen } = useAnnouncements();

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="glass flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Megaphone className="size-5 text-gold" aria-hidden="true" />
          Announcements
        </h1>
      </div>

      {announcements.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          No announcements yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-border border-l-4 border-l-[#f97316] bg-card/70 p-4"
            >
              <p className="text-sm font-bold text-foreground">{a.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {a.message}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                {formatStamp(a.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
