import { Redis } from "@upstash/redis";
import {
  DEFAULT_SETTINGS,
  type ProfileSettings,
} from "./types";

/**
 * Upstash Redis client. Reads credentials from env:
 *   KV_REST_API_URL  (a.k.a UPSTASH_REDIS_REST_URL)
 *   KV_REST_API_TOKEN (a.k.a UPSTASH_REDIS_REST_TOKEN)
 *
 * If missing, returns null — callers should gracefully fall back to default settings.
 */
function createRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";

  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

let _redis: Redis | null | undefined;
export function getRedis(): Redis | null {
  if (_redis === undefined) _redis = createRedis();
  return _redis;
}

const PROFILE_KEY = "cloud-home:profile";

export async function readProfile(): Promise<{
  settings: ProfileSettings;
  source: "redis" | "default";
}> {
  const redis = getRedis();
  if (!redis) {
    return { settings: DEFAULT_SETTINGS, source: "default" };
  }
  try {
    const raw = (await redis.get<ProfileSettings>(PROFILE_KEY)) ?? null;
    if (!raw) {
      return { settings: DEFAULT_SETTINGS, source: "default" };
    }
    // Merge with defaults to be resilient to schema additions.
    const merged: ProfileSettings = {
      ...DEFAULT_SETTINGS,
      ...raw,
      links: Array.isArray(raw.links) && raw.links.length > 0 ? raw.links : DEFAULT_SETTINGS.links,
    };
    return { settings: merged, source: "redis" };
  } catch {
    return { settings: DEFAULT_SETTINGS, source: "default" };
  }
}

export async function writeProfile(settings: ProfileSettings): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis 未连接：请检查 KV_REST_API_URL / KV_REST_API_TOKEN 环境变量。");
  }
  await redis.set(PROFILE_KEY, { ...settings, updatedAt: Date.now() });
}

export async function pingRedis(): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
}> {
  const redis = getRedis();
  if (!redis) {
    return {
      connected: false,
      message: "未配置 KV_REST_API_URL / KV_REST_API_TOKEN",
    };
  }
  try {
    const t0 = Date.now();
    const res = await redis.ping();
    const dt = Date.now() - t0;
    if (res === "PONG") {
      return { connected: true, message: "OK", latencyMs: dt };
    }
    return { connected: false, message: `Unexpected response: ${res}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { connected: false, message: msg };
  }
}
