import { NextResponse } from "next/server";
import { readProfile, writeProfile } from "@/lib/redis";
import { DEFAULT_SETTINGS, type ProfileSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read the admin password from server env. Never expose to client. */
function getAdminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) return null;
  return p;
}

/** Constant-time string compare to avoid timing attacks. */
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * If ADMIN_PASSWORD is configured, mutating endpoints require
 * ?token=<password> OR an X-Admin-Token header. Reads are always allowed.
 */
function checkAuth(req: Request): boolean {
  const pwd = getAdminPassword();
  if (!pwd) return true; // No password configured → open
  const url = new URL(req.url);
  const q = url.searchParams.get("token") || "";
  const h = req.headers.get("x-admin-token") || "";
  // Allow either the configured password OR an HMAC-style session token.
  // For simplicity in this single-user app, the token IS the password.
  return safeEq(q, pwd) || safeEq(h, pwd);
}

export async function GET() {
  // Reads are always public (the homepage needs them).
  const { settings, source } = await readProfile();
  // Strip any sensitive fields before returning to client (none currently).
  return NextResponse.json({
    settings,
    source,
    defaultSettings: DEFAULT_SETTINGS,
    authRequired: getAdminPassword() != null,
  });
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { ok: false, error: "未授权：管理密码错误或未提供", auth: true },
      { status: 401 }
    );
  }

  let body: Partial<ProfileSettings>;
  try {
    body = (await req.json()) as Partial<ProfileSettings>;
  } catch {
    return NextResponse.json({ ok: false, error: "无效的 JSON" }, { status: 400 });
  }

  // Light validation.
  const current = (await readProfile()).settings;
  const next: ProfileSettings = {
    ...current,
    ...body,
    updatedAt: Date.now(),
  };

  // Sanitize / clamp
  next.avatarSize = Math.max(32, Math.min(220, Number(next.avatarSize) || 80));
  next.signatureSize = Math.max(8, Math.min(48, Number(next.signatureSize) || 14));
  next.avatarPosX = Math.max(-50, Math.min(50, Number(next.avatarPosX) || 0));
  next.avatarPosY = Math.max(0, Math.min(90, Number(next.avatarPosY) || 16));
  next.signaturePosX = Math.max(-50, Math.min(50, Number(next.signaturePosX) || 0));
  next.signaturePosY = Math.max(0, Math.min(95, Number(next.signaturePosY) || 36));
  next.cloudDensity = Math.max(500, Math.min(20000, Math.round(Number(next.cloudDensity) || 8000)));
  next.cloudSpeed = Math.max(0.1, Math.min(5, Number(next.cloudSpeed) || 1));

  if (!Array.isArray(next.links)) next.links = current.links;
  if (typeof next.customSky !== "object" || next.customSky === null) {
    next.customSky = current.customSky;
  }

  // Guard: if the avatar is a data: URL (base64), reject if it's too large
  // to fit in Redis (1 MB command limit). Base64 of 450 KB ≈ 600 KB, which
  // leaves room for the rest of the profile JSON.
  if (next.avatarUrl && next.avatarUrl.startsWith("data:")) {
    const approxBytes = next.avatarUrl.length;
    if (approxBytes > 900_000) {
      return NextResponse.json(
        {
          ok: false,
          error: `头像数据过大（约 ${(approxBytes / 1024).toFixed(0)} KB），超过 Redis 存储限制。请使用小于 450 KB 的图片，或改用图床链接。`,
        },
        { status: 400 }
      );
    }
  }

  try {
    await writeProfile(next);
    return NextResponse.json({ ok: true, settings: next });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // If Redis rejects the value (too large), give a clear hint.
    if (msg.includes("value") && (msg.includes("large") || msg.includes("big"))) {
      return NextResponse.json(
        {
          ok: false,
          error: "数据过大，Redis 存储失败。头像请使用小于 450 KB 的图片或改用图床链接。",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
