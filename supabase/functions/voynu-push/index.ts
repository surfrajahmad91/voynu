import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function db(path: string, init: RequestInit = {}) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function audienceForNotification(type: string) {
  if (type.startsWith("admin_")) return "admin";
  if (type.startsWith("driver_")) return "driver";
  return "customer";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const suppliedSecret = req.headers.get("x-voynu-push-secret");
    if (!suppliedSecret) return json({ error: "Unauthorized" }, 401);

    const configResponse = await db("push_config?id=eq.default&select=public_key,private_key,subject,webhook_secret&limit=1");
    if (!configResponse.ok) return json({ error: "Push configuration unavailable" }, 503);
    const configs = await configResponse.json();
    const config = configs?.[0];
    if (!config || suppliedSecret !== config.webhook_secret) return json({ error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => ({}));
    const notificationId = payload?.notificationId;
    if (!notificationId) return json({ error: "notificationId is required" }, 400);

    const notificationResponse = await db(`notifications?id=eq.${encodeURIComponent(notificationId)}&select=id,user_id,booking_id,type,title,message,data&limit=1`);
    if (!notificationResponse.ok) return json({ error: "Notification lookup failed" }, 503);
    const notifications = await notificationResponse.json();
    const notification = notifications?.[0];
    if (!notification) return json({ ok: true, sent: 0, reason: "notification_not_found" });

    const audience = audienceForNotification(notification.type || "");
    const subscriptionsResponse = await db(`push_subscriptions?user_id=eq.${encodeURIComponent(notification.user_id)}&audience=eq.${encodeURIComponent(audience)}&select=id,endpoint,p256dh,auth,expiration_time`);
    if (!subscriptionsResponse.ok) return json({ error: "Subscription lookup failed" }, 503);
    const subscriptions = await subscriptionsResponse.json();
    if (!subscriptions?.length) return json({ ok: true, sent: 0, reason: "no_matching_subscriptions", audience });

    webpush.setVapidDetails(config.subject, config.public_key, config.private_key);
    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: `voynu-${notification.type}-${notification.id}`,
      data: { ...(notification.data || {}), notificationId: notification.id, bookingId: notification.booking_id },
    });

    let sent = 0;
    let removed = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth }, expirationTime: subscription.expiration_time ?? null },
          pushPayload
        );
        sent += 1;
      } catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db(`push_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`, { method: "DELETE" });
          removed += 1;
        } else {
          console.error("VOYNU push delivery failed", { statusCode, endpoint: subscription.endpoint?.slice(0, 60) });
        }
      }
    }

    return json({ ok: true, sent, removed, subscriptions: subscriptions.length, audience });
  } catch (error) {
    console.error("VOYNU push function error", error);
    return json({ error: "Push delivery failed" }, 500);
  }
});
