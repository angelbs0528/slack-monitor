import { redirect } from 'next/navigation';

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const appUrl = process.env.APP_URL;
  const redirectUri = encodeURIComponent(`${appUrl}/api/auth/callback`);
  const url = `https://slack.com/openid/connect/authorize?response_type=code&client_id=${clientId}&scope=openid%20profile&redirect_uri=${redirectUri}`;
  redirect(url);
}
