import React, { useState, useEffect } from 'react';

interface Server {
  id: string;
  name: string;
  memberCount?: number;
}

interface ServerSelectorProps {
  selectedServer: string;
  onServerChange: (serverId: string) => void;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  selectedServer,
  onServerChange
}) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/dashboard/servers', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const serverData = await response.json();
          setServers(serverData);
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, []);

  return (
    <div className="min-w-48">
      <label htmlFor="server-select" className="block text-xs font-medium text-gray-700 mb-1">
        Server
      </label>
      <select
        id="server-select"
        value={selectedServer}
        onChange={(e) => onServerChange(e.target.value)}
        className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        disabled={loading}
      >
        <option value="">All Servers (Global)</option>
        {servers.map((server) => (
          <option key={server.id} value={server.id}>
            {server.name}
            {server.memberCount && ` (${server.memberCount} members)`}
          </option>
        ))}
      </select>
    </div>
  );
};