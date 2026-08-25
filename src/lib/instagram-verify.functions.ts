import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const startSchema = z.object({
  telegramUserId: z.number().int().positive(),
  taskId: z.string().min(1).max(128),
});

const statusSchema = z.object({
  telegramUserId: z.number().int().positive(),
  taskId: z.string().min(1).max(128),
});

const SESSION_TTL_MINUTES = 15;

/**
 * Starts an Instagram follow-verification session for a Telegram user.
 * The browser can only create a *pending* session — it can never mark a
 * task verified. Verification happens server-side in the Meta webhook.
 */
export const startInstagramVerification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startSchema.parse(data))
  .handler(async ({ data }) => {
    const { getExternalSupabaseAdmin } = await import(
      "@/integrations/external-supabase/admin.server"
    );
    const supabase = getExternalSupabaseAdmin();

    // Already verified for this task? Nothing to do.
    const { data: existing } = await supabase
      .from("instagram_verifications")
      .select("status, instagram_username")
      .eq("telegram_user_id", data.telegramUserId)
      .eq("task_id", data.taskId)
      .eq("status", "verified")
      .maybeSingle();

    if (existing) {
      return { ok: true as const, alreadyVerified: true, sessionId: null };
    }

    const expiresAt = new Date(
      Date.now() + SESSION_TTL_MINUTES * 60_000,
    ).toISOString();

    // Expire stale sessions for this user so only one is claimable.
    await supabase
      .from("verification_sessions")
      .update({ status: "expired" })
      .eq("telegram_user_id", data.telegramUserId)
      .eq("platform", "instagram")
      .eq("status", "pending");

    const { data: session, error } = await supabase
      .from("verification_sessions")
      .insert({
        telegram_user_id: data.telegramUserId,
        task_id: data.taskId,
        platform: "instagram",
        status: "pending",
        expires_at: expiresAt,
      })
      .select("session_id, expires_at")
      .single();

    if (error) {
      console.error("[ig-verify] failed to create session", error.message);
      return { ok: false as const, error: "session_create_failed" };
    }

    return {
      ok: true as const,
      alreadyVerified: false,
      sessionId: session.session_id as string,
      expiresAt: session.expires_at as string,
      instructions: "Send any DM to @azad__x_ on Instagram to verify.",
    };
  });

/** Server-side truth for whether a Telegram user passed the Instagram task. */
export const getInstagramVerificationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data }) => {
    const { getExternalSupabaseAdmin } = await import(
      "@/integrations/external-supabase/admin.server"
    );
    const supabase = getExternalSupabaseAdmin();

    const { data: row, error } = await supabase
      .from("instagram_verifications")
      .select("status, instagram_username, verified_at, last_checked_at")
      .eq("telegram_user_id", data.telegramUserId)
      .eq("task_id", data.taskId)
      .maybeSingle();

    if (error) {
      console.error("[ig-verify] status read failed", error.message);
      return { ok: false as const, verified: false };
    }

    return {
      ok: true as const,
      verified: row?.status === "verified",
      status: row?.status ?? "none",
      instagramUsername: row?.instagram_username ?? null,
      verifiedAt: row?.verified_at ?? null,
      lastCheckedAt: row?.last_checked_at ?? null,
    };
  });
