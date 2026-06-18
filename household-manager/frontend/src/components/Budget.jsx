import React, { useEffect, useState } from 'react';
import { expensesApi, membersApi } from '../api/api';
import Modal from './Modal';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const CATEGORIES = ['groceries', 'utilities', 'household', 'rent', 'transport', 'health', 'entertainment', 'income', 'other'];
const CATEGORY_EMOJI = {
  groceries: '🛒', utilities: '💡', household: '🏠', rent: '🏦',
  transport: '🚗', health: '💊', entertainment: '🎬', income: '💰', other: '📦',
};

function EntryForm({ initial, members, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    amount: initial?.amount || '',
    category: initial?.category || 'other',
    type: initial?.type || 'expense',
    date: initial?.date || new Date().toISOString().split('T')[0],
    paidBy: initial?.paidBy || '',
    splitBetween: initial?.splitBetween || [],
  });
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleSplit(id) {
    setForm(f => ({
      ...f,
      splitBetween: f.splitBetween.includes(id)
        ? f.splitBetween.filter(x => x !== id)
        : [...f.splitBetween, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setError('A valid positive amount is required.'); return;
    }
    if (!form.date) { setError('Date is required.'); return; }
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Type toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {['expense', 'income'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => set('type', t)}
            className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
              form.type === t
                ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'expense' ? '💸 Expense' : '💰 Income'}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. Electricity Bill"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.date}
            onChange={e => set('date', e.target.value)}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.paidBy}
            onChange={e => set('paidBy', e.target.value)}
          >
            <option value="">— Select —</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {form.type === 'expense' && members.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Split Between</label>
          <div className="flex gap-2 flex-wrap">
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleSplit(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.splitBetween.includes(m.id)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
          {initial ? 'Update Entry' : 'Add Entry'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Budget() {
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadData() {
    try {
      const [expData, memberData, summaryData] = await Promise.all([
        expensesApi.getAll(),
        membersApi.getAll(),
        expensesApi.getSummary(),
      ]);
      setExpenses(expData);
      setMembers(memberData);
      setSummary(summaryData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSave(form) {
    if (editing) {
      await expensesApi.update(editing.id, form);
    } else {
      await expensesApi.create(form);
    }
    setShowModal(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this entry?')) return;
    await expensesApi.delete(id);
    loadData();
  }

  const filtered = filter === 'all'
    ? expenses
    : filter === 'income'
    ? expenses.filter(e => e.type === 'income')
    : filter === 'expense'
    ? expenses.filter(e => e.type === 'expense')
    : expenses.filter(e => e.category === filter);

  const balance = (summary?.totalIncome ?? 0) - (summary?.totalExpenses ?? 0);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Budget</h1>
          <p className="text-gray-500 text-sm mt-1">Track income and expenses</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Entry
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-2xl border border-green-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <TrendingUp size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-green-600 font-medium">Total Income</p>
            <p className="text-2xl font-bold text-green-700">
              ${(summary?.totalIncome ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <TrendingDown size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-red-600 font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-red-700">
              ${(summary?.totalExpenses ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
          balance >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            balance >= 0 ? 'bg-indigo-100' : 'bg-orange-100'
          }`}>
            <DollarSign size={22} className={balance >= 0 ? 'text-indigo-600' : 'text-orange-600'} />
          </div>
          <div>
            <p className={`text-xs font-medium ${balance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
              {balance < 0 ? '-' : ''}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'income', label: '💰 Income' },
          { key: 'expense', label: '💸 Expenses' },
          ...CATEGORIES.filter(c => c !== 'income').map(c => ({
            key: c,
            label: `${CATEGORY_EMOJI[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}`,
          })),
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">💰</div>
          <p>No entries here. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <span className="text-2xl shrink-0">{CATEGORY_EMOJI[entry.category] || '📦'}</span>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{entry.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span>📅 {entry.date}</span>
                  {entry.paidByName && <span>👤 {entry.paidByName}</span>}
                  <span className="capitalize">{entry.category}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className={`font-bold text-lg ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  entry.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {entry.type}
                </span>
              </div>

              <div className="flex gap-1.5 shrink-0 ml-1">
                <button
                  onClick={() => { setEditing(entry); setShowModal(true); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Entry' : 'Add Budget Entry'}
          onClose={() => { setShowModal(false); setEditing(null); }}
        >
          <EntryForm
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
