import { NextResponse } from 'next/server';
import { getUserPreference, setUserPreference } from '@/lib/store';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team');
  const userId = searchParams.get('user');

  if (!teamId || !userId) {
    return NextResponse.json({ error: 'team and user are required' }, { status: 400 });
  }

  const prefs = await getUserPreference(teamId, userId);
  const mode = prefs?.mode || process.env.DIGEST_MODE || 'daily';
  return NextResponse.json({ mode });
}

export async function POST(request) {
  const body = await request.json();
  const { team, user, mode } = body;

  if (!team || !user) {
    return NextResponse.json({ error: 'team and user are required' }, { status: 400 });
  }

  if (!['realtime', 'daily'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be "realtime" or "daily"' }, { status: 400 });
  }

  await setUserPreference(team, user, { mode });
  return NextResponse.json({ ok: true, mode });
}
