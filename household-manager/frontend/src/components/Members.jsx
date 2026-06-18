import React, { useEffect, useState } from 'react';
import { membersApi } from '../api/api';
import Modal from './Modal';
import { Eye, EyeOff } from 'lucide-react';

function getInitials(name) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

function MemberForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    email:       initial?.email       || '',
    role:        initial?.role        || 'member',
    avatarColor: initial?.avatarColor || '#6366f1',
    password:    '',   // blank = keep existing on edit
  });
  const [showPw, setShowPw] = useState(false);
  const [error,  setError]  = useState('');

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.'); return;
    }
    if (!isEdit && !form.password.trim()) {
      setError('Password is required when creating a member.'); return;
    }
    if (form.password && form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password; // don't overwrite if blank
      await onSave(payload);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Bob Smith"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          type="email"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="member@example.com"
        />
      </div>

      {/* Password — required on create, optional on edit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isEdit ? 'New Password' : 'Password *'}
          {isEdit && <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>}
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder={isEdit ? 'New password…' : 'Min 6 characters'}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.role}
            onChange={e => set('role', e.target.value)}
          >
            <option value="admin">👑 Admin</option>
            <option value="member">👤 Member</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Only admin can change roles</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Avatar Color</label>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {AVATAR_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => set('avatarColor', color)}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  form.avatarColor === color ? 'border-gray-700 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {isEdit ? 'Update Member' : 'Create Member'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Members() {
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  async function loadMembers() {
    try {
      const data = await membersApi.getAll();
      setMembers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMembers(); }, []);

  async function handleSave(form) {
    if (editing) {
      await membersApi.update(editing.id, form);
    } else {
      await membersApi.create(form);
    }
    setShowModal(false);
    setEditing(null);
    loadMembers();
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this member? This will also delete all their tasks and logs.')) return;
    await membersApi.delete(id);
    loadMembers();
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Members</h1>
          <p className="text-gray-500 text-sm mt-1">
            {members.length} household member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Member
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-16">Loading…</p>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👥</div>
          <p>No members yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm"
                style={{ backgroundColor: member.avatarColor }}
              >
                {getInitials(member.name)}
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 text-lg">{member.name}</h3>
                <p className="text-gray-400 text-sm">{member.email}</p>
                <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  member.role === 'admin'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
                </span>
              </div>

              <div className="flex gap-2 mt-1 w-full">
                <button
                  onClick={() => { setEditing(member); setShowModal(true); }}
                  className="flex-1 text-sm py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="flex-1 text-sm py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Member' : 'Add Member'}
          onClose={() => { setShowModal(false); setEditing(null); }}
        >
          <MemberForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditing(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
