import React, { useState, useEffect } from 'react';
import { User } from '../hooks/useAuth';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ServerAnalyticsView } from './ServerAnalyticsView';

interface AdminStats {
  totalRequests: number;
  totalNotes: number;
  pendingModeration: number;
  recentActions: Array<{
    id: string;
    action: string;
    timestamp: string;
    adminId: string;
    target?: string;
    details?: any;
  }>;
  topContributors: Array<{
    id: string;
    discordId: string;
    username: string;
    helpfulnessScore: number;
    totalNotes: number;
    totalRatings: number;
  }>;
  channelActivity: Array<{
    channelId: string;
    messageCount: number;
    requestCount: number;
  }>;
}

interface ModerationItem {
  id: string;
  itemType: string;
  itemId: string;
  flagType: string;
  flaggedBy: string;
  reason?: string;
  status: string;
  createdAt: string;
}

interface AdminDashboardProps {
  user: User;
  serverId?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, serverId }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user.permissions.isModerator && serverId) {
      fetchAdminData();
    }
  }, [user, serverId]);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('dashboard_token');

      const [statsResponse, moderationResponse] = await Promise.all([
        fetch(`/api/dashboard/admin/stats?serverId=${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/dashboard/admin/moderation?serverId=${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (moderationResponse.ok) {
        const moderationData = await moderationResponse.json();
        setModerationQueue(moderationData);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (itemId: string, action: string, actionTaken?: string) => {
    try {
      const token = localStorage.getItem('dashboard_token');

      const response = await fetch(`/api/dashboard/admin/moderation/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, actionTaken })
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to handle moderation action:', error);
    }
  };

  const handleChannelToggle = async (channelId: string, enabled: boolean) => {
    try {
      const token = localStorage.getItem('dashboard_token');

      const response = await fetch(`/api/dashboard/admin/channels`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          serverId,
          channelId,
          action: enabled ? 'enable' : 'disable'
        })
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to toggle channel:', error);
    }
  };

  const handleEmergencyAction = async (action: 'pause' | 'resume', reason?: string) => {
    try {
      const token = localStorage.getItem('dashboard_token');

      const response = await fetch(`/api/dashboard/admin/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ serverId, action, reason })
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to perform emergency action:', error);
    }
  };

  if (!user.permissions.isModerator) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">You need moderator permissions to access the admin dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'moderation', 'channels', 'emergency'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Total Requests</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalRequests}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Open Notes</h3>
              <p className="text-3xl font-bold text-green-600">{stats.totalNotes}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Pending Moderation</h3>
              <p className="text-3xl font-bold text-red-600">{stats.pendingModeration}</p>
            </div>
          </div>

          {/* Top Contributors */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h2>
            <div className="space-y-2">
              {stats.topContributors.slice(0, 5).map((contributor, index) => (
                <div key={contributor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-600">#{index + 1}</span>
                    <span className="font-medium">{contributor.username}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Score: {contributor.helpfulnessScore.toFixed(1)} | Notes: {contributor.totalNotes}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Admin Actions</h2>
            <div className="space-y-2">
              {stats.recentActions.slice(0, 10).map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{action.action.replace('_', ' ')}</span>
                    {action.target && <span className="text-gray-600 ml-2">({action.target})</span>}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(action.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Moderation Tab */}
      {activeTab === 'moderation' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Moderation Queue</h2>

          {moderationQueue.length === 0 ? (
            <p className="text-gray-500">No items pending moderation.</p>
          ) : (
            <div className="space-y-4">
              {moderationQueue.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-medium text-red-600">{item.flagType}</span>
                      <span className="text-gray-600 ml-2">({item.itemType})</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {item.reason && (
                    <p className="text-gray-700 mb-3">{item.reason}</p>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleModerationAction(item.id, 'reviewed', 'no_action')}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerationAction(item.id, 'actioned', 'deleted')}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleModerationAction(item.id, 'dismissed')}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && stats && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Channel Management</h2>

          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Manage which channels have Open Notes enabled.
            </p>

            {stats.channelActivity.map((channel) => (
              <div key={channel.channelId} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <span className="font-medium">#{channel.channelId}</span>
                  <div className="text-sm text-gray-600">
                    {channel.messageCount} messages, {channel.requestCount} requests
                  </div>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleChannelToggle(channel.channelId, true)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => handleChannelToggle(channel.channelId, false)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Tab */}
      {activeTab === 'emergency' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Controls</h2>

          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">System Emergency Controls</h3>
              <p className="text-red-700 mb-4">
                Use these controls to immediately pause or resume the Open Notes system.
              </p>

              <div className="space-x-4">
                <button
                  onClick={() => {
                    const reason = prompt('Reason for emergency pause:');
                    if (reason) handleEmergencyAction('pause', reason);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Emergency Pause
                </button>
                <button
                  onClick={() => handleEmergencyAction('resume')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Resume System
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};