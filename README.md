# Mentions Bot for Slack

A distributable Slack bot that DMs users when they're mentioned in any channel.
Supports **real-time** notifications and **daily digest** mode.

Anyone can install it to their own Slack workspace by visiting your deploy URL.

---

## How the install flow works

```
User visits https://your-app.vercel.app
          │
          ▼
  Clicks "Add to Slack"  →  /api/install
          │
          ▼
  Slack OAuth screen (user approves)
          │
          ▼
  /api/oauth/callback  →  stores bot token in Redis
          │
          ▼
  Redirected back to landing page (success message)
          │
          ▼
  User invites @MentionsBot to channels  →  monitoring starts
```

---

## Project structure

```
slack-mentions-bot/
├── api/
│   ├── install.js          # Redirects to Slack OAuth
│   ├── events.js           # Receives Slack message events
│   ├── digest.js           # Vercel cron — sends daily digest DMs
│   └── oauth/
│       └── callback.js     # Exchanges code for token, stores workspace
├── lib/
│   ├── slack.js            # Slack Web API helpers + DM formatters
│   └── store.js            # Upstash Redis — workspace tokens + mentions
├── public/
│   └── index.html          # Landing page with "Add to Slack" button
├── vercel.json             # Cron schedule
├── package.json
└── .env.example
```

---

## Setup

### 1. Create a Slack App at api.slack.com/apps

- **Create New App → From scratch**
- Under **OAuth & Permissions → Redirect URLs** add:
  `https://your-app.vercel.app/api/oauth/callback`
- Add these **Bot Token Scopes**:

| Scope | Purpose |
|-------|---------|
| `channels:history` | Read public channel messages |
| `groups:history` | Read private channel messages |
| `im:history` | Read DMs |
| `mpim:history` | Read group DMs |
| `channels:read` | Resolve channel names |
| `groups:read` | Resolve private channel names |
| `users:read` | Resolve display names |
| `chat:write` | Send DMs |
| `im:write` | Open DM channels |

- Under **Basic Information** copy the **Client ID**, **Client Secret**, and **Signing Secret**
- Enable **Manage Distribution** (so others can install it)

### 2. Set up Upstash Redis

Free tier at [console.upstash.com](https://console.upstash.com). Copy the REST URL and token.

### 3. Deploy to Vercel

```bash
npm install
npx vercel --prod
```

Note the deployment URL (e.g. `https://mentions-bot.vercel.app`).

### 4. Set environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `SLACK_CLIENT_ID` | from Slack app |
| `SLACK_CLIENT_SECRET` | from Slack app |
| `SLACK_SIGNING_SECRET` | from Slack app |
| `APP_URL` | `https://your-app.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | from Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash |
| `DIGEST_MODE` | `daily` or `realtime` |
| `CRON_SECRET` | run `openssl rand -hex 32` |

Redeploy: `npx vercel --prod`

### 5. Register the Event Subscriptions URL in Slack

In your Slack app → **Event Subscriptions**:
- Enable Events
- Request URL: `https://your-app.vercel.app/api/events`
- Subscribe to bot events: `message.channels`, `message.groups`, `message.im`, `message.mpim`

---

## Sharing the bot

Send people to:

```
https://your-app.vercel.app
```

They click **Add to Slack**, approve the permissions, and the bot is live in their workspace.
After installing, they just need to `/invite @MentionsBot` to the channels they want monitored.

---

## Submitting to the Slack Marketplace (optional)

Once the bot is working and distributed, you can apply for a Marketplace listing:

1. Go to your app → **Manage Distribution**
2. Complete the **Submit to App Directory** checklist (privacy policy, support URL, etc.)
3. Submit for Slack review — typically takes a few business days

---

## Manually trigger the digest (for testing)

```bash
curl -X POST https://your-app.vercel.app/api/digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
