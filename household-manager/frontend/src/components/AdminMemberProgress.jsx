import React, { useEffect, useState, useCallback } from 'react';
import { membersApi, tasksApi, taskLogsApi } from '../api/api';
import { Users, CheckCircle, BarChart2, TrendingUp } from 'lucide-react';

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysInRange(from, to) {
  const days = [];
  let cur = from;
  while (cur <= to) { days.push(cur); cur = addDays(cur, 1); }
  return days;
}

// Mini bar chart SVG
function MiniBar({ data, color, height = 80 }) {
  if (!data || data.length === 0)
    return <p className="text-xs text-gray-400 text-center py-3">No data</p>;

  const max   = Math.max(...data.map(d => d.count), 1);
  const barW  = Math.max(6, Math.floor(400 / data.length) - 3);
  const svgW  = data.length * (barW + 3);
  const padB  = 18;
  const chartH = height - padB;

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(svgW, 200)} height={height}>
        {data.map((d, i) => {
          const bh = Math.max(2, (d.count / max) * chartH);
          const x  = i * (barW + 3);
          const y  = chartH - bh;
          const lbl = d.label.slice(5);  // strip year
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={bh} rx={2} fill={color} opacity={0.8} />
              {d.count > 0 && (
                <text x={x + barW/2} y={y - 2} textAnchor="middle" fontSize={7} fill="#374151" fontWeight="600">
                  {d.count}
                </text>
              )}
              {(data.length <= 10 || i % Math.ceil(data.length / 7) === 0) && (
                <text x={x + barW/2} y={chartH + 13} textAnchor="middle" fontSize={7} fill="#94a3b8">
                  {lbl}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MemberCard({ member, allTasks, from, to }) {
  const [summary, setSummary] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    taskLogsApi.getSummary({ memberId: member.id, from, to })
      .then(setSummary)
      .catch(console.error);
  }, [member.id, from, to]);

  const myTasks    = allTasks.filter(t => t.assignedTo === member.id);
  const doneTasks  = myTasks.filter(t => t.status === 'done').length;
  const days       = daysInRange(from, to).length;
  const avg        = summary ? (summary.total / Math.max(days, 1)).toFixed(1) : '—';

  // Fill daily
  const dailyFilled = (() => {
    if (!summary?.daily) return [];
    const map = Object.fromEntries(summary.daily.map(d => [d.label, d.count]));
    return daysInRange(from, to).map(day => ({ label: day, count: map[day] || 0 }));
  })();

  function initials(name) {
    return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: member.avatarColor }}
        >
          {initials(member.name)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800">{member.name}</p>
          <p className="text-xs text-gray-400 capitalize">{member.role}</p>
        </div>

        {/* Mini KPIs */}
        <div className="hidden sm:flex items-center gap-4 text-center">
          <div>
            <p className="text-lg font-extrabold text-indigo-600">{summary?.total ?? '—'}</p>
            <p className="text-xs text-gray-400">completions</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-emerald-600">{avg}</p>
            <p className="text-xs text-gray-400">avg/day</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-gray-700">{myTasks.length}</p>
            <p className="text-xs text-gray-400">tasks</p>
          </div>
        </div>

        {/* Expand icon */}
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {/* Task list */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Assigned Tasks ({myTasks.length})
            </p>
            {myTasks.length === 0 ? (
              <p className="text-sm text-gray-400">No tasks assigned</p>
            ) : (
              <div className="space-y-1.5">
                {myTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      t.status === 'done' ? 'bg-green-500'
                      : t.status === 'in-progress' ? 'bg-blue-400'
                      : 'bg-gray-300'
                    }`} />
                    <span className={t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}>
                      {t.title}
                    </span>
                    {t.recurring && (
                      <span className="text-xs text-indigo-500 ml-auto">🔄 daily</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completion chart */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Daily Completions
            </p>
            <MiniBar data={dailyFilled} color={member.avatarColor} />
          </div>

          {/* Weekly breakdown if available */}
          {summary?.weekly?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Weekly Completions
              </p>
              <MiniBar data={summary.weekly} color={member.avatarColor} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminMemberProgress() {
  const today    = new Date().toISOString().slice(0, 10);
  const [from,   setFrom]    = useState(addDays(today, -29));
  const [to,     setTo]      = useState(today);
  const [preset, setPreset]  = useState('30d');
  const [members, setMembers] = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  const PRESETS = [
    { id: '7d',     label: 'Last 7 days',  from: addDays(today,-6),  to: today },
    { id: '30d',    label: 'Last 30 days', from: addDays(today,-29), to: today },
    { id: 'month',  label: 'This month',   from: today.slice(0,7)+'-01', to: today },
    { id: 'custom', label: 'Custom',       from, to },
  ];

  useEffect(() => {
    Promise.all([membersApi.getAll(), tasksApi.getAll()])
      .then(([m, t]) => { setMembers(m); setTasks(t); })
      .catch(e => console.error('AdminMemberProgress load error:', e))
      .finally(() => setLoading(false));
  }, []);

  function applyPreset(pid) {
    setPreset(pid);
    if (pid === 'custom') return;
    const p = PRESETS.find(x => x.id === pid);
    if (p) { setFrom(p.from); setTo(p.to); }
  }

  const regularMembers = members.filter(m => m.role === 'member');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
          <Users size={16} className="text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">Member Progress</h2>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-2 flex-wrap mb-3">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                preset === p.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">From</label>
            <input type="date" value={from} max={to}
              onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">To</label>
            <input type="date" value={to} min={from} max={today}
              onChange={e => { setTo(e.target.value); setPreset('custom'); }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      </div>

      {regularMembers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          <p>No regular members yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {regularMembers.map(m => (
            <MemberCard key={m.id} member={m} allTasks={tasks} from={from} to={to} />
          ))}
        </div>
      )}
    </div>
  );
}
