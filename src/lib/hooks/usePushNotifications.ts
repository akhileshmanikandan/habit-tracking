"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePushNotifications(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!("PushManager" in window)) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return;

    async function registerPush() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return;

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!).buffer as ArrayBuffer,
          });
        }

        // Save subscription to Supabase
        const keys = subscription.toJSON().keys;
        if (!keys?.p256dh || !keys?.auth) return;

        const supabase = createClient();
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
          { onConflict: "user_id,endpoint" }
        );
      } catch (err) {
        console.error("Push registration failed:", err);
      }
    }

    registerPush();
  }, [userId]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
