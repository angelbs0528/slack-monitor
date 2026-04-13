import { getUserPreference, setUserPreference, getAllWorkspaces } from '../lib/store.js';
import { slackClient } from '../lib/slack.js';

/**
 * GET  /api/settings?team=TXXXX&user=UXXXX — returns user's current preference
 * POST /api/settings { team, user, mode } — saves user's preference
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const teamId = req.query.team || (req.body && req.body.team);
  const userId = req.query.user || (req.body && req.body.user);

  if (!teamId || !userId) {
    return res.status(400).json({ error: 'team and user are required' });
  }

  if (req.method === 'GET') {
    const prefs = await getUserPreference(teamId, userId);
    const mode = prefs?.mode || process.env.DIGEST_MODE || 'daily';
    return res.status(200).json({ mode });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const mode = body.mode;

    if (!['realtime', 'daily'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be "realtime" or "daily"' });
    }

    await setUserPreference(teamId, userId, { mode });
    return res.status(200).json({ ok: true, mode });
  }

  res.status(405).end();
}
