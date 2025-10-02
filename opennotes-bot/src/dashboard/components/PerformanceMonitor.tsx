import React, { useState, useEffect } from 'react';
import { MetricsCard } from './MetricsCard';
import { ChartContainer } from './ChartContainer';

interface PerformanceData {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
    trend: Array<{ timestamp: Date; value: number }>;
  };
  throughput: {
    requestsPerSecond: number;
    notesPerSecond: number;
    trend: Array<{ timestamp: Date; value: number }>;
  };
  errorRate: {
    percentage: number;
    trend: Array<{ timestamp: Date; value: number }>;
  };
  uptime: {
    percentage: number;
    downtimeEvents: Array<{
      startTime: Date;
      endTime: Date;
      duration: number;
      reason?: string;
    }>;
  };
  systemHealth: {
    database: {
      status: 'healthy' | 'warning' | 'critical';
      connectionCount: number;
      averageQueryTime: number;
    };
    redis: {
      status: 'healthy' | 'warning' | 'critical';
      memoryUsage: number;
      hitRate: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      loadAverage: number;
    };
  };
}

interface PerformanceMonitorProps {
  refreshTrigger?: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ refreshTrigger }) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPerformanceData = async () => {
    try {
      setError(null);

      const [performanceResponse, healthResponse] = await Promise.all([
        fetch('/api/analytics/performance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch('/api/health/detailed', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (!performanceResponse.ok || !healthResponse.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const [performanceData, healthData] = await Promise.all([
        performanceResponse.json(),
        healthResponse.json()
      ]);

      setData({
        ...performanceData,
        systemHealth: {
          database: {
            status: healthData.detailed?.database?.status || 'healthy',
            connectionCount: healthData.detailed?.database?.connections || 0,
            averageQueryTime: healthData.detailed?.database?.averageQueryTime || 0
          },
          redis: {
            status: healthData.detailed?.redis?.status || 'healthy',
            memoryUsage: healthData.detailed?.redis?.memoryUsage || 0,
            hitRate: healthData.detailed?.redis?.hitRate || 0
          },
          memory: {
            used: 0,
            total: 0,
            percentage: 0
          },
          cpu: {
            usage: 0,
            loadAverage: 0
          }
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading performance data...</p>
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
            <h3 className="text-sm font-medium text-red-800">Error loading performance data</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchPerformanceData}
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
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitor</h2>
          <p className="text-sm text-gray-600">
            Real-time system performance and health metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">Auto-refresh (30s)</span>
          </label>
          <button
            onClick={fetchPerformanceData}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Database</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(data.systemHealth.database.status)}`}>
                {getStatusIcon(data.systemHealth.database.status)} {data.systemHealth.database.status}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Connections: {data.systemHealth.database.connectionCount}</p>
              <p className="text-xs text-gray-600">Avg Query: {data.systemHealth.database.averageQueryTime}ms</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Redis Cache</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(data.systemHealth.redis.status)}`}>
                {getStatusIcon(data.systemHealth.redis.status)} {data.systemHealth.redis.status}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Memory: {data.systemHealth.redis.memoryUsage}MB</p>
              <p className="text-xs text-gray-600">Hit Rate: {data.systemHealth.redis.hitRate}%</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Memory</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${
                data.systemHealth.memory.percentage < 80 ? 'text-green-600 bg-green-100' :
                data.systemHealth.memory.percentage < 90 ? 'text-yellow-600 bg-yellow-100' :
                'text-red-600 bg-red-100'
              }`}>
                {data.systemHealth.memory.percentage}%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Used: {data.systemHealth.memory.used}GB</p>
              <p className="text-xs text-gray-600">Total: {data.systemHealth.memory.total}GB</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">CPU</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${
                data.systemHealth.cpu.usage < 70 ? 'text-green-600 bg-green-100' :
                data.systemHealth.cpu.usage < 85 ? 'text-yellow-600 bg-yellow-100' :
                'text-red-600 bg-red-100'
              }`}>
                {data.systemHealth.cpu.usage}%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Load: {data.systemHealth.cpu.loadAverage}</p>
              <p className="text-xs text-gray-600">Usage: {data.systemHealth.cpu.usage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricsCard
            title="Avg Response Time"
            value={`${data.responseTime.average}ms`}
            icon="⚡"
            trend={data.responseTime.average < 500 ? 'up' : data.responseTime.average > 1000 ? 'down' : 'stable'}
            subtitle={`P95: ${data.responseTime.p95}ms, P99: ${data.responseTime.p99}ms`}
          />
          <MetricsCard
            title="Requests/sec"
            value={data.throughput.requestsPerSecond.toFixed(1)}
            icon="📈"
            trend="stable"
          />
          <MetricsCard
            title="Error Rate"
            value={`${data.errorRate.percentage}%`}
            icon="🚨"
            trend={data.errorRate.percentage < 1 ? 'up' : data.errorRate.percentage > 5 ? 'down' : 'stable'}
          />
          <MetricsCard
            title="Uptime"
            value={`${data.uptime.percentage}%`}
            icon="🟢"
            trend={data.uptime.percentage > 99 ? 'up' : data.uptime.percentage < 95 ? 'down' : 'stable'}
          />
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.responseTime.trend.length > 0 && (
            <ChartContainer
              title="Response Time Trend"
              data={data.responseTime.trend}
              type="line"
              height={250}
            />
          )}

          {data.errorRate.trend.length > 0 && (
            <ChartContainer
              title="Error Rate Trend"
              data={data.errorRate.trend}
              type="area"
              height={250}
            />
          )}

          {data.throughput.trend.length > 0 && (
            <ChartContainer
              title="Throughput Trend"
              data={data.throughput.trend}
              type="line"
              height={250}
            />
          )}
        </div>
      </div>

      {/* Recent Downtime Events */}
      {data.uptime.downtimeEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Downtime Events</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.uptime.downtimeEvents.map((event, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(event.startTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(event.endTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round(event.duration / 60)} minutes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.reason || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};