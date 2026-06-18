import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/api';

export default function Login() {
  const { login } = useAuth();
  const [tab,      setTab]      = useState('login');   // 'login' | 'signup'
  const [adminExists, setAdminExists] = useState(true); // assume true until checked

  // Form fields
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Check if an admin already exists to decide whether to show signup tab
  useEffect(() => {
    authApi.status()
      .then(d => {
        setAdminExists(d.adminExists);
        if (!d.adminExists) setTab('signup'); // auto-switch to signup if fresh install
      })
      .catch(() => {}); // backend down — show login normally
  }, []);

  function reset() {
    setName(''); setEmail(''); setPassword(''); setError('');
  }

  function switchTab(t) { setTab(t); reset(); }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      login(data.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.'); return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const data = await authApi.signup({ name: name.trim(), email: email.trim(), password });
      login(data.user);
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen splash-bg flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="splash-circle splash-circle-1" />
        <div className="splash-circle splash-circle-2" />
        <div className="splash-circle splash-circle-3" />
      </div>

      <div className="relative w-full max-w-md fade-in">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Logo */}
          <div className="text-center pt-8 pb-4 px-8">
            <div className="text-5xl mb-3">🏠</div>
            <h1 className="text-2xl font-extrabold text-gray-800">Household Manager</h1>
            <p className="text-gray-400 text-sm mt-1">
              {tab === 'login' ? 'Sign in to your account' : 'Create your admin account'}
            </p>
          </div>

          {/* Tabs — only show if admin exists (otherwise force signup) */}
          {adminExists && (
            <div className="flex mx-8 mb-0 border-b border-gray-100">
              {[
                { id: 'login',  label: 'Sign In' },
                { id: 'signup', label: 'Sign Up' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="px-8 py-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            )}

            {/* ── SIGNUP FORM ── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                {!adminExists && (
                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-4 py-3 rounded-xl">
                    👑 No admin found. You'll be registered as the <strong>admin</strong>.
                  </div>
                )}
                {adminExists && (
                  <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs px-4 py-3 rounded-xl">
                    ⚠️ An admin already exists. Only the admin can create new member accounts.
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    autoComplete="name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={adminExists}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={adminExists}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={adminExists}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || adminExists}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Creating account…' : 'Create Admin Account'}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-400 mt-5">
              Admins see full dashboard · Members see tasks &amp; reports
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
