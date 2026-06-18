import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import MemberTasks from './MemberTasks';
import MemberReports from './MemberReports';
import MemberProfile from './MemberProfile';
import { CheckSquare, BarChart2, LogOut, Settings } from 'lucide-react';

const TABS = [
  { id: 'tasks',   label: 'My Tasks',   Icon: CheckSquare },
  { id: 'reports', label: 'My Reports', Icon: BarChart2 },
  { id: 'profile', label: 'Profile',    Icon: Settings },
];

export default function MemberPortal() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏠</span>
              <span className="font-bold text-gray-800 tracking-tight">Household Manager</span>
              <span className="hidden sm:inline-block text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium ml-1">
                Member
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: user.avatarColor || '#6366f1' }}
                >
                  {getInitials(user.name)}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">{user.name}</span>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                title="Sign out"
              >
                <LogOut size={16} />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 flex">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'tasks'   && <MemberTasks   member={user} />}
        {activeTab === 'reports' && <MemberReports member={user} />}
        {activeTab === 'profile' && <MemberProfile />}
      </div>
    </div>
  );
}
