import { slackClient } from '../lib/slack.js';
import { getAllWorkspaces } from '../lib/store.js';

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

    do {
      const list = await client.conversations.list({
        types: 'public_channel',
        exclude_archived: true,
        limit: 200,
        cursor,
      });

      for (const channel of list.channels) {
        if (!channel.is_member) {
          try {
            await client.conversations.join({ channel: channel.id });
            joined++;
          } catch (e) {
            console.error(`Failed to join #${channel.name}: ${e.message}`);
          }
        }
      }

      cursor = list.response_metadata?.next_cursor || '';
    } while (cursor);

    results.push({ team: ws.teamName, joined });
  }

  res.status(200).json({ results });
}
