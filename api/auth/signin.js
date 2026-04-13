/**
 * GET /api/auth/signin
 * Redirects user to Slack's Sign in with Slack flow.
 * After signing in, Slack redirects to /api/auth/callback with the user's identity.
 */
export default function handler(req, res) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const appUrl = process.env.APP_URL;

  const redirectUri = encodeURIComponent(`${appUrl}/api/auth/callback`);
  const url = `https://slack.com/openid/connect/authorize?response_type=code&client_id=${clientId}&scope=openid%20profile&redirect_uri=${redirectUri}`;

  res.redirect(url);
}
