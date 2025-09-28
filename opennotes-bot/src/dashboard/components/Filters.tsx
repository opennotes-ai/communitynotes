import React, { useState, useEffect } from 'react';

interface Server {
  id: string;
  name: string;
  discordId: string;
  memberCount: number;
  isActive: boolean;
}

interface FilterOptions {
  serverId?: string;
  timeframe: string;
  minRequests: string;
  searchTerm: string;
}

interface FiltersProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  onRefresh: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  filters,
  onFilterChange,
  onRefresh,
}) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const token = localStorage.getItem('dashboard_token');
      const response = await fetch('/api/dashboard/servers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {/* Server Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Server
          </label>
          <select
            value={filters.serverId || ''}
            onChange={(e) => onFilterChange({ serverId: e.target.value || undefined })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Servers</option>
            {servers.map((server) => (
              <option key={server.id} value={server.discordId}>
                {server.name} ({server.memberCount} members)
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeframe
          </label>
          <select
            value={filters.timeframe}
            onChange={(e) => onFilterChange({ timeframe: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="1">Last Hour</option>
            <option value="6">Last 6 Hours</option>
            <option value="24">Last 24 Hours</option>
            <option value="72">Last 3 Days</option>
            <option value="168">Last Week</option>
          </select>
        </div>

        {/* Minimum Requests Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Requests
          </label>
          <select
            value={filters.minRequests}
            onChange={(e) => onFilterChange({ minRequests: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="1">1+ Request</option>
            <option value="2">2+ Requests</option>
            <option value="3">3+ Requests</option>
            <option value="5">5+ Requests</option>
            <option value="10">10+ Requests</option>
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            placeholder="Search messages..."
            value={filters.searchTerm}
            onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.serverId || filters.searchTerm || filters.timeframe !== '24' || filters.minRequests !== '1') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-1">
            {filters.serverId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Server: {servers.find(s => s.discordId === filters.serverId)?.name || 'Selected'}
                <button
                  onClick={() => onFilterChange({ serverId: undefined })}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.searchTerm && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Search: {filters.searchTerm}
                <button
                  onClick={() => onFilterChange({ searchTerm: '' })}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.timeframe !== '24' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {filters.timeframe}h
              </span>
            )}
            {filters.minRequests !== '1' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {filters.minRequests}+ req
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};