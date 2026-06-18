import React, { useEffect, useState } from 'react';
import { taskLogsApi, tasksApi } from '../../api/api';
import { BarChart2, TrendingUp, Calendar, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

// ─── Safe date helpers ────────────────────────────────────────────────────────

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(isoStr, n) {
  // Parse as UTC noon to avoid DST shifts
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Safe: max 366 days to prevent any possible hang
function daysInRange(from, to) {
  if (!from || !to || from > to) return [];
  const days = [];
  let cur = from;
  let safety = 0;
  while (cur <= to && safety < 366) {
    days.push(cur);
    cur = addDays(cur, 1);
    safety++;
  }
  return days;
}

// ─── Tiny chart components (pure SVG) ────────────────────────────────────────

function BarChartSVG({ data, color = '#6366f1' }) {
  if (!data || data.length === 0)
    return <p className="text-gray-400 text-sm text-center py-8">No completions in this range</p>;

  const height = 160;
  const padB = 28; const padT = 10;
  const chartH = height - padB - padT;
  const max    = Math.max(...data.map(d => d.count), 1);
  const barW   = Math.max(8, Math.min(36, Math.floor(540 / data.length) - 4));
  const gap    = 4;
  const svgW   = Math.max(300, data.length * (barW + gap));

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={height} className="block">
        {[0, 0.5, 1].map(f => {
          const y = padT + chartH * (1 - f);
          return <line key={f} x1={0} y1={y} x2={svgW} y2={y} stroke="#f1f5f9" strokeWidth={1} />;
        })}
        {data.map((d, i) => {
          const bh = Math.max(2, (d.count / max) * chartH);
          const x  = i * (barW + gap);
          const y  = padT + chartH - bh;
          const lbl = d.label.length >= 10 ? d.label.slice(5) : d.label;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh} rx={3} fill={color} opacity={0.85} />
              {d.count > 0 && (
                <text x={x + barW/2} y={y - 3} textAnchor="middle" fontSize={9} fill="#374151" fontWeight="600">
                  {d.count}
                </text>
              )}
              {(data.length <= 12 || i % Math.ceil(data.length / 10) === 0) && (
                <text x={x + barW/2} y={height - 6} textAnchor="middle" fontSize={8} fill="#94a3b8">
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

function LineChartSVG({ data, color = '#6366f1' }) {
  if (!data || data.length === 0)
    return <p className="text-gray-400 text-sm text-center py-8">No completions in this range</p>;

  const height = 160;
  const padL = 20; const padR = 10; const padT = 16; const padB = 24;
  const svgW   = Math.max(300, data.length * 26);
  const chartW = svgW - padL - padR;
  const chartH = height - padT - padB;
  const max    = Math.max(...data.map(d => d.count), 1);

  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - (d.count / max) * chartH,
    ...d,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={height}>
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            {p.count > 0 && (
              <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={8} fill="#374151" fontWeight="600">
                {p.count}
              </text>
            )}
            {(data.length <= 10 || i % Math.ceil(data.length / 8) === 0) && (
              <text x={p.x} y={height - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">
                {p.label.length >= 10 ? p.label.slice(5) : p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function HorzBar({ label, count, max, color }) {
  const w = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className="truncate max-w-[70%]">{label}</span>
        <span className="font-semibold text-gray-700 ml-2">{count}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-extrabold text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

export default function MemberReports({ member }) {
  const today = isoToday();

  const [from,      setFrom]      = useState(addDays(today, -29));
  const [to,        setTo]        = useState(today);
  const [preset,    setPreset]    = useState('30d');
  const [view,      setView]      = useState('daily');
  const [chartType, setChartType] = useState('bar');
  const [summary,   setSummary]   = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [myTasks,   setMyTasks]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  async function load(f, t) {
    setLoading(true);
    setError(null);
    try {
      const [sumData, logData, allTasks] = await Promise.all([
        taskLogsApi.getSummary({ memberId: member.id, from: f, to: t }),
        taskLogsApi.getAll({ memberId: member.id, from: f, to: t }),
        tasksApi.getAll(),
      ]);
      setSummary(sumData || { total: 0, daily: [], weekly: [], monthly: [] });
      setLogs(logData || []);
      setMyTasks((allTasks || []).filter(tk => tk.assignedTo === member.id));
    } catch (e) {
      console.error('MemberReports error:', e);
      setError(e.message || 'Failed to load. Check backend is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const f = addDays(today, -29);
    const t = today;
    load(f, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(pid) {
    setPreset(pid);
    if (pid === 'custom') return;
    let f = today, t = today;
    if (pid === 'today') { f = today;                     t = today; }
    if (pid === '7d')    { f = addDays(today, -6);        t = today; }
    if (pid === '30d')   { f = addDays(today, -29);       t = today; }
    if (pid === 'month') { f = today.slice(0, 7) + '-01'; t = today; }
    setFrom(f); setTo(t);
    load(f, t);
  }

  // Build daily chart — fill gaps with zero
  function filledDaily() {
    if (!summary?.daily) return [];
    const map = Object.fromEntries(summary.daily.map(d => [d.label, d.count]));
    return daysInRange(from, to).map(day => ({ label: day, count: map[day] || 0 }));
  }

  const taskCounts = myTasks.map(tk => ({
    id: tk.id, title: tk.title, priority: tk.priority,
    count: logs.filter(l => l.taskId === tk.id).length,
  })).sort((a, b) => b.count - a.count);

  const maxCount  = Math.max(...taskCounts.map(t => t.count), 1);
  const totalDays = daysInRange(from, to).length;

  const chartData = view === 'daily'
    ? filledDaily()
    : view === 'weekly'  ? (summary?.weekly  || [])
    : (summary?.monthly || []);

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-sm text-gray-400">Loading reports…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-gray-700 font-semibold">Could not load reports</p>
        <p className="text-xs text-gray-400 max-w-xs">{error}</p>
        <button onClick={() => load(from, to)}
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          Retry
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fade-in space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">Task completion history</p>
        </div>
        <button onClick={() => load(from, to)}
          className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Date Range</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d',    label: 'Last 7 days' },
            { id: '30d',   label: 'Last 30 days' },
            { id: 'month', label: 'This month' },
            { id: 'custom',label: 'Custom' },
          ].map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                preset === p.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" value={from} max={to}
            onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <label className="text-xs text-gray-500">To</label>
          <input type="date" value={to} min={from} max={today}
            onChange={e => { setTo(e.target.value); setPreset('custom'); }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          {preset === 'custom' && (
            <button onClick={() => load(from, to)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
              Apply
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CheckCircle} label="Completions"   value={summary?.total ?? 0}  color="bg-indigo-500" />
        <StatCard icon={Calendar}    label="Days in Range" value={totalDays}             color="bg-sky-500" />
        <StatCard icon={TrendingUp}  label="Avg / Day"
          value={totalDays > 0 ? ((summary?.total ?? 0) / totalDays).toFixed(1) : '0'}  color="bg-emerald-500" />
        <StatCard icon={BarChart2}   label="Tasks Assigned" value={myTasks.length}       color="bg-purple-500" />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-gray-800">Completion Trend</h3>
          <div className="flex gap-1 flex-wrap">
            {['daily','weekly','monthly'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {v}
              </button>
            ))}
            <div className="w-px bg-gray-200 mx-1" />
            {['bar','line'].map(ct => (
              <button key={ct} onClick={() => setChartType(ct)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  chartType === ct ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {ct}
              </button>
            ))}
          </div>
        </div>
        {chartType === 'bar'
          ? <BarChartSVG data={chartData} color={member.avatarColor || '#6366f1'} />
          : <LineChartSVG data={chartData} color={member.avatarColor || '#6366f1'} />
        }
      </div>

      {/* Per-task breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Completions per Task</h3>
        {taskCounts.length === 0
          ? <p className="text-gray-400 text-sm text-center py-4">No task data</p>
          : taskCounts.map(t => (
              <HorzBar key={t.id} label={t.title} count={t.count}
                max={maxCount} color={PRIORITY_COLOR[t.priority] || '#6366f1'} />
            ))
        }
      </div>

      {/* Activity log */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">
          Activity Log
          <span className="ml-2 text-sm font-normal text-gray-400">({logs.length})</span>
        </h3>
        {logs.length === 0
          ? <p className="text-gray-400 text-sm text-center py-4">No completions in this range</p>
          : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <CheckCircle size={15} className="text-green-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{log.taskTitle}</p>
                    {log.note && <p className="text-xs text-gray-400 italic mt-0.5">"{log.note}"</p>}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                    {new Date(log.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )
        }
      </div>

    </div>
  );
}
