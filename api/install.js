/**
 * GET /api/install
 * Redirects users to Slack's OAuth authorization screen.
 * This is the entry point for the "Add to Slack" flow.
 */
export default function handler(req, res) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const appUrl = process.env.APP_URL;

  if (!clientId || !appUrl) {
    return res.status(500).send('SLACK_CLIENT_ID or APP_URL is not configured.');
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
    'chat:write',
    'im:write',
  ].join(',');

  const redirectUri = encodeURIComponent(`${appUrl}/api/oauth/callback`);
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;

  res.redirect(url);
}
