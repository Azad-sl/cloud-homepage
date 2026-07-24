import { NextResponse } from "next/server";
import { pingRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const redis = await pingRedis();
  // Tell the client whether a password gate is active (without exposing the password).
  const authRequired = !!process.env.ADMIN_PASSWORD;
  return NextResponse.json({ ...redis, authRequired });
}
