import React, { useEffect, useState } from 'react';
import { tasksApi, taskLogsApi } from '../../api/api';
import { CheckCircle, Circle, RefreshCw } from 'lucide-react';

const PRIORITY_STYLE = {
  high:   { badge: 'bg-red-100 text-red-700',      label: 'High'   },
  medium: { badge: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
  low:    { badge: 'bg-green-100 text-green-700',   label: 'Low'    },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function MemberTasks({ member }) {
  const [tasks,     setTasks]     = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [ticking,   setTicking]   = useState(null);
  const [note,      setNote]      = useState('');
  const [noteTask,  setNoteTask]  = useState(null);
  const [toast,     setToast]     = useState(null);

  // ── load ──────────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const today = todayStr();
      const [allTasks, logs] = await Promise.all([
        tasksApi.getAll(),
        taskLogsApi.getAll({ memberId: member.id, from: today, to: today }),
      ]);
      setTasks((allTasks || []).filter(t => t.assignedTo === member.id));
      setTodayLogs(logs || []);
    } catch (e) {
      console.error('MemberTasks load error:', e);
      setError(e.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  // Run once on mount — NO useCallback, NO [load] dependency
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function confirmTick() {
    if (!noteTask) return;
    setTicking(noteTask.id);
    try {
      await taskLogsApi.create({ taskId: noteTask.id, memberId: member.id, note });
      showToast(`"${noteTask.title}" marked done! ✅`);
      setNoteTask(null);
      setNote('');
      await load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setTicking(null);
    }
  }

  async function handleUndo(task) {
    const log = todayLogs.find(l => l.taskId === task.id);
    if (!log) return;
    setTicking(task.id);
    try {
      await taskLogsApi.delete(log.id);
      await tasksApi.update(task.id, { status: 'pending' });
      showToast(`"${task.title}" undone`);
      await load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setTicking(null);
    }
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const doneToday    = tasks.filter(t => todayLogs.some(l => l.taskId === t.id));
  const pendingToday = tasks.filter(t => !todayLogs.some(l => l.taskId === t.id));

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-sm text-gray-400">Loading tasks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4">
        <p className="text-gray-700 font-semibold text-sm">Could not load tasks</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">{error}</p>
        <button onClick={load}
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Today's Tasks</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Donut summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5">
        <DonutChart done={doneToday.length} total={tasks.length} color={member.avatarColor} />
        <div className="flex-1">
          <p className="text-2xl font-extrabold text-gray-800">
            {doneToday.length}<span className="text-gray-300 font-normal">/{tasks.length}</span>
          </p>
          <p className="text-sm text-gray-500 mt-0.5">Tasks completed today</p>
          {tasks.length > 0 && pendingToday.length === 0 && (
            <p className="text-xs text-green-600 font-semibold mt-1">🎉 All done for today!</p>
          )}
          {pendingToday.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{pendingToday.length} remaining</p>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🎉</div>
          <p>No tasks assigned to you yet.</p>
        </div>
      ) : (
        <>
          {pendingToday.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Pending ({pendingToday.length})
              </h3>
              <div className="space-y-3">
                {pendingToday.map(task => (
                  <TaskCard key={task.id} task={task} done={false}
                    ticking={ticking === task.id}
                    onTick={() => { setNoteTask(task); setNote(''); }}
                    onUndo={() => handleUndo(task)} />
                ))}
              </div>
            </div>
          )}

          {doneToday.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Done Today ({doneToday.length})
              </h3>
              <div className="space-y-3">
                {doneToday.map(task => (
                  <TaskCard key={task.id} task={task} done={true}
                    log={todayLogs.find(l => l.taskId === task.id)}
                    ticking={ticking === task.id}
                    onTick={() => { setNoteTask(task); setNote(''); }}
                    onUndo={() => handleUndo(task)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Note confirm dialog */}
      {noteTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setNoteTask(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 fade-in">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Mark as Done</h3>
            <p className="text-sm text-gray-500 mb-4">"{noteTask.title}"</p>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              rows={3}
              placeholder="Add a note (optional)…"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button onClick={confirmTick} disabled={!!ticking}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                {ticking ? 'Saving…' : '✅ Mark Done'}
              </button>
              <button onClick={() => setNoteTask(null)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, done, log, ticking, onTick, onUndo }) {
  const p = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-4 transition-all ${
      done ? 'opacity-70 border-green-100' : 'border-gray-100 hover:shadow-md'
    }`}>
      <button onClick={done ? onUndo : onTick} disabled={ticking}
        className={`mt-0.5 shrink-0 transition-transform hover:scale-110 disabled:opacity-50 ${ticking ? 'animate-pulse' : ''}`}
        title={done ? 'Undo' : 'Mark done'}>
        {done
          ? <CheckCircle size={26} className="text-green-500" fill="#22c55e" />
          : <Circle     size={26} className="text-gray-300 hover:text-indigo-400" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-gray-800 ${done ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center flex-wrap gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.badge}`}>{p.label}</span>
          {task.recurring && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">🔄 Daily</span>
          )}
          {done && log?.note && (
            <span className="text-xs text-gray-400 italic truncate max-w-xs">"{log.note}"</span>
          )}
          {done && log?.completedAt && (
            <span className="text-xs text-green-500">
              ✓ {new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DonutChart ───────────────────────────────────────────────────────────────

function DonutChart({ done, total, color = '#6366f1' }) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? done / total : 0;
  const dash = circ * pct;
  return (
    <div className="relative shrink-0 w-20 h-20">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold text-gray-700">
          {total > 0 ? Math.round(pct * 100) : 0}%
        </span>
      </div>
    </div>
  );
}
