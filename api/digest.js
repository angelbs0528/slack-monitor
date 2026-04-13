import { getAllWorkspaces, getUsersWithPendingMentions, getAndClearMentions } from '../lib/store.js';
import { slackClient, sendDigestDM } from '../lib/slack.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const workspaces = await getAllWorkspaces();
  if (!workspaces.length) {
    console.log('[digest] No installed workspaces.');
    return res.status(200).json({ ok: true, sent: 0 });
  }

  let sent = 0;
  let errors = 0;

  await Promise.all(workspaces.map(async (workspace) => {
    const { teamId, teamName, botToken } = workspace;
    const client = slackClient(botToken);
    const userIds = await getUsersWithPendingMentions(teamId);

    await Promise.all(userIds.map(async (userId) => {
      try {
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

  return res.status(200).json({ ok: true, sent, errors });
}
