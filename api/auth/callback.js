import { WebClient } from '@slack/web-api';

/**
 * GET /api/auth/callback
 * Slack redirects here after Sign in with Slack.
 * Exchanges code for user identity, then redirects to settings page.
 */
export default async function handler(req, res) {
  const { code, error } = req.query;
  const appUrl = process.env.APP_URL;

  if (error || !code) {
    return res.redirect(`${appUrl}/settings.html?error=signin_failed`);
  }

  try {
    const client = new WebClient();
    const result = await client.openid.connect.token({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/auth/callback`,
    });

    // Get user info from the token
    const userClient = new WebClient(result.access_token);
    const userInfo = await userClient.openid.connect.userInfo();

    const teamId = userInfo['https://slack.com/team_id'];
    const userId = userInfo['https://slack.com/user_id'];
    const name = userInfo.name || 'User';

    return res.redirect(
      `${appUrl}/settings.html?team=${teamId}&user=${userId}&name=${encodeURIComponent(name)}`
    );
  } catch (err) {
    console.error('[auth/callback]', err.message);
    return res.redirect(`${appUrl}/settings.html?error=signin_failed`);
  }
}
