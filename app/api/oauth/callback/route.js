import { WebClient } from '@slack/web-api';
import { redirect } from 'next/navigation';
import { storeWorkspace } from '@/lib/store';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const appUrl = process.env.APP_URL;

  if (error || !code) {
    console.error('[oauth] Denied or missing code:', error);
    redirect(`${appUrl}?error=access_denied`);
  }

  let redirectUrl;
  try {
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
      installerUserId: result.authed_user?.id,
      installedAt: Date.now(),
    });

    console.log(`[oauth] Installed to workspace: ${result.team.name} (${result.team.id})`);
    const teamName = encodeURIComponent(result.team.name);
    redirectUrl = `${appUrl}?success=true&team=${teamName}`;
  } catch (err) {
    console.error('[oauth] Token exchange failed:', err.message);
    redirectUrl = `${appUrl}?error=install_failed`;
  }

  redirect(redirectUrl);
}
