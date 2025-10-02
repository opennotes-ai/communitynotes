import React, { useState, useEffect } from 'react';
import { MetricsCard } from './MetricsCard';
import { ChartContainer } from './ChartContainer';
import { DateRangePicker } from './DateRangePicker';
import { ExportButton } from './ExportButton';

interface ServerAnalyticsData {
  serverId: string;
  serverName: string;
  overview: {
    conversion: {
      totalRequests: number;
      totalNotes: number;
      conversionRate: number;
      breakdown: {
        byDay: Array<{ timestamp: Date; value: number; metadata?: any }>;
      };
    };
    engagement: {
      totalUsers: number;
      activeUsers: number;
      contributorCount: number;
      raterCount: number;
      topContributors: Array<{
        userId: string;
        username: string;
        notesCount: number;
        ratingsCount: number;
        helpfulnessScore: number;
      }>;
    };
    effectiveness: {
      averageHelpfulnessRatio: number;
      totalVisibleNotes: number;
      totalHiddenNotes: number;
      effectivenessRate: number;
      breakdown: {
        byStatus: Record<string, number>;
      };
    };
    performance: {
      responseTime: {
        average: number;
        p95: number;
        p99: number;
      };
      errorRate: {
        percentage: number;
      };
      uptime: {
        percentage: number;
      };
    };
  };
}

interface ServerAnalyticsViewProps {
  serverId: string;
  serverName: string;
  refreshTrigger?: number;
}

export const ServerAnalyticsView: React.FC<ServerAnalyticsViewProps> = ({
  serverId,
  serverName,
  refreshTrigger
}) => {
  const [data, setData] = useState<ServerAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  const fetchServerAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });

      const response = await fetch(`/api/analytics/server/${serverId}/overview?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch server analytics data');
      }

      const serverData = await response.json();
      setData(serverData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerAnalytics();
  }, [refreshTrigger, serverId, dateRange]);

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const response = await fetch('/api/analytics/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: `Server Analytics Report - ${serverName}`,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          serverId: serverId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();

      const downloadResponse = await fetch(result.downloadUrls[format], {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!downloadResponse.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${serverName}-analytics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading server analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading server analytics</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchServerAnalytics}
              className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Server Analytics: {data.serverName}</h2>
          <p className="text-sm text-gray-600">
            Detailed analytics for server: {data.serverId}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      {/* Server Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Server Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🏠</div>
              <div>
                <p className="text-sm font-medium text-blue-900">Server</p>
                <p className="text-lg font-bold text-blue-800">{data.serverName}</p>
                <p className="text-xs text-blue-600">ID: {data.serverId.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">👥</div>
              <div>
                <p className="text-sm font-medium text-green-900">Active Users</p>
                <p className="text-lg font-bold text-green-800">{data.overview.engagement.activeUsers}</p>
                <p className="text-xs text-green-600">Last 30 days</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📝</div>
              <div>
                <p className="text-sm font-medium text-purple-900">Notes Created</p>
                <p className="text-lg font-bold text-purple-800">{data.overview.conversion.totalNotes}</p>
                <p className="text-xs text-purple-600">Current period</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⭐</div>
              <div>
                <p className="text-sm font-medium text-yellow-900">Effectiveness</p>
                <p className="text-lg font-bold text-yellow-800">{data.overview.effectiveness.effectivenessRate}%</p>
                <p className="text-xs text-yellow-600">Note visibility rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricsCard
            title="Total Requests"
            value={data.overview.conversion.totalRequests.toLocaleString()}
            icon="📝"
          />
          <MetricsCard
            title="Notes Created"
            value={data.overview.conversion.totalNotes.toLocaleString()}
            icon="📄"
          />
          <MetricsCard
            title="Conversion Rate"
            value={`${data.overview.conversion.conversionRate}%`}
            icon="🔄"
            trend={calculateTrend(data.overview.conversion.conversionRate, 10)}
          />
        </div>

        {data.overview.conversion.breakdown.byDay.length > 0 && (
          <ChartContainer
            title="Daily Conversion Trend"
            data={data.overview.conversion.breakdown.byDay}
            type="line"
          />
        )}
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Community Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricsCard
            title="Total Users"
            value={data.overview.engagement.totalUsers.toLocaleString()}
            icon="👥"
          />
          <MetricsCard
            title="Active Users"
            value={data.overview.engagement.activeUsers.toLocaleString()}
            icon="🔥"
          />
          <MetricsCard
            title="Contributors"
            value={data.overview.engagement.contributorCount.toLocaleString()}
            icon="✍️"
          />
          <MetricsCard
            title="Raters"
            value={data.overview.engagement.raterCount.toLocaleString()}
            icon="⭐"
          />
        </div>

        {data.overview.engagement.topContributors.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Top Contributors in Server</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.overview.engagement.topContributors.slice(0, 6).map((contributor, index) => (
                <div key={contributor.userId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">#{index + 1} {contributor.username}</h5>
                    <span className="text-xs text-gray-500">
                      Score: {contributor.helpfulnessScore.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{contributor.notesCount}</span> notes
                    </div>
                    <div>
                      <span className="font-medium">{contributor.ratingsCount}</span> ratings
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Note Effectiveness */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Note Quality & Effectiveness</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricsCard
            title="Avg Helpfulness"
            value={data.overview.effectiveness.averageHelpfulnessRatio.toFixed(2)}
            icon="📊"
          />
          <MetricsCard
            title="Visible Notes"
            value={data.overview.effectiveness.totalVisibleNotes.toLocaleString()}
            icon="👁️"
          />
          <MetricsCard
            title="Hidden Notes"
            value={data.overview.effectiveness.totalHiddenNotes.toLocaleString()}
            icon="🚫"
          />
          <MetricsCard
            title="Effectiveness Rate"
            value={`${data.overview.effectiveness.effectivenessRate}%`}
            icon="✅"
            trend={calculateTrend(data.overview.effectiveness.effectivenessRate, 60)}
          />
        </div>

        {Object.keys(data.overview.effectiveness.breakdown.byStatus).length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Notes by Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(data.overview.effectiveness.breakdown.byStatus).map(([status, count]) => (
                <div key={status} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 capitalize">{status}</p>
                  <p className="text-lg font-semibold text-gray-700">{count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Avg Response Time"
            value={`${data.overview.performance.responseTime.average}ms`}
            icon="⚡"
            trend={calculateTrend(data.overview.performance.responseTime.average, 500)}
          />
          <MetricsCard
            title="Error Rate"
            value={`${data.overview.performance.errorRate.percentage}%`}
            icon="🚨"
            trend={data.overview.performance.errorRate.percentage < 1 ? 'up' : data.overview.performance.errorRate.percentage > 5 ? 'down' : 'stable'}
          />
          <MetricsCard
            title="Uptime"
            value={`${data.overview.performance.uptime.percentage}%`}
            icon="🟢"
            trend={data.overview.performance.uptime.percentage > 99 ? 'up' : data.overview.performance.uptime.percentage < 95 ? 'down' : 'stable'}
          />
        </div>
      </div>
    </div>
  );
};