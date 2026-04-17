import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import webpush from "web-push";

export async function GET(req: Request) {
  // Vercel automatically passes Authorization: Bearer <CRON_SECRET> for cron requests
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const missing = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "BLOB_READ_WRITE_TOKEN"].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    return NextResponse.json({ error: `Missing env vars: ${missing.join(", ")}` }, { status: 503 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  // Read stored subscription
  const { blobs } = await list({ prefix: "push-subscription", token: process.env.BLOB_READ_WRITE_TOKEN! });
  if (!blobs.length) {
    return NextResponse.json({ sent: 0, reason: "No subscriptions found" });
  }

  const res = await fetch(blobs[0].url);
  const subscription = await res.json();

  const now = new Date();
  const monthName = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title: "Finance Reminder",
      body: `Check unpaid expenses & savings for ${monthName}.`,
      url: "/dashboard",
    })
  );

  return NextResponse.json({ sent: 1 });
}
