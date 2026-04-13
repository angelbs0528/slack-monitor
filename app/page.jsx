'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-8a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zm8 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2 8a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"/>
    </svg>
  );
}

function Banner({ type, children }) {
  if (!children) return null;
  return (
    <div className={`${styles.banner} ${styles[type]}`}>
      {type === 'success' ? '✅' : '⚠️'} <span>{children}</span>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const team = searchParams.get('team');

    if (success === 'true') {
      const teamName = team ? decodeURIComponent(team) : 'Your workspace';
      setBanner({ type: 'success', message: `${teamName} is all set! Invite @MentionsBot to any channel to start monitoring.` });
    } else if (error) {
      const msg = error === 'access_denied' ? 'Installation was cancelled.' : 'Installation failed. Please try again.';
      setBanner({ type: 'error', message: msg });
    }

    // Clean URL params
    if (success || error) {
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  return (
    <main>
      <div className="card">
        {banner && <Banner type={banner.type}>{banner.message}</Banner>}

        <div className={styles.iconWrap}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 3C9.716 3 3 9.716 3 18c0 2.628.672 5.1 1.848 7.26L3 33l7.98-1.824A14.916 14.916 0 0 0 18 33c8.284 0 15-6.716 15-15S26.284 3 18 3z" fill="#4A154B" opacity=".15"/>
            <path d="M13 17h10M13 21h6" stroke="#4A154B" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="12" r="4" fill="#e63946"/>
            <text x="24" y="16" fontSize="5.5" fontWeight="700" fill="white" textAnchor="middle">@</text>
          </svg>
        </div>

        <h1 className={styles.title}>Never miss a mention</h1>
        <p className={styles.subtitle}>
          Mentions Bot watches every channel you&apos;re in and sends you a direct message whenever someone <strong>@mentions</strong> you — instantly or as a daily digest.
        </p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>⚡</span>
            <div className={styles.featureText}><strong>Real-time or daily digest</strong> — get notified the moment you&apos;re mentioned, or receive a tidy morning summary.</div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🔒</span>
            <div className={styles.featureText}><strong>Public &amp; private channels</strong> — monitors all channels the bot is invited to, including private ones.</div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>👥</span>
            <div className={styles.featureText}><strong>Works for everyone</strong> — automatically notifies any workspace member when they&apos;re mentioned, no setup required per person.</div>
          </div>
        </div>

        <a href="/api/install" className={styles.addToSlack}>
          <SlackIcon />
          Add to Slack
        </a>

        <p className={styles.notice}>Free to use · No data sold · Bot only reads messages to detect mentions</p>
        <p className={styles.notice}>
          <Link href="/settings" className={styles.settingsLink}>Notification settings</Link>
        </p>
      </div>
    </main>
  );
}
