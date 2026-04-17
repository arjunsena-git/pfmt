"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function PushSetup() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub))
    );
  }, []);

  const handleEnable = async () => {
    if (!vapidPublicKey) {
      setStatus("Push not configured. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to Vercel env vars.");
      return;
    }
    setIsBusy(true);
    setStatus("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setStatus("Permission denied — enable notifications in your browser/phone settings.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) {
        setIsSubscribed(true);
        setStatus("Reminders enabled. You'll get a notification on the 5th of each month.");
      } else {
        setStatus("Subscription saved on device but server registration failed. Check BLOB_READ_WRITE_TOKEN.");
      }
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
    setIsBusy(false);
  };

  const handleDisable = async () => {
    setIsBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
      setIsSubscribed(false);
      setStatus("Reminders disabled.");
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
    setIsBusy(false);
  };

  if (permission === "loading") return null;

  if (permission === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications are not supported on this browser. Install the app to your home screen on iOS/Android for support.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Get a push notification on the <strong>5th of each month</strong> if you have unpaid expenses or savings.
      </p>
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Button onClick={handleDisable} disabled={isBusy} variant="outline" size="sm" className="gap-2">
            <BellOff className="w-4 h-4" />
            Disable Reminders
          </Button>
        ) : (
          <Button onClick={handleEnable} disabled={isBusy} size="sm" className="gap-2">
            {isBusy ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Enable Reminders
          </Button>
        )}
        {isSubscribed && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check className="w-4 h-4" />
            Active
          </span>
        )}
      </div>
      {status && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{status}</p>
      )}
    </div>
  );
}
