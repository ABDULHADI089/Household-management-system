import React, { useEffect, useState } from 'react';
import { tasksApi, membersApi } from '../api/api';
import Modal from './Modal';

const STATUS_OPTIONS = ['pending', 'in-progress', 'done'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const priorityBadge = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};
const statusBadge = {
  pending: 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

function TaskForm({ initial, members, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    assignedTo: initial?.assignedTo || '',
    dueDate: initial?.dueDate || '',
    status: initial?.status || 'pending',
    priority: initial?.priority || 'medium',
  });
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    try {
      const payload = {
        ...form,
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
      };
      await onSave(payload);
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
          placeholder="Task title"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.priority}
            onChange={e => set('priority', e.target.value)}
          >
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.assignedTo}
            onChange={e => set('assignedTo', e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.dueDate}
            onChange={e => set('dueDate', e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
          {initial ? 'Update Task' : 'Add Task'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadData() {
    try {
      const [taskData, memberData] = await Promise.all([tasksApi.getAll(), membersApi.getAll()]);
      setTasks(taskData);
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
      await tasksApi.update(editing.id, form);
    } else {
      await tasksApi.create(form);
    }
    setShowModal(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this task?')) return;
    await tasksApi.delete(id);
    loadData();
  }

  async function toggleStatus(task) {
    const next = task.status === 'done' ? 'pending' : task.status === 'pending' ? 'in-progress' : 'done';
    await tasksApi.update(task.id, { status: next });
    loadData();
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} task{filtered.length !== 1 ? 's' : ''} shown</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', 'pending', 'in-progress', 'done'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">✅</div>
          <p>No tasks here. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div
              key={task.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow ${
                task.status === 'done' ? 'opacity-70' : ''
              }`}
            >
              {/* Checkbox-style status toggle */}
              <button
                onClick={() => toggleStatus(task)}
                title="Cycle status"
                className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                  task.status === 'done'
                    ? 'bg-green-500 border-green-500'
                    : task.status === 'in-progress'
                    ? 'bg-blue-400 border-blue-400'
                    : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                {task.status === 'done' && (
                  <svg className="w-3 h-3 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-medium text-gray-800 ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[task.status]}`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                {task.description && (
                  <p className="text-sm text-gray-500 mt-1 truncate">{task.description}</p>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {task.assigneeName && <span>👤 {task.assigneeName}</span>}
                  {task.dueDate && <span>📅 {task.dueDate}</span>}
                </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => { setEditing(task); setShowModal(true); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
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
          title={editing ? 'Edit Task' : 'Add Task'}
          onClose={() => { setShowModal(false); setEditing(null); }}
        >
          <TaskForm
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
