import { slackClient } from '../lib/slack.js';
import { getAllWorkspaces } from '../lib/store.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const workspaces = await getAllWorkspaces();
  const results = [];

  for (const ws of workspaces) {
    const client = slackClient(ws.botToken);
    let cursor = '';
    let joined = 0;
    let already = 0;

    do {
      const list = await client.conversations.list({
        types: 'public_channel',
        exclude_archived: true,
        limit: 200,
        cursor,
      });

      const toJoin = list.channels.filter(c => !c.is_member);
      already += list.channels.length - toJoin.length;

      // Join in parallel batches of 10
      for (let i = 0; i < toJoin.length; i += 10) {
        const batch = toJoin.slice(i, i + 10);
        const settled = await Promise.allSettled(
          batch.map(c => client.conversations.join({ channel: c.id }))
        );
        joined += settled.filter(r => r.status === 'fulfilled').length;
      }

      cursor = list.response_metadata?.next_cursor || '';
    } while (cursor);

    results.push({ team: ws.teamName, joined, alreadyIn: already });
  }

  res.status(200).json({ results });
}
