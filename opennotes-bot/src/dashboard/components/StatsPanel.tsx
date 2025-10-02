import React, { useState, useEffect } from 'react';

interface DashboardStats {
  overview: {
    totalRequests: number;
    uniqueUsers: number;
    timeframe: number;
  };
  serverStats: Array<{
    serverId: string;
    serverName: string;
    requestCount: number;
    uniqueUsers: number;
  }>;
  trends: Array<{
    hour: string;
    requests: number;
    uniqueUsers: number;
  }>;
}

interface StatsPanelProps {
  timeframe: string;
  refreshTrigger: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  timeframe,
  refreshTrigger,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [timeframe, refreshTrigger]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('dashboard_token');
      const response = await fetch(
        `/api/dashboard/stats?timeframe=${timeframe}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Overview ({stats.overview.timeframe}h)
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Requests</span>
            <span className="text-lg font-semibold text-gray-900">
              {stats.overview.totalRequests}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Unique Users</span>
            <span className="text-lg font-semibold text-gray-900">
              {stats.overview.uniqueUsers}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg per User</span>
            <span className="text-lg font-semibold text-gray-900">
              {stats.overview.uniqueUsers > 0
                ? (stats.overview.totalRequests / stats.overview.uniqueUsers).toFixed(1)
                : '0'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Server Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Server Activity
        </h3>
        <div className="space-y-3">
          {stats.serverStats.length === 0 ? (
            <p className="text-sm text-gray-500">No activity in timeframe</p>
          ) : (
            stats.serverStats
              .sort((a, b) => b.requestCount - a.requestCount)
              .slice(0, 5)
              .map((server) => (
                <div key={server.serverId} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {server.serverName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {server.uniqueUsers} users
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {server.requestCount}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Activity Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Activity Trend
        </h3>
        <div className="space-y-2">
          {stats.trends.slice(-6).map((trend, index) => {
            const hour = new Date(trend.hour).getHours();
            const maxRequests = Math.max(...stats.trends.map(t => t.requests));
            const width = maxRequests > 0 ? (trend.requests / maxRequests) * 100 : 0;

            return (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 w-8">
                  {hour.toString().padStart(2, '0')}h
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${width}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 w-6">
                  {trend.requests}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};