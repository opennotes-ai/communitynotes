import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RequestFeed } from './components/RequestFeed';
import { Filters } from './components/Filters';
import { StatsPanel } from './components/StatsPanel';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import { useSocket } from './hooks/useSocket';

interface FilterOptions {
  serverId?: string;
  timeframe: string;
  minRequests: string;
  searchTerm: string;
}

const App: React.FC = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [filters, setFilters] = useState<FilterOptions>({
    timeframe: '24',
    minRequests: '1',
    searchTerm: ''
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<'dashboard' | 'admin'>('dashboard');

  // Socket connection for real-time updates
  useSocket(isAuthenticated, () => {
    setRefreshTrigger(prev => prev + 1);
  });

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!isAuthenticated) {
    return <AuthModal onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Toggle for Moderators */}
        {user?.permissions.isModerator && (
          <div className="mb-6">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeView === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Community Dashboard
                </button>
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeView === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Admin Controls
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content based on active view */}
        {activeView === 'admin' && user?.permissions.isModerator ? (
          <AdminDashboard user={user} serverId={filters.serverId} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Filters
                filters={filters}
                onFilterChange={handleFilterChange}
                onRefresh={triggerRefresh}
              />
              <StatsPanel
                timeframe={filters.timeframe}
                refreshTrigger={refreshTrigger}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <RequestFeed
                filters={filters}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;