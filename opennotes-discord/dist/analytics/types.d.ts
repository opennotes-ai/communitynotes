export interface TimeSeriesData {
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
}
export interface ConversionMetrics {
    totalRequests: number;
    totalNotes: number;
    conversionRate: number;
    timeframe: string;
    breakdown: {
        byDay: TimeSeriesData[];
        byHour: TimeSeriesData[];
        byServer: Array<{
            serverId: string;
            serverName: string;
            requests: number;
            notes: number;
            conversionRate: number;
        }>;
    };
}
export interface EngagementMetrics {
    totalUsers: number;
    activeUsers: number;
    contributorCount: number;
    raterCount: number;
    timeframe: string;
    trends: {
        userGrowth: TimeSeriesData[];
        dailyActiveUsers: TimeSeriesData[];
        contributorActivity: TimeSeriesData[];
        ratingActivity: TimeSeriesData[];
    };
    topContributors: Array<{
        userId: string;
        username: string;
        notesCount: number;
        ratingsCount: number;
        helpfulnessScore: number;
        joinDate: Date;
    }>;
}
export interface SystemPerformance {
    responseTime: {
        average: number;
        p95: number;
        p99: number;
        trend: TimeSeriesData[];
    };
    throughput: {
        requestsPerSecond: number;
        notesPerSecond: number;
        trend: TimeSeriesData[];
    };
    errorRate: {
        percentage: number;
        trend: TimeSeriesData[];
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
}
export interface NoteEffectiveness {
    averageHelpfulnessRatio: number;
    totalVisibleNotes: number;
    totalHiddenNotes: number;
    effectivenessRate: number;
    timeframe: string;
    breakdown: {
        byStatus: Record<string, number>;
        byHelpfulness: {
            veryHelpful: number;
            somewhatHelpful: number;
            notHelpful: number;
        };
        trends: {
            helpfulnessOverTime: TimeSeriesData[];
            visibilityOverTime: TimeSeriesData[];
        };
    };
}
export interface AnalyticsReport {
    id: string;
    title: string;
    description: string;
    generatedAt: Date;
    timeframe: {
        start: Date;
        end: Date;
    };
    serverId?: string;
    serverName?: string;
    data: {
        conversionMetrics: ConversionMetrics;
        engagementMetrics: EngagementMetrics;
        noteEffectiveness: NoteEffectiveness;
        systemPerformance: SystemPerformance;
    };
    exportFormats: {
        pdf?: string;
        csv?: string;
        json?: string;
    };
}
export interface AnalyticsFilter {
    timeframe: {
        start: Date;
        end: Date;
    };
    serverId?: string;
    userId?: string;
    includeMetrics?: string[];
    granularity?: 'hour' | 'day' | 'week' | 'month';
}
export interface TrendAnalysis {
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
    significance: 'high' | 'medium' | 'low';
    description: string;
}
//# sourceMappingURL=types.d.ts.map