import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/api';
import { Eye, EyeOff, Save, User } from 'lucide-react';

const AVATAR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

export default function AdminProfile() {
  const { user, login } = useAuth();

  const [name,            setName]            = useState(user.name);
  const [email,           setEmail]           = useState(user.email);
  const [avatarColor,     setAvatarColor]     = useState(user.avatarColor || '#6366f1');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [loading,         setLoading]         = useState(false);

  function getInitials(n) {
    return n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    if (!currentPassword.trim()) { setError('Enter your current password to save changes.'); return; }
    if (newPassword && newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (newPassword && newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }

    setLoading(true);
    try {
      const payload = {
        id: user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        avatarColor,
        currentPassword,
        ...(newPassword ? { password: newPassword } : {}),
      };
      const data = await authApi.updateProfile(payload);
      login(data.user);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Update your account details and password</p>
      </div>

      {/* Avatar preview card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5 mb-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-extrabold shadow-sm shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(name || user.name)}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">{name || user.name}</p>
          <p className="text-sm text-gray-400">{email || user.email}</p>
          <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
            👑 Admin
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">✅ {success}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2"><User size={16} /> Basic Info</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setAvatarColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    avatarColor === color ? 'border-gray-700 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">Change Password</h3>
          <p className="text-xs text-gray-400 -mt-2">Leave "New password" blank to keep current.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password" autoComplete="current-password" />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {newPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input type="password"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  confirmPassword && confirmPassword !== newPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password" autoComplete="new-password" />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
          <Save size={16} />
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
