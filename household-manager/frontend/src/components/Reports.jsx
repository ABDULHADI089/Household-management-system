import React, { useEffect, useState } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, CheckSquare,
  ShoppingCart, Users, Calendar, DollarSign, Clock, AlertTriangle,
} from 'lucide-react';
import { tasksApi, expensesApi, membersApi, shoppingApi, eventsApi } from '../api/api';
import AdminMemberProgress from './AdminMemberProgress';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function currency(n) {
  return `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, color, children }) {
  return (
    <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-gray-100`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <h2 className="text-lg font-bold text-gray-800">{children}</h2>
    </div>
  );
}

function StatRow({ label, value, valueClass = 'text-gray-800' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-indigo-500', label, count }) {
  const width = pct(value, max);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className="capitalize">{label}</span>
        <span>{count} ({width}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MemberRow({ member, tasks, expenses }) {
  const myTasks    = tasks.filter(t => t.assignedTo === member.id);
  const doneTasks  = myTasks.filter(t => t.status === 'done').length;
  const myExpenses = expenses.filter(e => e.paidBy === member.id && e.type === 'expense');
  const totalSpent = myExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: member.avatarColor }}
      >
        {member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{member.name}</p>
        <p className="text-xs text-gray-400 capitalize">{member.role}</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{myTasks.length}</span> tasks
          {myTasks.length > 0 && (
            <span className="text-green-600 ml-1">({doneTasks} done)</span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          Spent: <span className="font-semibold text-red-600">{currency(totalSpent)}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reports() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('overview');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [tasks, expenses, members, shopping, events, taskSummary, expSummary] =
        await Promise.all([
          tasksApi.getAll(),
          expensesApi.getAll(),
          membersApi.getAll(),
          shoppingApi.getAll(),
          eventsApi.getAll(),
          tasksApi.getSummary(),
          expensesApi.getSummary(),
        ]);
      setData({ tasks, expenses, members, shopping, events, taskSummary, expSummary });
    } catch (e) {
      console.error('Reports load error:', e);
      setError(e.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        <p className="text-sm text-gray-400">Loading reports…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-gray-700 font-semibold">Could not load reports</p>
        <p className="text-sm text-gray-400 max-w-sm text-center">
          {error || 'Unknown error'}. Make sure the backend server is running on port 3001.
        </p>
        <button
          onClick={load}
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { tasks, expenses, members, shopping, events, taskSummary, expSummary } = data;

  // ── Derived stats ────────────────────────────────────────────────────────

  // Tasks by priority
  const tasksByPriority = {
    high:   tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low:    tasks.filter(t => t.priority === 'low').length,
  };

  // Overdue tasks (past due date, not done)
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');

  // Expense breakdown by category
  const expenseOnly = expenses.filter(e => e.type === 'expense');
  const categoryTotals = expenseOnly.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const totalExpenses = expSummary.totalExpenses || 0;
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  // Shopping stats
  const purchasedItems  = shopping.filter(i => i.purchased).length;
  const remainingItems  = shopping.filter(i => !i.purchased).length;
  const shoppingByCategory = shopping.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  // Events by category
  const upcomingEvents = events.filter(e => e.date >= today);
  const pastEvents     = events.filter(e => e.date < today);
  const eventsByCategory = events.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  // Category bar colors
  const BAR_COLORS = [
    'bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500',   'bg-green-500',  'bg-yellow-500', 'bg-orange-500',
  ];

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'tasks',     label: 'Tasks' },
    { id: 'budget',    label: 'Budget' },
    { id: 'shopping',  label: 'Shopping' },
    { id: 'members',   label: 'Members' },
    { id: 'events',    label: 'Events' },
    { id: 'progress',  label: '👥 Member Progress' },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">A full snapshot of your household activity</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors border border-gray-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Tasks',    value: taskSummary.total,     icon: CheckSquare, bg: 'bg-indigo-500' },
              { label: 'Tasks Done',     value: taskSummary.done,      icon: CheckSquare, bg: 'bg-green-500' },
              { label: 'Members',        value: members.length,        icon: Users,       bg: 'bg-purple-500' },
              { label: 'Total Income',   value: currency(expSummary.totalIncome),   icon: TrendingUp,   bg: 'bg-emerald-500' },
              { label: 'Total Expenses', value: currency(expSummary.totalExpenses), icon: TrendingDown, bg: 'bg-red-500' },
              { label: 'Balance',
                value: currency(expSummary.balance),
                icon: DollarSign,
                bg: expSummary.balance >= 0 ? 'bg-sky-500' : 'bg-orange-500' },
            ].map(({ label, value, icon: Icon, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={16} className="text-white" />
                </div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-800 leading-none">{value}</p>
              </div>
            ))}
          </div>

          {/* Overdue alert */}
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-700 text-sm">
                  {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {overdueTasks.slice(0, 3).map(t => (
                    <li key={t.id} className="text-xs text-red-600">
                      • {t.title} <span className="text-red-400">(due {t.dueDate})</span>
                    </li>
                  ))}
                  {overdueTasks.length > 3 && (
                    <li className="text-xs text-red-400">…and {overdueTasks.length - 3} more</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Quick summary grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={CheckSquare} color="bg-indigo-500">Task Status</SectionTitle>
              <ProgressBar label="Done"        count={taskSummary.done}       value={taskSummary.done}       max={taskSummary.total} color="bg-green-500" />
              <ProgressBar label="In Progress" count={taskSummary.inProgress} value={taskSummary.inProgress} max={taskSummary.total} color="bg-blue-500" />
              <ProgressBar label="Pending"     count={taskSummary.pending}    value={taskSummary.pending}    max={taskSummary.total} color="bg-yellow-400" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={ShoppingCart} color="bg-orange-500">Shopping</SectionTitle>
              <ProgressBar label="Purchased"  count={purchasedItems}  value={purchasedItems}  max={shopping.length} color="bg-orange-500" />
              <ProgressBar label="Remaining"  count={remainingItems}  value={remainingItems}  max={shopping.length} color="bg-gray-400" />
              <StatRow label="Total items" value={shopping.length} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={Calendar} color="bg-sky-500">Events</SectionTitle>
              <StatRow label="Total events"    value={events.length} />
              <StatRow label="Upcoming"        value={upcomingEvents.length} valueClass="text-indigo-600" />
              <StatRow label="Past"            value={pastEvents.length}     valueClass="text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* ── TASKS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={CheckSquare} color="bg-indigo-500">Task Status Breakdown</SectionTitle>
            <StatRow label="Total tasks"   value={taskSummary.total} />
            <StatRow label="Done"          value={taskSummary.done}       valueClass="text-green-600" />
            <StatRow label="In progress"   value={taskSummary.inProgress} valueClass="text-blue-600" />
            <StatRow label="Pending"       value={taskSummary.pending}    valueClass="text-yellow-600" />
            <StatRow label="Overdue"       value={overdueTasks.length}    valueClass={overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-800'} />
            <StatRow label="Completion rate" value={`${pct(taskSummary.done, taskSummary.total)}%`} valueClass="text-indigo-600" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={AlertTriangle} color="bg-yellow-500">Tasks by Priority</SectionTitle>
            <ProgressBar label="High"   count={tasksByPriority.high}   value={tasksByPriority.high}   max={taskSummary.total} color="bg-red-500" />
            <ProgressBar label="Medium" count={tasksByPriority.medium} value={tasksByPriority.medium} max={taskSummary.total} color="bg-yellow-400" />
            <ProgressBar label="Low"    count={tasksByPriority.low}    value={tasksByPriority.low}    max={taskSummary.total} color="bg-green-500" />
          </div>

          {overdueTasks.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
              <SectionTitle icon={Clock} color="bg-red-500">Overdue Tasks</SectionTitle>
              <div className="space-y-2">
                {overdueTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{task.title}</p>
                      {task.assigneeName && (
                        <p className="text-xs text-gray-400 mt-0.5">👤 {task.assigneeName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600 font-semibold">Due {task.dueDate}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700'
                        : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
            <SectionTitle icon={Users} color="bg-purple-500">Tasks per Member</SectionTitle>
            <div className="space-y-3">
              {members.map(member => {
                const mt    = tasks.filter(t => t.assignedTo === member.id);
                const done  = mt.filter(t => t.status === 'done').length;
                return (
                  <div key={member.id}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: member.avatarColor }}
                        />
                        {member.name}
                      </span>
                      <span>{done}/{mt.length} done</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${pct(done, mt.length || 1)}%`,
                          backgroundColor: member.avatarColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── BUDGET TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={DollarSign} color="bg-green-500">Financial Summary</SectionTitle>
            <StatRow label="Total income"   value={currency(expSummary.totalIncome)}   valueClass="text-green-600" />
            <StatRow label="Total expenses" value={currency(expSummary.totalExpenses)} valueClass="text-red-600" />
            <StatRow label="Balance"        value={currency(expSummary.balance)}
              valueClass={expSummary.balance >= 0 ? 'text-indigo-600' : 'text-orange-600'} />
            <StatRow label="Total entries"  value={expenses.length} />
            <StatRow label="Expense entries" value={expenseOnly.length} />
            <StatRow label="Income entries"  value={expenses.filter(e => e.type === 'income').length} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={TrendingDown} color="bg-red-500">Expenses by Category</SectionTitle>
            {sortedCategories.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No expense data</p>
            ) : (
              sortedCategories.map(([cat, total], i) => (
                <ProgressBar
                  key={cat}
                  label={`${cat} — ${currency(total)}`}
                  count={currency(total)}
                  value={total}
                  max={totalExpenses}
                  color={BAR_COLORS[i % BAR_COLORS.length]}
                />
              ))
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
            <SectionTitle icon={Users} color="bg-purple-500">Spending per Member</SectionTitle>
            {members.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No members</p>
            ) : (
              <div className="space-y-3">
                {members.map(member => {
                  const spent = expenseOnly
                    .filter(e => e.paidBy === member.id)
                    .reduce((s, e) => s + e.amount, 0);
                  return (
                    <div key={member.id}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: member.avatarColor }} />
                          {member.name}
                        </span>
                        <span className="font-semibold text-gray-700">{currency(spent)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${pct(spent, totalExpenses || 1)}%`,
                            backgroundColor: member.avatarColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SHOPPING TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'shopping' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={ShoppingCart} color="bg-orange-500">Shopping Summary</SectionTitle>
            <StatRow label="Total items"   value={shopping.length} />
            <StatRow label="Purchased"     value={purchasedItems}  valueClass="text-green-600" />
            <StatRow label="Remaining"     value={remainingItems}  valueClass="text-orange-600" />
            <StatRow label="Completion"    value={`${pct(purchasedItems, shopping.length)}%`} valueClass="text-indigo-600" />
            <div className="mt-4">
              <ProgressBar label="Purchased" count={purchasedItems} value={purchasedItems} max={shopping.length} color="bg-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={BarChart2} color="bg-cyan-500">Items by Category</SectionTitle>
            {Object.entries(shoppingByCategory).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => (
              <ProgressBar
                key={cat}
                label={cat}
                count={count}
                value={count}
                max={shopping.length}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── MEMBERS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-4xl font-bold text-indigo-600">{members.length}</p>
              <p className="text-sm text-gray-500 mt-1">Total Members</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-4xl font-bold text-purple-600">
                {members.filter(m => m.role === 'admin').length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Admins</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-4xl font-bold text-gray-600">
                {members.filter(m => m.role === 'member').length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Regular Members</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={Users} color="bg-purple-500">Member Activity</SectionTitle>
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No members yet</p>
              ) : (
                members.map(member => (
                  <MemberRow key={member.id} member={member} tasks={tasks} expenses={expenses} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EVENTS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={Calendar} color="bg-sky-500">Events Summary</SectionTitle>
            <StatRow label="Total events"  value={events.length} />
            <StatRow label="Upcoming"      value={upcomingEvents.length} valueClass="text-indigo-600" />
            <StatRow label="Past"          value={pastEvents.length}     valueClass="text-gray-400" />
            <StatRow label="Assigned"      value={events.filter(e => e.assignedTo).length} />
            <StatRow label="Unassigned"    value={events.filter(e => !e.assignedTo).length} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle icon={BarChart2} color="bg-pink-500">Events by Category</SectionTitle>
            {Object.entries(eventsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => (
              <ProgressBar
                key={cat}
                label={cat}
                count={count}
                value={count}
                max={events.length}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
          </div>

          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
              <SectionTitle icon={Calendar} color="bg-indigo-500">Upcoming Events</SectionTitle>
              <div className="space-y-2">
                {upcomingEvents.slice(0, 8).map(event => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-center bg-white rounded-lg w-10 p-1 shadow-sm border border-indigo-100">
                        <p className="text-xs text-indigo-400 font-medium">
                          {new Date(event.date + 'T00:00:00').toLocaleString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-base font-bold text-indigo-700 leading-none">
                          {new Date(event.date + 'T00:00:00').getDate()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{event.title}</p>
                        {event.assigneeName && (
                          <p className="text-xs text-gray-400">👤 {event.assigneeName}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium capitalize">
                      {event.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MEMBER PROGRESS TAB ──────────────────────────────────────────── */}
      {activeTab === 'progress' && <AdminMemberProgress />}

    </div>
  );
}
