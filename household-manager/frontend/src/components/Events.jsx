import React, { useEffect, useState } from 'react';
import { eventsApi, membersApi } from '../api/api';
import Modal from './Modal';
import { Calendar } from 'lucide-react';

const CATEGORIES = ['chores', 'bills', 'social', 'maintenance', 'health', 'general'];
const CATEGORY_EMOJI = {
  chores: '🧹', bills: '💳', social: '🎉', maintenance: '🔧', health: '💊', general: '📅',
};
const CATEGORY_COLORS = {
  chores: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  bills: 'bg-blue-100 text-blue-700 border-blue-200',
  social: 'bg-pink-100 text-pink-700 border-pink-200',
  maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
  health: 'bg-green-100 text-green-700 border-green-200',
  general: 'bg-gray-100 text-gray-700 border-gray-200',
};

function EventForm({ initial, members, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    date: initial?.date || '',
    time: initial?.time || '',
    category: initial?.category || 'general',
    assignedTo: initial?.assignedTo || '',
  });
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.date) { setError('Date is required.'); return; }
    try {
      await onSave({ ...form, assignedTo: form.assignedTo || null });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Event title"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          rows={2}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Optional details"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            type="time"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.time}
            onChange={e => set('time', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.assignedTo}
            onChange={e => set('assignedTo', e.target.value)}
          >
            <option value="">No one assigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
          {initial ? 'Update Event' : 'Add Event'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadData() {
    try {
      const [eventData, memberData] = await Promise.all([eventsApi.getAll(), membersApi.getAll()]);
      setEvents(eventData);
      setMembers(memberData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSave(form) {
    if (editing) {
      await eventsApi.update(editing.id, form);
    } else {
      await eventsApi.create(form);
    }
    setShowModal(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event?')) return;
    await eventsApi.delete(id);
    loadData();
  }

  const today = new Date().toISOString().split('T')[0];
  const filtered = filter === 'all'
    ? events
    : filter === 'upcoming'
    ? events.filter(e => e.date >= today)
    : filter === 'past'
    ? events.filter(e => e.date < today)
    : events.filter(e => e.category === filter);

  // Sort by date ascending
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Events</h1>
          <p className="text-gray-500 text-sm mt-1">{events.length} event{events.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: '📅 Upcoming' },
          { key: 'past', label: '🕐 Past' },
          ...CATEGORIES.map(c => ({ key: c, label: `${CATEGORY_EMOJI[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}` })),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-16">Loading...</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📅</div>
          <p>No events here. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(event => {
            const isPast = event.date < today;
            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 hover:shadow-md transition-shadow ${
                  isPast ? 'opacity-60' : ''
                }`}
              >
                {/* Date block */}
                <div className={`shrink-0 w-12 text-center rounded-xl p-2 border ${
                  isPast ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                }`}>
                  <p className="text-xs font-medium">
                    {event.date ? new Date(event.date + 'T00:00:00').toLocaleString('en-US', { month: 'short' }) : ''}
                  </p>
                  <p className="text-xl font-bold leading-tight">
                    {event.date ? new Date(event.date + 'T00:00:00').getDate() : ''}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-800">{event.title}</p>
                    <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize ${
                      CATEGORY_COLORS[event.category] || CATEGORY_COLORS.general
                    }`}>
                      {CATEGORY_EMOJI[event.category]} {event.category}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>📅 {formatDate(event.date)}</span>
                    {event.time && <span>🕐 {event.time}</span>}
                    {event.assigneeName && <span>👤 {event.assigneeName}</span>}
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => { setEditing(event); setShowModal(true); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Event' : 'Add Event'}
          onClose={() => { setShowModal(false); setEditing(null); }}
        >
          <EventForm
            initial={editing}
            members={members}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditing(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
