import React, { useState, useEffect } from 'react';
import { RequestCard } from './RequestCard';

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

interface FeedResponse {
  requests: RequestData[];
  totalCount: number;
  hasMore: boolean;
  metadata: {
    timeframe: number;
    minRequests: number;
    servers: Array<{
      id: string;
      name: string;
      discordId: string;
    }>;
  };
}

interface FilterOptions {
  serverId?: string;
  timeframe: string;
  minRequests: string;
  searchTerm: string;
}

interface RequestFeedProps {
  filters: FilterOptions;
  refreshTrigger: number;
}

export const RequestFeed: React.FC<RequestFeedProps> = ({
  filters,
  refreshTrigger,
}) => {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
    loadFeed(true);
  }, [filters, refreshTrigger]);

  const loadFeed = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const token = localStorage.getItem('dashboard_token');
      const params = new URLSearchParams({
        timeframe: filters.timeframe,
        minRequests: filters.minRequests,
        limit: '20',
        offset: reset ? '0' : offset.toString(),
      });

      if (filters.serverId) {
        params.append('serverId', filters.serverId);
      }

      const response = await fetch(
        `/api/dashboard/feed?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data: FeedResponse = await response.json();

        if (reset) {
          setFeed(data);
        } else if (feed) {
          setFeed({
            ...data,
            requests: [...feed.requests, ...data.requests],
          });
        }

        if (!reset) {
          setOffset(prev => prev + 20);
        }
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (feed?.hasMore && !loadingMore) {
      loadFeed(false);
    }
  };

  // Filter requests by search term locally
  const filteredRequests = feed?.requests.filter(request => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      request.content.toLowerCase().includes(searchLower) ||
      request.server.name.toLowerCase().includes(searchLower) ||
      request.requests.some(req =>
        req.requestor.username.toLowerCase().includes(searchLower) ||
        req.reason?.toLowerCase().includes(searchLower)
      )
    );
  }) || [];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feed Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Note Requests
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredRequests.length} messages with pending note requests
              {feed?.metadata && (
                <>
                  {' '} from last {feed.metadata.timeframe} hours
                  {feed.metadata.minRequests > 1 && (
                    <> with {feed.metadata.minRequests}+ requests</>
                  )}
                </>
              )}
            </p>
          </div>

          {feed && feed.totalCount > 0 && (
            <div className="text-sm text-gray-500">
              Showing {filteredRequests.length} of {feed.totalCount} results
            </div>
          )}
        </div>
      </div>

      {/* Request Cards */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No pending requests
            </h3>
            <p className="text-gray-500">
              {filters.searchTerm
                ? 'No requests match your search criteria.'
                : 'There are no messages with note requests in the selected timeframe.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}

          {/* Load More Button */}
          {feed?.hasMore && !filters.searchTerm && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};