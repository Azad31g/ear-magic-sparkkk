export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: { user?: TelegramUser; start_param?: string };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  HapticFeedback?: { impactOccurred: (style: string) => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegram(): boolean {
  return Boolean(getWebApp()?.initDataUnsafe?.user);
}

export function getTelegramUser(): TelegramUser | null {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}

export function getStartParam(): string | null {
  return getWebApp()?.initDataUnsafe?.start_param ?? null;
}

export function expandApp(): void {
  const app = getWebApp();
  if (!app) return;
  try {
    app.expand();
  } catch {
    // ignore — not running inside Telegram
  }
}

export function initTelegram(): TelegramUser | null {
  const app = getWebApp();
  console.log("[telegram] window.Telegram:", typeof window !== "undefined" ? window.Telegram : "SSR");
  console.log("[telegram] WebApp:", app);
  console.log("[telegram] initDataUnsafe:", app?.initDataUnsafe);
  console.log("[telegram] user:", app?.initDataUnsafe?.user);
  if (!app) return null;
  try {
    app.ready();
    app.expand();
    app.setBackgroundColor?.("#000000");
    app.setHeaderColor?.("#000000");
  } catch {
    // ignore
  }
  return getTelegramUser();
}

export function haptic(style = "light"): void {
  try {
    getWebApp()?.HapticFeedback?.impactOccurred(style);
  } catch {
    // ignore
  }
}
