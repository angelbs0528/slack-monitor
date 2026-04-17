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

function extractUserMentions(text = '') {
  const pattern = /<@([A-Z0-9]+)>/g;
  const ids = new Set();
  let match;
  while ((match = pattern.exec(text)) !== null) ids.add(match[1]);
  return [...ids];
}

function extractGroupMentions(text = '') {
  const pattern = /<!subteam\^([A-Z0-9]+)(?:\|[^>]*)?>/g;
  const ids = new Set();
  let match;
  while ((match = pattern.exec(text)) !== null) ids.add(match[1]);
  return [...ids];
}

async function resolveGroupMembers(client, groupIds) {
  const userIds = new Set();
  await Promise.all(groupIds.map(async (groupId) => {
    try {
      const result = await client.usergroups.users.list({ usergroup: groupId });
      if (result.users) {
        result.users.forEach(id => userIds.add(id));
      }
    } catch (err) {
      console.error(`[events] Failed to resolve group ${groupId}: ${err.message}`);
    }
  }));
  return [...userIds];
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

    console.log(`[events] Received: type=${event.type} subtype=${event.subtype || 'none'} bot=${!!event.bot_id} team=${teamId}`);

    // Skip bot messages and non-standard message subtypes (edits, joins, etc.)
    if (event.bot_id || event.subtype) {
      return NextResponse.json({ ok: true });
    }

    const directMentions = extractUserMentions(event.text);
    const groupMentionIds = extractGroupMentions(event.text);

    if (!directMentions.length && !groupMentionIds.length) {
      return NextResponse.json({ ok: true });
    }

    const workspace = await getWorkspace(teamId);
    if (!workspace) {
      console.error(`[events] No workspace token found for team ${teamId}`);
      return NextResponse.json({ ok: true });
    }

    const client = slackClient(workspace.botToken);

    // Resolve user group members and merge with direct mentions
    const groupMembers = groupMentionIds.length ? await resolveGroupMembers(client, groupMentionIds) : [];
    let mentionedUserIds = [...new Set([...directMentions, ...groupMembers])];

    // Only notify the user who installed the bot
    if (workspace.installerUserId) {
      mentionedUserIds = mentionedUserIds.filter(id => id === workspace.installerUserId);
    }
    console.log(`[events] Mentions: ${directMentions.length} direct, ${groupMembers.length} from ${groupMentionIds.length} group(s), ${mentionedUserIds.length} will be notified`);
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
