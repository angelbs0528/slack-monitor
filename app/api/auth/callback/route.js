import { WebClient } from '@slack/web-api';
import { redirect } from 'next/navigation';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const appUrl = process.env.APP_URL;

  if (error || !code) {
    redirect(`${appUrl}/settings?error=signin_failed`);
  }

  try {
    const client = new WebClient();
    const result = await client.openid.connect.token({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/auth/callback`,
    });

    const userClient = new WebClient(result.access_token);
    const userInfo = await userClient.openid.connect.userInfo();

    const teamId = userInfo['https://slack.com/team_id'];
    const userId = userInfo['https://slack.com/user_id'];
    const name = userInfo.name || 'User';

    redirect(`${appUrl}/settings?team=${teamId}&user=${userId}&name=${encodeURIComponent(name)}`);
  } catch (err) {
    console.error('[auth/callback]', err.message);
    redirect(`${appUrl}/settings?error=signin_failed`);
  }
}
