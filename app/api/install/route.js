import { redirect } from 'next/navigation';

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const appUrl = process.env.APP_URL;

  if (!clientId || !appUrl) {
    return new Response('SLACK_CLIENT_ID or APP_URL is not configured.', { status: 500 });
  }

  const scopes = [
    'channels:history',
    'groups:history',
    'im:history',
    'mpim:history',
    'channels:read',
    'channels:join',
    'groups:read',
    'users:read',
    'usergroups:read',
    'chat:write',
    'im:write',
  ].join(',');

  const redirectUri = encodeURIComponent(`${appUrl}/api/oauth/callback`);
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;

  redirect(url);
}
