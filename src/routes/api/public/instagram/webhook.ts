import { createFileRoute } from "@tanstack/react-router";

const GRAPH_VERSION = "v23.0";
const PROFILE_FIELDS =
  "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user";

type InstagramProfile = {
  name?: string;
  username?: string;
  profile_pic?: string;
  follower_count?: number;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
  error?: { message?: string; type?: string; code?: number };
};

async function fetchInstagramProfile(
  scopedId: string,
  accessToken: string,
): Promise<{ status: number; body: InstagramProfile }> {
  const url = `https://graph.instagram.com/${GRAPH_VERSION}/${encodeURIComponent(
    scopedId,
  )}?fields=${encodeURIComponent(PROFILE_FIELDS)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await res.json().catch(() => ({}))) as InstagramProfile;
  return { status: res.status, body };
}

export const Route = createFileRoute("/api/public/instagram/webhook")({
  server: {
    handlers: {
      // Meta webhook verification handshake
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const verifyToken = process.env["META_WEBHOOK_VERIFY_TOKEN"];
        if (!verifyToken) {
          console.error("[instagram-webhook] META_WEBHOOK_VERIFY_TOKEN is not configured");
          return new Response("Not configured", { status: 500 });
        }

        if (mode === "subscribe" && token === verifyToken && challenge) {
          return new Response(challenge, {
            status: 200,
            headers: { "content-type": "text/plain" },
          });
        }

        console.warn("[instagram-webhook] verification failed", { mode, hasChallenge: !!challenge });
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const body = payload as {
          object?: string;
          entry?: Array<{
            id?: string;
            messaging?: Array<{
              sender?: { id?: string };
              recipient?: { id?: string };
              message?: Record<string, unknown>;
            }>;
          }>;
        };

        const entry = body.entry?.[0];
        const messaging = entry?.messaging?.[0];
        const professionalAccountId = entry?.id;
        const senderId = messaging?.sender?.id;
        const recipientId = messaging?.recipient?.id;
        const message = messaging?.message;

        console.log("[instagram-webhook] event received", {
          object: body.object,
          professionalAccountId,
          senderId,
          recipientId,
          hasMessage: !!message,
        });

        // Always ACK fast so Meta does not retry.
        if (!message || !senderId) {
          return new Response("EVENT_RECEIVED", { status: 200 });
        }

        const accessToken = process.env["INSTAGRAM_ACCESS_TOKEN"];
        if (!accessToken) {
          console.error("[instagram-webhook] INSTAGRAM_ACCESS_TOKEN is not configured");
          return new Response("EVENT_RECEIVED", { status: 200 });
        }

        try {
          const { status, body: profile } = await fetchInstagramProfile(senderId, accessToken);
          if (status < 200 || status >= 300 || profile.error) {
            console.error("[instagram-webhook] profile lookup failed", {
              status,
              error: profile.error?.message ?? "unknown_error",
              senderId,
            });
          } else {
            console.log("[instagram-webhook] TEST RESULT", {
              username: profile.username,
              instagramScopedId: senderId,
              is_user_follow_business: profile.is_user_follow_business,
              is_business_follow_user: profile.is_business_follow_user,
              follower_count: profile.follower_count,
            });
          }
        } catch (error) {
          console.error("[instagram-webhook] profile request threw", error);
        }

        return new Response("EVENT_RECEIVED", { status: 200 });
      },
    },
  },
});
