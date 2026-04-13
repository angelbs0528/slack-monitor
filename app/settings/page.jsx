'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './settings.module.css';

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-8a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zm8 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2 8a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"/>
    </svg>
  );
}

function ModeOption({ mode, label, description, selected, onSelect }) {
  return (
    <label
      className={`${styles.modeOption} ${selected ? styles.active : ''}`}
      onClick={() => onSelect(mode)}
    >
      <div className={styles.radio}>
        {selected && <div className={styles.radioDot} />}
      </div>
      <div>
        <div className={styles.modeLabel}>{label}</div>
        <div className={styles.modeDesc}>{description}</div>
      </div>
    </label>
  );
}

export default function Settings() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [teamId, setTeamId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const [originalMode, setOriginalMode] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const team = searchParams.get('team');
    const user = searchParams.get('user');
    const name = searchParams.get('name');

    if (team && user) {
      setTeamId(team);
      setUserId(user);
      setUserName(name ? decodeURIComponent(name) : 'there');
      window.history.replaceState({}, '', '/settings');

      fetch(`/api/settings?team=${team}&user=${user}`)
        .then(r => r.json())
        .then(data => {
          setSelectedMode(data.mode);
          setOriginalMode(data.mode);
        });
    }
  }, [searchParams]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/settings?team=${teamId}&user=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamId, user: userId, mode: selectedMode }),
      });
      const data = await res.json();
      if (data.ok) {
        setOriginalMode(selectedMode);
        setStatus({ type: 'success', message: 'Preference saved!' });
      } else {
        throw new Error(data.error);
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    }
    setSaving(false);
  };

  // Not signed in
  if (!teamId) {
    return (
      <main>
        <div className="card">
          <div className={styles.signinPrompt}>
            <h1 className={styles.heading}>Settings</h1>
            <p className={styles.signinText}>Sign in with Slack to manage your notification preferences.</p>
            <a href="/api/auth/signin" className={styles.signinBtn}>
              <SlackIcon />
              Sign in with Slack
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Signed in
  return (
    <main>
      <div className="card" style={{ textAlign: 'left' }}>
        <h1 className={styles.heading}>Notification Settings</h1>
        <p className={styles.greeting}>Hi <strong>{userName}</strong>, choose how you&apos;d like to be notified.</p>

        <div className={styles.modeOptions}>
          <ModeOption
            mode="realtime"
            label="Real-time"
            description="Get a DM instantly whenever someone mentions you."
            selected={selectedMode === 'realtime'}
            onSelect={(m) => { setSelectedMode(m); setStatus(null); }}
          />
          <ModeOption
            mode="daily"
            label="Daily digest"
            description="Receive a summary of all your mentions at 9:00 AM UTC each day."
            selected={selectedMode === 'daily'}
            onSelect={(m) => { setSelectedMode(m); setStatus(null); }}
          />
        </div>

        <button
          className={styles.saveBtn}
          disabled={saving || selectedMode === originalMode}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save preference'}
        </button>

        {status && (
          <div className={`${styles.status} ${styles[status.type]}`}>
            {status.message}
          </div>
        )}
      </div>
    </main>
  );
}
