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

function ModeOption({ mode, label, description, selected, onSelect, children }) {
  return (
    <div>
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
      {selected && children}
    </div>
  );
}

const TIMEZONE_OPTIONS = [
  { label: 'Pacific Time (PT)', offset: -8 },
  { label: 'Mountain Time (MT)', offset: -7 },
  { label: 'Central Time (CT)', offset: -6 },
  { label: 'Eastern Time (ET)', offset: -5 },
  { label: 'Atlantic Time (AT)', offset: -4 },
  { label: 'UTC', offset: 0 },
  { label: 'London (GMT/BST)', offset: 0 },
  { label: 'Central Europe (CET)', offset: 1 },
  { label: 'Eastern Europe (EET)', offset: 2 },
  { label: 'India (IST)', offset: 5.5 },
  { label: 'Singapore (SGT)', offset: 8 },
  { label: 'Japan (JST)', offset: 9 },
  { label: 'Australia Eastern (AEST)', offset: 10 },
  { label: 'New Zealand (NZST)', offset: 12 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? 'AM' : 'PM';
  const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${hour}:00 ${ampm}` };
});

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
  const [digestHour, setDigestHour] = useState(9);
  const [timezone, setTimezone] = useState('UTC');
  const [original, setOriginal] = useState(null);
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
          setDigestHour(data.digestHour ?? 9);
          setTimezone(data.timezone ?? 'UTC');
          setOriginal({ mode: data.mode, digestHour: data.digestHour ?? 9, timezone: data.timezone ?? 'UTC' });
        });
    }
  }, [searchParams]);

  const hasChanges = original && (
    selectedMode !== original.mode ||
    digestHour !== original.digestHour ||
    timezone !== original.timezone
  );

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/settings?team=${teamId}&user=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamId, user: userId, mode: selectedMode, digestHour, timezone }),
      });
      const data = await res.json();
      if (data.ok) {
        setOriginal({ mode: selectedMode, digestHour, timezone });
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
            description="Receive a summary of all your mentions once a day."
            selected={selectedMode === 'daily'}
            onSelect={(m) => { setSelectedMode(m); setStatus(null); }}
          >
            <div className={styles.digestConfig}>
              <div className={styles.digestRow}>
                <label className={styles.digestLabel}>Delivery time</label>
                <select
                  className={styles.select}
                  value={digestHour}
                  onChange={(e) => { setDigestHour(Number(e.target.value)); setStatus(null); }}
                >
                  {HOUR_OPTIONS.map(h => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.digestRow}>
                <label className={styles.digestLabel}>Timezone</label>
                <select
                  className={styles.select}
                  value={timezone}
                  onChange={(e) => { setTimezone(e.target.value); setStatus(null); }}
                >
                  {TIMEZONE_OPTIONS.map(tz => (
                    <option key={tz.label} value={tz.label}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </ModeOption>
        </div>

        <button
          className={styles.saveBtn}
          disabled={saving || !hasChanges}
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
