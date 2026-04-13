import { NextResponse } from 'next/server';
import { slackClient } from '@/lib/slack';
import { getAllWorkspaces } from '@/lib/store';

export const maxDuration = 60;

export async function POST(request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  return NextResponse.json({ results });
}
