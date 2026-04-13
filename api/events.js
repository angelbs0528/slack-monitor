import crypto from 'crypto';
import { slackClient, getUserName, getChannelInfo, sendRealtimeDM } from '../lib/slack.js';
import { storeMention, getWorkspace } from '../lib/store.js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifySlackSignature(rawBody, headers) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = headers['x-slack-request-timestamp'];
  const slackSig = headers['x-slack-signature'];
  if (!timestamp || !slackSig) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const sigBase = `v0:${timestamp}:${rawBody.toString()}`;
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await readRawBody(req);
  const payload = JSON.parse(rawBody.toString());

  // Handle Slack URL verification challenge first (before signature check)
  if (payload.type === 'url_verification') {
    return res.status(200).json({ challenge: payload.challenge });
  }

  if (!verifySlackSignature(rawBody, req.headers)) {
    return res.status(401).json({ error: 'Invalid Slack signature' });
  }

  if (payload.type === 'event_callback') {
    // Respond immediately — Slack requires a reply within 3 seconds
    res.status(200).json({ ok: true });

    const event = payload.event;
    const teamId = payload.team_id;

    if (event.bot_id || event.subtype === 'bot_message' || event.subtype || event.type !== 'message') return;

    const mentionedUserIds = extractMentions(event.text);
    if (!mentionedUserIds.length) return;

    // Look up this workspace's bot token
    const workspace = await getWorkspace(teamId);
    if (!workspace) {
      console.error(`[events] No workspace token found for team ${teamId}`);
      return;
    }

    const client = slackClient(workspace.botToken);

    const [senderName, channelInfo] = await Promise.all([
      getUserName(client, event.user),
      getChannelInfo(client, event.channel),
    ]);

    const isRealtime = process.env.DIGEST_MODE === 'realtime';

    await Promise.all(mentionedUserIds.map(async (userId) => {
      if (userId === event.user) return; // don't notify self-mentions
      const mention = {
        userId, senderName, senderId: event.user,
        channel: channelInfo.name, channelId: event.channel,
        isPrivate: channelInfo.isPrivate, text: event.text,
        ts: event.ts, timestamp: Date.now(),
      };
      if (isRealtime) {
        await sendRealtimeDM(client, userId, mention);
      } else {
        await storeMention(teamId, userId, mention);
      }
    }));
    return;
  }

  res.status(200).json({ ok: true });
}
