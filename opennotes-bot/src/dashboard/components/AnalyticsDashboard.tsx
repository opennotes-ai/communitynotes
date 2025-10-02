import React, { useState, useEffect } from 'react';
import { MetricsCard } from './MetricsCard';
import { ChartContainer } from './ChartContainer';
import { ServerSelector } from './ServerSelector';
import { DateRangePicker } from './DateRangePicker';
import { ExportButton } from './ExportButton';

interface AnalyticsData {
  conversion: {
    totalRequests: number;
    totalNotes: number;
    conversionRate: number;
    breakdown: {
      byDay: Array<{ timestamp: Date; value: number; metadata?: any }>;
      byServer: Array<{
        serverId: string;
        serverName: string;
        requests: number;
        notes: number;
        conversionRate: number;
      }>;
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
  trends: Array<{
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
    significance: 'high' | 'medium' | 'low';
    description: string;
  }>;
  lastUpdated: string;
}

interface AnalyticsDashboardProps {
  refreshTrigger?: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ refreshTrigger }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        ...(selectedServer && { serverId: selectedServer })
      });

      const response = await fetch(`/api/analytics/dashboard-data?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [refreshTrigger, selectedServer, dateRange]);

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const response = await fetch('/api/analytics/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: `Analytics Report - ${selectedServer ? 'Server Specific' : 'Global'}`,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          ...(selectedServer && { serverId: selectedServer })
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
      a.download = `analytics-report-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
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
            <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchAnalyticsData}
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
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-600">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <ServerSelector
            selectedServer={selectedServer}
            onServerChange={setSelectedServer}
          />
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      {/* Trends Section */}
      {data.trends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.trends.map((trend, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  trend.direction === 'increasing'
                    ? 'border-green-400 bg-green-50'
                    : trend.direction === 'decreasing'
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-400 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{trend.metric}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      trend.significance === 'high'
                        ? 'bg-red-100 text-red-800'
                        : trend.significance === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {trend.significance}
                  </span>
                </div>
                <p className={`text-lg font-semibold mt-1 ${
                  trend.direction === 'increasing'
                    ? 'text-green-700'
                    : trend.direction === 'decreasing'
                    ? 'text-red-700'
                    : 'text-gray-700'
                }`}>
                  {trend.direction === 'increasing' ? '↗' : trend.direction === 'decreasing' ? '↘' : '→'} {trend.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600 mt-1">{trend.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversion Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Request to Note Conversion</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricsCard
            title="Total Requests"
            value={data.conversion.totalRequests.toLocaleString()}
            icon="📝"
          />
          <MetricsCard
            title="Notes Created"
            value={data.conversion.totalNotes.toLocaleString()}
            icon="📄"
          />
          <MetricsCard
            title="Conversion Rate"
            value={`${data.conversion.conversionRate}%`}
            icon="🔄"
            trend={data.conversion.conversionRate > 10 ? 'up' : data.conversion.conversionRate < 5 ? 'down' : 'stable'}
          />
        </div>

        {data.conversion.breakdown.byDay.length > 0 && (
          <ChartContainer
            title="Conversion Trend"
            data={data.conversion.breakdown.byDay}
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
            value={data.engagement.totalUsers.toLocaleString()}
            icon="👥"
          />
          <MetricsCard
            title="Active Users (30d)"
            value={data.engagement.activeUsers.toLocaleString()}
            icon="🔥"
          />
          <MetricsCard
            title="Contributors"
            value={data.engagement.contributorCount.toLocaleString()}
            icon="✍️"
          />
          <MetricsCard
            title="Raters"
            value={data.engagement.raterCount.toLocaleString()}
            icon="⭐"
          />
        </div>

        {data.engagement.topContributors.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Top Contributors</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ratings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Helpfulness
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.engagement.topContributors.slice(0, 5).map((contributor, index) => (
                    <tr key={contributor.userId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1} {contributor.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contributor.notesCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contributor.ratingsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contributor.helpfulnessScore.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Note Effectiveness */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Note Effectiveness</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricsCard
            title="Avg Helpfulness"
            value={data.effectiveness.averageHelpfulnessRatio.toFixed(2)}
            icon="📊"
          />
          <MetricsCard
            title="Visible Notes"
            value={data.effectiveness.totalVisibleNotes.toLocaleString()}
            icon="👁️"
          />
          <MetricsCard
            title="Hidden Notes"
            value={data.effectiveness.totalHiddenNotes.toLocaleString()}
            icon="🚫"
          />
          <MetricsCard
            title="Effectiveness Rate"
            value={`${data.effectiveness.effectivenessRate}%`}
            icon="✅"
            trend={data.effectiveness.effectivenessRate > 70 ? 'up' : data.effectiveness.effectivenessRate < 50 ? 'down' : 'stable'}
          />
        </div>

        {Object.keys(data.effectiveness.breakdown.byStatus).length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Notes by Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(data.effectiveness.breakdown.byStatus).map(([status, count]) => (
                <div key={status} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 capitalize">{status}</p>
                  <p className="text-lg font-semibold text-gray-700">{count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Avg Response Time"
            value={`${data.performance.responseTime.average}ms`}
            icon="⚡"
            trend={data.performance.responseTime.average < 500 ? 'up' : data.performance.responseTime.average > 1000 ? 'down' : 'stable'}
          />
          <MetricsCard
            title="Error Rate"
            value={`${data.performance.errorRate.percentage}%`}
            icon="🚨"
            trend={data.performance.errorRate.percentage < 1 ? 'up' : data.performance.errorRate.percentage > 5 ? 'down' : 'stable'}
          />
          <MetricsCard
            title="Uptime"
            value={`${data.performance.uptime.percentage}%`}
            icon="🟢"
            trend={data.performance.uptime.percentage > 99 ? 'up' : data.performance.uptime.percentage < 95 ? 'down' : 'stable'}
          />
        </div>
      </div>
    </div>
  );
};