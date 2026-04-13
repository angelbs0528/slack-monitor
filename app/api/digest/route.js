import { NextResponse } from 'next/server';
import { getAllWorkspaces, getUsersWithPendingMentions, getAndClearMentions, getUserPreference } from '@/lib/store';
import { slackClient, sendDigestDM } from '@/lib/slack';

const TIMEZONE_OFFSETS = {
  'UTC': 0,
  'Pacific Time (PT)': -8,
  'Mountain Time (MT)': -7,
  'Central Time (CT)': -6,
  'Eastern Time (ET)': -5,
  'Atlantic Time (AT)': -4,
  'London (GMT/BST)': 0,
  'Central Europe (CET)': 1,
  'Eastern Europe (EET)': 2,
  'India (IST)': 5.5,
  'Singapore (SGT)': 8,
  'Japan (JST)': 9,
  'Australia Eastern (AEST)': 10,
  'New Zealand (NZST)': 12,
};

function isDigestTime(prefs, nowUTC) {
  const userTz = prefs?.timezone ?? 'UTC';
  const userHour = prefs?.digestHour ?? 9;
  const offset = TIMEZONE_OFFSETS[userTz] ?? 0;

  // Current hour in user's timezone
  const userCurrentHour = (nowUTC.getUTCHours() + offset + 24) % 24;

  // Match if we're within the same hour (handles half-hour offsets)
  return Math.floor(userCurrentHour) === userHour;
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaces = await getAllWorkspaces();
  if (!workspaces.length) {
    console.log('[digest] No installed workspaces.');
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  await Promise.all(workspaces.map(async (workspace) => {
    const { teamId, teamName, botToken } = workspace;
    const client = slackClient(botToken);
    const userIds = await getUsersWithPendingMentions(teamId);

    await Promise.all(userIds.map(async (userId) => {
      try {
        const prefs = await getUserPreference(teamId, userId);
        if (prefs?.mode === 'realtime') return;

        // Only send if it's the user's preferred digest hour
        if (!isDigestTime(prefs, now)) {
          skipped++;
          return;
        }

        const mentions = await getAndClearMentions(teamId, userId);
        if (!mentions.length) return;
        mentions.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts));
        await sendDigestDM(client, userId, mentions);
        sent++;
        console.log(`[digest] ${teamName} / ${userId} — ${mentions.length} mention(s)`);
      } catch (err) {
        errors++;
        console.error(`[digest] Failed for ${teamId}/${userId}:`, err.message);
      }
    }));
  }));

  return NextResponse.json({ ok: true, sent, skipped, errors });
}
