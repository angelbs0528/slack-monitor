import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { slackClient, getUserName, getChannelInfo, sendRealtimeDM } from '@/lib/slack';
import { storeMention, getWorkspace, getUserPreference } from '@/lib/store';

function verifySlackSignature(rawBody, headers) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = headers.get('x-slack-request-timestamp');
  const slackSig = headers.get('x-slack-signature');
  if (!timestamp || !slackSig) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const sigBase = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex');
  const computed = `v0=${hmac}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(slackSig));
  } catch { return false; }
}

function extractMentions(text = '') {
  const pattern = /<@([A-Z0-9]+)>/g;
  const ids = new Set();
  let match;
  while ((match = pattern.exec(text)) !== null) ids.add(match[1]);
  return [...ids];
}

export async function POST(request) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  // Handle Slack URL verification challenge first
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (!verifySlackSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 401 });
  }

  if (payload.type === 'event_callback') {
    const event = payload.event;
    const teamId = payload.team_id;

    if (event.bot_id || event.subtype === 'bot_message' || event.subtype || event.type !== 'message') {
      return NextResponse.json({ ok: true });
    }

    const mentionedUserIds = extractMentions(event.text);
    if (!mentionedUserIds.length) {
      return NextResponse.json({ ok: true });
    }

    const workspace = await getWorkspace(teamId);
    if (!workspace) {
      console.error(`[events] No workspace token found for team ${teamId}`);
      return NextResponse.json({ ok: true });
    }

    const client = slackClient(workspace.botToken);
    const [senderName, channelInfo] = await Promise.all([
      getUserName(client, event.user),
      getChannelInfo(client, event.channel),
    ]);

    const defaultMode = process.env.DIGEST_MODE || 'daily';

    await Promise.all(mentionedUserIds.map(async (userId) => {
      if (userId === event.user) return;
      const mention = {
        userId, senderName, senderId: event.user,
        channel: channelInfo.name, channelId: event.channel,
        isPrivate: channelInfo.isPrivate, text: event.text,
        ts: event.ts, timestamp: Date.now(),
      };
      const prefs = await getUserPreference(teamId, userId);
      const mode = prefs?.mode || defaultMode;
      if (mode === 'realtime') {
        await sendRealtimeDM(client, userId, mention);
      } else {
        await storeMention(teamId, userId, mention);
      }
    }));
  }

  return NextResponse.json({ ok: true });
}
