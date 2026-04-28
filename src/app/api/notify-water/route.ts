import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { to_user_id } = body;

  if (!to_user_id || typeof to_user_id !== "string") {
    return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
  }

  // Get sender's profile
  const { data: sender } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Use service role to read target's push subscriptions
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscriptions } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", to_user_id);

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: false, reason: "No subscriptions" });
  }

  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPrivateKey || !vapidPublicKey) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 500 }
    );
  }

  const payload = JSON.stringify({
    title: "🌧️ Your plant was watered!",
    body: `${sender?.username || "Someone"} watered your forest!`,
    tag: "water-notification",
    url: "/forest",
  });

  // Send to all subscriptions using Web Push protocol
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      return sendWebPush(pushSubscription, payload, vapidPublicKey, vapidPrivateKey);
    })
  );

  // Clean up expired subscriptions
  const expired = results
    .map((r, i) => (r.status === "rejected" ? subscriptions[i].id : null))
    .filter(Boolean);

  if (expired.length > 0) {
    await serviceClient
      .from("push_subscriptions")
      .delete()
      .in("id", expired);
  }

  return NextResponse.json({ sent: true });
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // Use the web-push compatible fetch-based approach
  const { encryptPayload, buildVapidHeaders } = await import("@/lib/utils/web-push");

  const { cipherText, salt, localPublicKey } = await encryptPayload(
    payload,
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  const headers = await buildVapidHeaders(
    subscription.endpoint,
    vapidPublicKey,
    vapidPrivateKey
  );

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body: new Blob([cipherText.buffer as ArrayBuffer]),
  });

  if (!response.ok && response.status === 410) {
    throw new Error("Subscription expired");
  }

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }
}
