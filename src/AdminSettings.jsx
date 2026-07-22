import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowLeft, CheckCircle2, Database, Download, Flag,
  RefreshCw, Save, Server, ShieldCheck, Trash2, Wrench
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './AdminSettings.css';

const defaults = {
  analytics_retention_days: 365,
  maintenance_mode: false,
  cloud_sync_enabled: false,
  ai_insights_enabled: false,
  build_label: 'Build 72',
  support_email: ''
};

export default function AdminSettings({ onBack }) {
  const [settings, setSettings] = useState(defaults);
  const [health, setHealth] = useState({ database: 'Checking', analytics: 'Checking', version: 'Build 72' });
  const [status, setStatus] = useState({ loading: true, saving: false, message: '', error: '' });

  async function load() {
    setStatus(current => ({ ...current, loading: true, error: '' }));
    const [{ data, error }, healthResult] = await Promise.all([
      supabase.from('admin_settings').select('setting_key,setting_value'),
      supabase.rpc('admin_system_health')
    ]);
    if (error) {
      setStatus({ loading: false, saving: false, message: '', error: error.message });
      return;
    }
    const next = { ...defaults };
    (data || []).forEach(row => { next[row.setting_key] = row.setting_value; });
    setSettings(next);
    if (!healthResult.error && healthResult.data) setHealth(healthResult.data);
    setStatus({ loading: false, saving: false, message: '', error: '' });
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setStatus(current => ({ ...current, saving: true, message: '', error: '' }));
    const rows = Object.entries(settings).map(([setting_key, setting_value]) => ({ setting_key, setting_value }));
    const { error } = await supabase.from('admin_settings').upsert(rows, { onConflict: 'setting_key' });
    setStatus({ loading: false, saving: false, message: error ? '' : 'Settings saved.', error: error?.message || '' });
  }

  async function purgeExpired() {
    if (!confirm(`Delete aggregate analytics older than ${settings.analytics_retention_days} days?`)) return;
    const { error } = await supabase.rpc('purge_expired_analytics');
    setStatus(current => ({ ...current, message: error ? '' : 'Expired analytics were removed.', error: error?.message || '' }));
  }

  function change(key, value) { setSettings(current => ({ ...current, [key]: value })); }

  return (
    <main className="settings-page">
      <section className="settings-hero">
        <button className="settings-back" onClick={onBack}><ArrowLeft size={18} /> Analytics</button>
        <div><span><Wrench size={16} /> Build 72 Administration</span><h1>Admin Settings</h1><p>Control privacy, retention, feature flags, and platform health.</p></div>
        <button className="settings-save" onClick={save} disabled={status.saving}><Save size={18} /> {status.saving ? 'Saving…' : 'Save settings'}</button>
      </section>

      {(status.error || status.message) && <div className={`settings-notice ${status.error ? 'error' : ''}`}>{status.error || status.message}</div>}

      <section className="settings-grid">
        <article className="settings-card">
          <div className="settings-card-title"><Database /><div><h2>Analytics retention</h2><p>Aggregate counters only; no individual visitor records.</p></div></div>
          <label>Retention period
            <select value={settings.analytics_retention_days} onChange={e => change('analytics_retention_days', Number(e.target.value))}>
              <option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>1 year</option><option value={730}>2 years</option>
            </select>
          </label>
          <button className="danger-outline" onClick={purgeExpired}><Trash2 size={17} /> Purge expired analytics</button>
        </article>

        <article className="settings-card">
          <div className="settings-card-title"><Flag /><div><h2>Feature flags</h2><p>Safely enable upcoming capabilities.</p></div></div>
          <Toggle label="Maintenance mode" description="Show a maintenance notice to public users." checked={settings.maintenance_mode} onChange={v => change('maintenance_mode', v)} />
          <Toggle label="Optional cloud sync" description="Allow students to opt into cloud workspace sync." checked={settings.cloud_sync_enabled} onChange={v => change('cloud_sync_enabled', v)} />
          <Toggle label="AI insights" description="Prepare the dashboard for Build 73 insights." checked={settings.ai_insights_enabled} onChange={v => change('ai_insights_enabled', v)} />
        </article>

        <article className="settings-card">
          <div className="settings-card-title"><ShieldCheck /><div><h2>Application identity</h2><p>Displayed in internal administration screens.</p></div></div>
          <label>Build label<input value={settings.build_label} onChange={e => change('build_label', e.target.value)} /></label>
          <label>Support email<input type="email" value={settings.support_email} onChange={e => change('support_email', e.target.value)} placeholder="support@example.com" /></label>
        </article>

        <article className="settings-card">
          <div className="settings-card-title"><Activity /><div><h2>System health</h2><p>Current service and analytics readiness.</p></div></div>
          <HealthRow icon={<Database />} label="Database" value={health.database || 'Unknown'} />
          <HealthRow icon={<Server />} label="Analytics backend" value={health.analytics || 'Unknown'} />
          <HealthRow icon={<CheckCircle2 />} label="Application version" value={health.version || settings.build_label} />
          <button onClick={load}><RefreshCw size={17} /> Refresh health</button>
        </article>

        <article className="settings-card settings-wide">
          <div className="settings-card-title"><Download /><div><h2>Data administration</h2><p>Exports contain aggregate counters and configuration only.</p></div></div>
          <p className="settings-privacy-note"><ShieldCheck size={18} /> Openvol analytics does not store visitor IDs, IP addresses, fingerprints, exact location, or user-level browsing histories.</p>
        </article>
      </section>
    </main>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return <label className="settings-toggle"><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={Boolean(checked)} onChange={e => onChange(e.target.checked)} /><i /></label>;
}

function HealthRow({ icon, label, value }) {
  return <div className="health-row"><span>{icon}{label}</span><strong>{value}</strong></div>;
}
