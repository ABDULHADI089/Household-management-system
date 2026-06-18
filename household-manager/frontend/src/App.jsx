import React, { useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext';

// Admin pages
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Shopping from './components/Shopping';
import Members from './components/Members';
import Budget from './components/Budget';
import Events from './components/Events';
import Reports from './components/Reports';
import AdminProfile from './components/AdminProfile';

// Auth
import Login from './components/Login';
import SplashScreen from './components/SplashScreen';

// Member portal
import MemberPortal from './components/member/MemberPortal';

const ADMIN_PAGES = {
  dashboard: Dashboard,
  tasks:     Tasks,
  shopping:  Shopping,
  members:   Members,
  budget:    Budget,
  events:    Events,
  reports:   Reports,
  profile:   AdminProfile,
};

export default function App() {
  const { user, loading } = useAuth();
  const [showSplash,  setShowSplash]  = useState(true);
  const [activePage,  setActivePage]  = useState('dashboard');

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  // Still loading auth from localStorage
  if (loading) return null;

  // Show splash on first load
  if (showSplash) {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  // Not logged in → Login screen
  if (!user) {
    return <Login />;
  }

  // Member role → Member portal
  if (user.role === 'member') {
    return <MemberPortal />;
  }

  // Admin role → Full dashboard
  const PageComponent = ADMIN_PAGES[activePage] || Dashboard;

  return (
    <div className="min-h-screen bg-gray-50 fade-in">
      <Navbar activePage={activePage} onNavigate={setActivePage} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageComponent onNavigate={setActivePage} />
      </main>
    </div>
  );
}
