"use client";

import { useEffect } from "react";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function requestLocationPermission() {
  if (!("geolocation" in navigator)) return;

  navigator.geolocation.getCurrentPosition(
    () => undefined,
    () => undefined,
    { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
  );
}

async function registerPushDevice(invitationCode: string) {
  if (!publicVapidKey || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const registration = await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    }));

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitationCode, subscription: subscription.toJSON() }),
  });
}

export function InvitePermissions({ invitationCode }: { invitationCode: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void requestLocationPermission();
      void registerPushDevice(invitationCode).catch(() => undefined);
    }, 3300);
    const retryOnFirstTouch = () => {
      void registerPushDevice(invitationCode).catch(() => undefined);
    };

    window.addEventListener("pointerdown", retryOnFirstTouch, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", retryOnFirstTouch);
    };
  }, [invitationCode]);

  return null;
}
