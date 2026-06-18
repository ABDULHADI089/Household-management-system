import React, { useEffect, useState } from 'react';
import { shoppingApi, membersApi } from '../api/api';
import Modal from './Modal';
import { ShoppingCart, Check } from 'lucide-react';

const CATEGORIES = ['dairy', 'bakery', 'pantry', 'cleaning', 'produce', 'meat', 'beverages', 'other'];

const CATEGORY_EMOJI = {
  dairy: '🥛', bakery: '🍞', pantry: '🥫', cleaning: '🧹',
  produce: '🥦', meat: '🥩', beverages: '🧃', other: '🛒',
};

function ItemForm({ initial, members, onSave, onCancel }) {
  const [form, setForm] = useState({
    item: initial?.item || '',
    quantity: initial?.quantity || '',
    category: initial?.category || 'other',
    addedBy: initial?.addedBy || '',
    purchased: initial?.purchased || false,
  });
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.item.trim()) { setError('Item name is required.'); return; }
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.item}
          onChange={e => set('item', e.target.value)}
          placeholder="e.g. Milk"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.quantity}
            onChange={e => set('quantity', e.target.value)}
            placeholder="e.g. 2 gallons"
          />
        </div>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Added By</label>
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.addedBy}
          onChange={e => set('addedBy', e.target.value)}
        >
          <option value="">— Select member —</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="purchased"
          className="w-4 h-4 accent-indigo-600"
          checked={form.purchased}
          onChange={e => set('purchased', e.target.checked)}
        />
        <label htmlFor="purchased" className="text-sm text-gray-700">Mark as purchased</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
          {initial ? 'Update Item' : 'Add Item'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Shopping() {
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadData() {
    try {
      const [itemData, memberData] = await Promise.all([shoppingApi.getAll(), membersApi.getAll()]);
      setItems(itemData);
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
      await shoppingApi.update(editing.id, form);
    } else {
      await shoppingApi.create(form);
    }
    setShowModal(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this item?')) return;
    await shoppingApi.delete(id);
    loadData();
  }

  async function togglePurchased(item) {
    await shoppingApi.update(item.id, { purchased: !item.purchased });
    loadData();
  }

  const filtered = filter === 'all'
    ? items
    : filter === 'remaining'
    ? items.filter(i => !i.purchased)
    : filter === 'purchased'
    ? items.filter(i => i.purchased)
    : items.filter(i => i.category === filter);

  const remaining = items.filter(i => !i.purchased).length;
  const purchased = items.filter(i => i.purchased).length;

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Shopping List</h1>
          <p className="text-gray-500 text-sm mt-1">
            {remaining} item{remaining !== 1 ? 's' : ''} remaining · {purchased} purchased
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Item
        </button>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Shopping Progress</span>
            <span>{purchased} / {items.length}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-orange-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${items.length ? (purchased / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'remaining', label: '🛒 Remaining' },
          { key: 'purchased', label: '✅ Purchased' },
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🛒</div>
          <p>No items here. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow ${
                item.purchased ? 'opacity-60' : ''
              }`}
            >
              {/* Toggle purchased */}
              <button
                onClick={() => togglePurchased(item)}
                title={item.purchased ? 'Mark as remaining' : 'Mark as purchased'}
                className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  item.purchased
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-300 hover:border-orange-400'
                }`}
              >
                {item.purchased && <Check size={12} strokeWidth={3} />}
              </button>

              {/* Category emoji */}
              <span className="text-xl shrink-0">{CATEGORY_EMOJI[item.category] || '🛒'}</span>

              {/* Item details */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-gray-800 ${item.purchased ? 'line-through text-gray-400' : ''}`}>
                  {item.item}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {item.quantity && <span>📦 {item.quantity}</span>}
                  {item.addedByName && <span>👤 {item.addedByName}</span>}
                  <span className="capitalize">{item.category}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => { setEditing(item); setShowModal(true); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
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
          title={editing ? 'Edit Item' : 'Add Shopping Item'}
          onClose={() => { setShowModal(false); setEditing(null); }}
        >
          <ItemForm
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
