import type { TimeSeriesData } from './types.js';
export declare class NatsTimeSeriesCollector {
    private readonly TTL_DAYS;
    recordMetric(metric: string, value: number, timestamp?: Date, metadata?: Record<string, any>): Promise<void>;
    recordConversionEvent(serverId: string, eventType: 'request' | 'note', timestamp?: Date): Promise<void>;
    recordUserActivity(userId: string, activityType: 'note_created' | 'note_rated' | 'request_made', serverId?: string, timestamp?: Date): Promise<void>;
    recordPerformanceMetric(metric: 'response_time' | 'error_rate' | 'throughput', value: number, timestamp?: Date): Promise<void>;
    recordNoteEffectiveness(noteId: string, helpfulnessRatio: number, isVisible: boolean, serverId?: string, timestamp?: Date): Promise<void>;
    getTimeSeriesData(metric: string, startTime: Date, endTime: Date, granularity?: 'minute' | 'hour' | 'day'): Promise<TimeSeriesData[]>;
    getAggregatedData(metric: string, startTime: Date, endTime: Date, aggregation?: 'sum' | 'avg' | 'max' | 'min'): Promise<number>;
    getConversionRate(serverId: string | null, startTime: Date, endTime: Date): Promise<number>;
    getEngagementTrends(serverId: string | null, startTime: Date, endTime: Date): Promise<{
        noteCreationTrend: TimeSeriesData[];
        ratingActivityTrend: TimeSeriesData[];
        requestTrend: TimeSeriesData[];
    }>;
    private shouldIncludeByGranularity;
    private getDateKey;
    private getHourKey;
    private getMinuteKey;
    private getMinuteBoundary;
    private getHourBoundary;
    private getDayBoundary;
}
export declare const natsTimeSeriesCollector: NatsTimeSeriesCollector;
export default natsTimeSeriesCollector;
//# sourceMappingURL=NatsTimeSeriesCollector.d.ts.map