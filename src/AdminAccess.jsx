import React, { useEffect, useState } from 'react';
import { LockKeyhole, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';
import './AdminAccess.css';

function hasAdminRole(user) {
  const role = String(user?.app_metadata?.role || '').toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

export default function AdminAccess({ children, onExit }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '' });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      setStatus({ loading: false, error: 'Invalid administrator email or password.' });
      return;
    }

    if (!hasAdminRole(data.user)) {
      await supabase.auth.signOut();
      setStatus({ loading: false, error: 'This account does not have administrator access.' });
      return;
    }

    setStatus({ loading: false, error: '' });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPassword('');
    onExit?.();
  }

  if (checking) {
    return <main className="admin-access-page"><div className="admin-access-card"><LockKeyhole /><h1>Checking administrator access…</h1></div></main>;
  }

  if (!session || !hasAdminRole(session.user)) {
    return (
      <main className="admin-access-page">
        <section className="admin-access-card">
          <div className="admin-access-icon"><ShieldCheck size={30} /></div>
          <span>Openvol administration</span>
          <h1>Administrator sign in</h1>
          <p>Use an approved administrator account to access analytics, historical data, reports, and settings.</p>
          <form onSubmit={signIn}>
            <label>Email address<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
            {status.error && <div className="admin-access-error">{status.error}</div>}
            <button type="submit" disabled={status.loading}><LogIn size={18} /> {status.loading ? 'Signing in…' : 'Sign in securely'}</button>
          </form>
          <small>Access is authenticated through Supabase and restricted to accounts with an admin or super_admin role.</small>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-authenticated-shell">
      <div className="admin-session-bar">
        <span><ShieldCheck size={16} /> Signed in as {session.user.email}</span>
        <button onClick={signOut}><LogOut size={16} /> Sign out</button>
      </div>
      {children}
    </div>
  );
}
