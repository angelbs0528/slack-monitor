import { NextResponse } from 'next/server';
import { getAllWorkspaces, getUsersWithPendingMentions, getAndClearMentions, getUserPreference } from '@/lib/store';
import { slackClient, sendDigestDM } from '@/lib/slack';

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

  let sent = 0;
  let errors = 0;

  await Promise.all(workspaces.map(async (workspace) => {
    const { teamId, teamName, botToken } = workspace;
    const client = slackClient(botToken);
    const userIds = await getUsersWithPendingMentions(teamId);

    await Promise.all(userIds.map(async (userId) => {
      try {
        const prefs = await getUserPreference(teamId, userId);
        if (prefs?.mode === 'realtime') return;

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

  return NextResponse.json({ ok: true, sent, errors });
}
