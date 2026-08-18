# AZOX mini app — port to TanStack Start

Recreate the AZOX gaming mini app from `Azad31g/azox-web-app-build` in this project, 1:1 in design and behavior. The GitHub repo is public and I've read its source, so it — not a rewrite — is the reference for every screen, color, and string.

## What the repo actually contains (source of truth)

- One Next.js page with tab state: TopBar + Home / Gaming / Ranks / Tasks / Profile + BottomNav, all inside a `max-w-md` mobile column.
- `lib/azox-data.ts`: 7 ranks with thresholds, points-per-finger and colors, 8 games, social task groups (Telegram, X, Instagram), leaderboard data, `formatPoints`.
- No `games/` folder and no playable games — the grid cards are display-only. Game logos exist for 8 games (`token, video-ads, global-button, question-day, box, clicker-frenzy, snake, shoot, tak-bom, dama, xo`).
- Theme is lime-green (`--primary: #a3e635`) on pure black cards `#0c0f08`, radius `1.25rem`, plus `.glass`, `.glow-orange`, `.glow-purple`, `.glow-gold`, `.text-glow-orange` utilities and an `azox-ripple` keyframe.

Per your answers: port the repo 1:1 first (no playable game screens yet), and store points/tasks/claims in localStorage starting at 0 instead of the repo's in-memory 7,420.

## Screens

- **Home** — Global Button card with live countdown, AZOX Video Ad's card with Watch button, large circular AZOX token tap button (multi-touch: points per finger by rank, ripple animation), rank hint text, Multi-touch rewards section.
- **Gaming** — "AZOX Gaming" heading, 2-column grid of the 8 game cards with logo + name + badge, Global Leaderboard button, "By Guardex Quant LABs" footer. Cards are not yet links.
- **Ranks** — Global Ranking header, Azad Bashqali founder card (Legendary), horizontal rank tabs Legendary → Bronze, player list with points per rank.
- **Tasks** — Daily Gift +50 with Claim button, then Telegram / X / Instagram task groups each with Open + point value; claimed state persists.
- **Profile** — avatar initials, `@azox_player`, rank badge, joined date, 4 stat cards (points, rank, referrals, Global Button wins), referral link `https://t.me/AZOX_bot?start=<username>` with copy button.

## Structure

```text
src/
  styles.css                  ← AZOX tokens + glass/glow utilities + ripple keyframe
  routes/
    __root.tsx                ← AzoxProvider + TopBar + BottomNav + Outlet
    index.tsx                 ← Home
    gaming.tsx
    leaderboard.tsx           ← Ranks
    tasks.tsx
    profile.tsx
  components/azox/
    app-provider.tsx  top-bar.tsx  bottom-nav.tsx  click-button.tsx  footer.tsx
    pages/{home,gaming,leaderboard,task,profile}-page.tsx
  lib/azox-data.ts  lib/points.ts
  hooks/usePoints.ts
public/azox/                  ← game logos copied from the repo
```

## Technical notes

- Repo tab state becomes real routes; `BottomNav` uses `<Link>` with `activeProps` instead of `onChange`, so each tab gets its own URL and its own `head()` title/description/OG tags.
- `next/image` → plain `<img>`; the 11 PNGs from `public/azox/` are copied in and served as static files (or uploaded as CDN assets if size warrants).
- `AzoxProvider` keeps the same context shape (`points`, `rank`, `addPoints`, `completedTasks`, `completeTask`, `dailyClaimed`, `claimDaily`, `globalWins`, `referrals`) but hydrates from and writes to localStorage under an `azox:*` key namespace. Reads happen in an effect after mount so SSR and client markup match.
- Tailwind v4: AZOX hex values go into `:root` + `@theme inline` in `src/styles.css`; the four glow/glass utilities become `@utility` blocks. Adds `success` and `gold` tokens the current template lacks.
- shadcn `avatar`, `badge`, `button`, `card` components are added as needed; no Supabase, no backend, no Telegram SDK in this pass (localStorage only).

## Not in this pass

Playable games and `/games/$game` routes, chess / Dama / XO cards (no assets or data in the repo), Telegram WebApp SDK, real leaderboard data. Each is a clean follow-up once the shell matches.  
  
Also copy these game logo images from public/azox/ 

into the project: token.png, video-ads.png, 

global-button.png, question-day.png, box.png, 

clicker-frenzy.png, snake.png, shoot.png, tak-bom.png