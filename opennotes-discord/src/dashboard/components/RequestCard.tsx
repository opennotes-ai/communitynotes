import React, { useState } from 'react';

interface RequestData {
  id: string;
  discordId: string;
  content: string;
  channelId: string;
  authorId: string;
  timestamp: string;
  attachments: string[];
  server: {
    id: string;
    name: string;
    discordId: string;
  };
  requestCount: {
    total: number;
    unique: number;
    recent: number;
  };
  requests: Array<{
    id: string;
    timestamp: string;
    reason?: string;
    sources?: string[];
    requestor: {
      id: string;
      username: string;
      trustLevel: string;
      helpfulnessScore: number;
    };
  }>;
}

interface RequestCardProps {
  request: RequestData;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const [expanded, setExpanded] = useState(false);
  const [showingNoteModal, setShowingNoteModal] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      return date.toLocaleDateString();
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getTrustLevelColor = (trustLevel: string) => {
    switch (trustLevel.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleCreateNote = () => {
    setShowingNoteModal(true);
  };

  const handleViewMessage = () => {
    // In a real implementation, this would open Discord or show a detailed view
    window.open(`https://discord.com/channels/${request.server.discordId}/${request.channelId}/${request.discordId}`, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {request.server.name}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(request.timestamp)}
              </span>
            </div>

            <p className="text-gray-900 text-sm leading-relaxed">
              {expanded ? request.content : truncateContent(request.content)}
              {request.content.length > 200 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </p>

            {request.attachments.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">
                  {request.attachments.length} attachment{request.attachments.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 ml-4">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                {request.requestCount.recent} recent
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {request.requestCount.unique} users
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Recent Requestors ({request.requests.length})
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={handleViewMessage}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Message
              </button>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Write Note
              </button>
            </div>
          </div>

          {/* Requestors List */}
          <div className="space-y-2">
            {request.requests.slice(0, expanded ? request.requests.length : 3).map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700">
                      {req.requestor.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {req.requestor.username}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTrustLevelColor(req.requestor.trustLevel)}`}>
                        {req.requestor.trustLevel}
                      </span>
                      <span className="text-xs text-gray-500">
                        Score: {req.requestor.helpfulnessScore}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatTime(req.timestamp)}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-gray-600 mt-1 max-w-32 truncate">
                      {req.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {request.requests.length > 3 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Show {request.requests.length - 3} more requestors
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Note Creation Modal (placeholder) */}
      {showingNoteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Write Open Note
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This feature will open the note creation interface. For now, this is a placeholder modal.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowingNoteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowingNoteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Open Note Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};