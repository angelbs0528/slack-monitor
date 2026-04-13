import { WebClient } from '@slack/web-api';

/** Create a Slack client for a specific workspace token. */
export function slackClient(token) {
  return new WebClient(token);
}

export async function getUserName(client, userId) {
  try {
    const { user } = await client.users.info({ user: userId });
    return user.real_name || user.name || userId;
  } catch {
    return userId;
  }
}

export async function getChannelInfo(client, channelId) {
  try {
    const { channel } = await client.conversations.info({ channel: channelId });
    return { name: channel.name, isPrivate: channel.is_private ?? false };
  } catch {
    return { name: channelId, isPrivate: false };
  }
}

export async function openDM(client, userId) {
  const { channel } = await client.conversations.open({ users: userId });
  return channel.id;
}

export function formatTs(ts) {
  const d = new Date(parseFloat(ts) * 1000);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'UTC',
  }) + ' UTC';
}

function messageLink(channelId, ts) {
  return `https://slack.com/archives/${channelId}/p${ts.replace('.', '')}`;
}

export async function sendRealtimeDM(client, userId, mention) {
  const dmChannel = await openDM(client, userId);
  const channelLabel = mention.isPrivate ? `🔒 #${mention.channel}` : `#${mention.channel}`;
  const link = messageLink(mention.channelId, mention.ts);
  await client.chat.postMessage({
    channel: dmChannel,
    text: `You were mentioned in ${channelLabel}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*You were mentioned* in ${channelLabel} by *${mention.senderName}*` } },
      { type: 'section', text: { type: 'mrkdwn', text: `> ${mention.text.replace(/\n/g, '\n> ')}` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `🕐 ${formatTs(mention.ts)}  ·  <${link}|View message>` }] },
      { type: 'divider' },
    ],
  });
}

export async function sendDigestDM(client, userId, mentions) {
  const dmChannel = await openDM(client, userId);
  const count = mentions.length;
  const plural = count === 1 ? 'mention' : 'mentions';

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `📬 Your daily mentions digest`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `You had *${count} ${plural}* across Slack since yesterday.` } },
    { type: 'divider' },
  ];

  for (const m of mentions) {
    const channelLabel = m.isPrivate ? `🔒 #${m.channel}` : `#${m.channel}`;
    const link = messageLink(m.channelId, m.ts);
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*${m.senderName}* in ${channelLabel}\n> ${m.text.replace(/\n/g, '\n> ')}` } });
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `🕐 ${formatTs(m.ts)}  ·  <${link}|View message>` }] });
    blocks.push({ type: 'divider' });
  }

  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `Mentions bot • Next digest tomorrow at 9:00 AM UTC` }] });

  await client.chat.postMessage({
    channel: dmChannel,
    text: `Your daily mentions digest — ${count} ${plural}`,
    blocks,
  });
}
