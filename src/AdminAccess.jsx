import React, { useEffect, useState } from 'react';
import { KeyRound, LockKeyhole, LogIn, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';
import './AdminAccess.css';

async function getAdminAccess(user) {
  if (!user?.email) return null;
  const { data, error } = await supabase
    .from('openvol_admin_emails')
    .select('email,role')
    .eq('email', user.email.trim().toLowerCase())
    .maybeSingle();
  if (error) return null;
  return data || null;
}

export default function AdminAccess({ children, onExit }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminAccess, setAdminAccess] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: '', message: '' });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const nextSession = data.session || null;
      setSession(nextSession);
      const access = nextSession?.user ? await getAdminAccess(nextSession.user) : null;
      if (!mounted) return;
      setAdminAccess(access);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      Promise.resolve(nextSession?.user ? getAdminAccess(nextSession.user) : null).then(access => {
        if (mounted) setAdminAccess(access);
      });
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true);
        setMode('recovery');
        setStatus({ loading: false, error: '', message: 'Choose a new administrator password.' });
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '', message: '' });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      setStatus({ loading: false, error: 'Invalid administrator email or password.', message: '' });
      return;
    }

    const access = await getAdminAccess(data.user);
    if (!access) {
      await supabase.auth.signOut();
      setAdminAccess(null);
      setStatus({ loading: false, error: 'This account is not approved for Openvol administration.', message: '' });
      return;
    }

    setAdminAccess(access);
    setStatus({ loading: false, error: '', message: '' });
  }

  async function createAdminAccount(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setStatus({ loading: false, error: 'Enter an email address and password.', message: '' });
      return;
    }
    if (password.length < 12) {
      setStatus({ loading: false, error: 'Use at least 12 characters for the password.', message: '' });
      return;
    }

    setStatus({ loading: true, error: '', message: '' });
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` }
    });

    if (error) {
      setStatus({ loading: false, error: error.message || 'Unable to create the administrator account.', message: '' });
      return;
    }

    const access = data.user ? await getAdminAccess(data.user) : null;
    if (data.session && access) {
      setSession(data.session);
      setAdminAccess(access);
      setStatus({ loading: false, error: '', message: '' });
      return;
    }

    setMode('signin');
    setStatus({
      loading: false,
      error: '',
      message: 'Account created. Check your email to confirm the address, then sign in.'
    });
  }

  async function sendMagicLink() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus({ loading: false, error: 'Enter your administrator email address first.', message: '' });
      return;
    }

    setStatus({ loading: true, error: '', message: '' });
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        shouldCreateUser: false
      }
    });

    if (error) {
      setStatus({ loading: false, error: 'Unable to send the sign-in link right now. Please try again.', message: '' });
      return;
    }

    setStatus({
      loading: false,
      error: '',
      message: 'If that email belongs to an administrator account, a secure sign-in link has been sent.'
    });
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus({ loading: false, error: 'Enter your administrator email address first.', message: '' });
      return;
    }

    setStatus({ loading: true, error: '', message: '' });
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/admin`
    });

    if (error) {
      setStatus({ loading: false, error: 'Unable to send the reset email right now. Please try again.', message: '' });
      return;
    }

    setStatus({
      loading: false,
      error: '',
      message: 'If that email belongs to an administrator account, a secure reset link has been sent.'
    });
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (newPassword.length < 12) {
      setStatus({ loading: false, error: 'Use at least 12 characters for the new password.', message: '' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ loading: false, error: 'The new passwords do not match.', message: '' });
      return;
    }

    setStatus({ loading: true, error: '', message: '' });
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setStatus({ loading: false, error: 'The password could not be updated. Please request a new reset link.', message: '' });
      return;
    }

    await supabase.auth.signOut();
    setRecovery(false);
    setMode('signin');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStatus({ loading: false, error: '', message: 'Password updated. Sign in with your new password.' });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPassword('');
    onExit?.();
  }

  if (checking) {
    return <main className="admin-access-page"><div className="admin-access-card"><LockKeyhole /><h1>Checking administrator access…</h1></div></main>;
  }

  if (recovery || mode === 'recovery') {
    return (
      <main className="admin-access-page">
        <section className="admin-access-card">
          <div className="admin-access-icon"><KeyRound size={30} /></div>
          <span>Openvol administration</span>
          <h1>Set a new password</h1>
          <p>Create a new password for your administrator account.</p>
          <form onSubmit={updatePassword}>
            <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={12} required /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={12} required /></label>
            {status.error && <div className="admin-access-error">{status.error}</div>}
            {status.message && <div className="admin-access-message">{status.message}</div>}
            <button type="submit" disabled={status.loading}><KeyRound size={18} /> {status.loading ? 'Updating…' : 'Update password'}</button>
          </form>
        </section>
      </main>
    );
  }

  if (!session || !adminAccess) {
    return (
      <main className="admin-access-page">
        <section className="admin-access-card">
          <div className="admin-access-icon"><ShieldCheck size={30} /></div>
          <span>Openvol administration</span>
          <h1>{mode === 'reset' ? 'Reset administrator password' : mode === 'signup' ? 'Create administrator account' : 'Administrator sign in'}</h1>
          <p>{mode === 'reset'
            ? 'Enter your administrator email address and we will send a secure reset link.'
            : mode === 'signup'
              ? 'Create the approved administrator account for QA access.'
              : 'Use an approved administrator account to access analytics, historical data, reports, and settings.'}</p>

          {mode === 'reset' ? (
            <form onSubmit={requestPasswordReset}>
              <label>Email address<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
              {status.error && <div className="admin-access-error">{status.error}</div>}
              {status.message && <div className="admin-access-message">{status.message}</div>}
              <button type="submit" disabled={status.loading}><Mail size={18} /> {status.loading ? 'Sending…' : 'Send reset link'}</button>
              <button type="button" className="admin-access-secondary" onClick={() => { setMode('signin'); setStatus({ loading: false, error: '', message: '' }); }}>Back to sign in</button>
            </form>
          ) : mode === 'signup' ? (
            <form onSubmit={createAdminAccount}>
              <label>Email address<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
              <label>Create password<input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={12} required /></label>
              {status.error && <div className="admin-access-error">{status.error}</div>}
              {status.message && <div className="admin-access-message">{status.message}</div>}
              <button type="submit" disabled={status.loading}><ShieldCheck size={18} /> {status.loading ? 'Creating…' : 'Create admin account'}</button>
              <button type="button" className="admin-access-secondary" onClick={() => { setMode('signin'); setStatus({ loading: false, error: '', message: '' }); }}>Back to sign in</button>
            </form>
          ) : (
            <form onSubmit={signIn}>
              <label>Email address<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
              <label>Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
              {status.error && <div className="admin-access-error">{status.error}</div>}
              {status.message && <div className="admin-access-message">{status.message}</div>}
              <button type="submit" disabled={status.loading}><LogIn size={18} /> {status.loading ? 'Signing in…' : 'Sign in securely'}</button>
              <button type="button" className="admin-access-secondary" disabled={status.loading} onClick={sendMagicLink}><Mail size={18} /> Email me a secure sign-in link</button>
              <button type="button" className="admin-access-link" onClick={() => { setMode('reset'); setStatus({ loading: false, error: '', message: '' }); }}>Forgot password?</button>
              <button type="button" className="admin-access-link" onClick={() => { setMode('signup'); setStatus({ loading: false, error: '', message: '' }); }}>Create admin account</button>
            </form>
          )}

          <small>Access is authenticated through Supabase and restricted to email addresses explicitly approved for Openvol administration.</small>
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
