import React, { useEffect, useState } from 'react';
import {
  CheckSquare, Clock, DollarSign, ShoppingCart, Users, Calendar, ArrowRight,
} from 'lucide-react';
import { tasksApi, expensesApi, membersApi, shoppingApi, eventsApi } from '../api/api';

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={24} className={iconColor} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-green-100 text-green-700',
};

const STATUS_BADGE = {
  'pending':     'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'done':        'bg-green-100 text-green-700',
};

const CATEGORY_ICONS = {
  chores:      '🧹',
  bills:       '💳',
  social:      '🎉',
  maintenance: '🔧',
  general:     '📅',
};

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [taskSummary, budgetSummary, members, remaining, tasks, upcomingEvents] = await Promise.all([
          tasksApi.getSummary(),
          expensesApi.getSummary(),
          membersApi.getAll(),
          shoppingApi.getRemaining(),
          tasksApi.getAll(),
          eventsApi.getUpcoming(4),
        ]);
        setData({
          taskSummary,
          budgetSummary,
          memberCount: members.length,
          remaining: remaining.count,
          recentTasks: tasks.filter(t => t.status !== 'done').slice(0, 4),
          upcomingEvents,
        });
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const { taskSummary, budgetSummary, memberCount, remaining, recentTasks, upcomingEvents } = data || {};

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening at home.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="xl:col-span-2">
          <StatCard
            icon={CheckSquare}
            label="Total Tasks"
            value={taskSummary?.total ?? 0}
            sub={`${taskSummary?.done ?? 0} completed`}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />
        </div>
        <div className="xl:col-span-2">
          <StatCard
            icon={Clock}
            label="Pending Tasks"
            value={taskSummary?.pending ?? 0}
            sub={`${taskSummary?.inProgress ?? 0} in progress`}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-600"
          />
        </div>
        <div className="xl:col-span-2">
          <StatCard
            icon={ShoppingCart}
            label="Shopping Remaining"
            value={remaining ?? 0}
            sub="items to buy"
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
          />
        </div>
        <div className="xl:col-span-2">
          <StatCard
            icon={DollarSign}
            label="Total Income"
            value={`$${(budgetSummary?.totalIncome ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            sub="tracked income"
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
        </div>
        <div className="xl:col-span-2">
          <StatCard
            icon={DollarSign}
            label="Total Expenses"
            value={`$${(budgetSummary?.totalExpenses ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            sub="tracked expenses"
            iconBg="bg-red-50"
            iconColor="text-red-600"
          />
        </div>
        <div className="xl:col-span-2">
          <StatCard
            icon={Users}
            label="Members"
            value={memberCount ?? 0}
            sub="household members"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Upcoming Tasks</h2>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {!recentTasks?.length ? (
            <p className="text-gray-400 text-sm text-center py-6">No pending tasks 🎉</p>
          ) : (
            <ul className="space-y-3">
              {recentTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">{task.title}</p>
                    {task.assigneeName && (
                      <p className="text-xs text-gray-400 mt-0.5">👤 {task.assigneeName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[task.status]}`}>
                      {task.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Upcoming Events</h2>
            <button
              onClick={() => onNavigate('events')}
              className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {!upcomingEvents?.length ? (
            <p className="text-gray-400 text-sm text-center py-6">No upcoming events</p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map(event => (
                <li key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="text-xl shrink-0">{CATEGORY_ICONS[event.category] || '📅'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-700 truncate">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      📅 {event.date}{event.time ? ` · ${event.time}` : ''}
                      {event.assigneeName ? ` · 👤 ${event.assigneeName}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick access */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { page: 'tasks',    icon: CheckSquare, label: 'Tasks',    bg: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' },
              { page: 'shopping', icon: ShoppingCart,label: 'Shopping', bg: 'bg-orange-50 hover:bg-orange-100 text-orange-700' },
              { page: 'members',  icon: Users,        label: 'Members',  bg: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
              { page: 'budget',   icon: DollarSign,   label: 'Budget',   bg: 'bg-green-50 hover:bg-green-100 text-green-700' },
              { page: 'events',   icon: Calendar,     label: 'Events',   bg: 'bg-sky-50 hover:bg-sky-100 text-sky-700' },
            ].map(({ page, icon: Icon, label, bg }) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl font-medium text-sm transition-colors ${bg}`}
              >
                <Icon size={24} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
