import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const MENTION_TTL = 60 * 60 * 24 * 7; // 7 days

// ─── Workspace (OAuth token) storage ──────────────────────────────────────────

export async function storeWorkspace(workspace) {
  await redis.set(`workspace:${workspace.teamId}`, JSON.stringify(workspace));
}

export async function getWorkspace(teamId) {
  const raw = await redis.get(`workspace:${teamId}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function getAllWorkspaces() {
  const keys = await redis.keys('workspace:*');
  if (!keys.length) return [];
  const records = await Promise.all(keys.map((k) => redis.get(k)));
  return records
    .filter(Boolean)
    .map((r) => (typeof r === 'string' ? JSON.parse(r) : r));
}

// ─── Mention storage (namespaced per workspace) ───────────────────────────────

export async function storeMention(teamId, userId, mention) {
  const key = `mentions:${teamId}:${userId}`;
  await redis.lpush(key, JSON.stringify(mention));
  await redis.expire(key, MENTION_TTL);
}

export async function getAndClearMentions(teamId, userId) {
  const key = `mentions:${teamId}:${userId}`;
  const pipeline = redis.pipeline();
  pipeline.lrange(key, 0, -1);
  pipeline.del(key);
  const [raw] = await pipeline.exec();
  return (raw || []).map((m) => (typeof m === 'string' ? JSON.parse(m) : m));
}

export async function getUsersWithPendingMentions(teamId) {
  const keys = await redis.keys(`mentions:${teamId}:*`);
  return keys.map((k) => k.replace(`mentions:${teamId}:`, ''));
}
