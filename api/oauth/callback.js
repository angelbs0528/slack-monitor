import { WebClient } from '@slack/web-api';
import { storeWorkspace } from '../../lib/store.js';

/**
 * GET /api/oauth/callback
 * Slack redirects here after the user approves the app.
 * Exchanges the temporary code for a bot token and stores it.
 */
export default async function handler(req, res) {
  const { code, error } = req.query;
  const appUrl = process.env.APP_URL;

  if (error || !code) {
    console.error('[oauth] Denied or missing code:', error);
    return res.redirect(`${appUrl}?error=access_denied`);
  }

  try {
    // Use a token-less client just for the OAuth exchange
    const client = new WebClient();

    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/oauth/callback`,
    });

    await storeWorkspace({
      teamId: result.team.id,
      teamName: result.team.name,
      botToken: result.access_token,
      botUserId: result.bot_user_id,
      installedAt: Date.now(),
    });

    console.log(`[oauth] Installed to workspace: ${result.team.name} (${result.team.id})`);

    const teamName = encodeURIComponent(result.team.name);
    return res.redirect(`${appUrl}?success=true&team=${teamName}`);
  } catch (err) {
    console.error('[oauth] Token exchange failed:', err.message);
    return res.redirect(`${appUrl}?error=install_failed`);
  }
}
