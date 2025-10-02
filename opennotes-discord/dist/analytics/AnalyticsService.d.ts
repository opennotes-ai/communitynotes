import type { ConversionMetrics, EngagementMetrics, SystemPerformance, NoteEffectiveness, AnalyticsReport, AnalyticsFilter, TrendAnalysis } from './types.js';
export declare class AnalyticsService {
    private readonly DEFAULT_TIMEFRAME_DAYS;
    getConversionMetrics(filter: AnalyticsFilter): Promise<ConversionMetrics>;
    getEngagementMetrics(filter: AnalyticsFilter): Promise<EngagementMetrics>;
    getNoteEffectiveness(filter: AnalyticsFilter): Promise<NoteEffectiveness>;
    getSystemPerformance(filter: AnalyticsFilter): Promise<SystemPerformance>;
    generateReport(filter: AnalyticsFilter, title?: string): Promise<AnalyticsReport>;
    analyzeTrends(filter: AnalyticsFilter): Promise<TrendAnalysis[]>;
    private getRequestsByTimeframe;
    private getNotesByTimeframe;
    private getHourlyConversionData;
    private getServerBreakdown;
    private getTotalUsers;
    private getActiveUsers;
    private getContributorCount;
    private getRaterCount;
    private getUserGrowthTrend;
    private getDailyActiveUsersTrend;
    private getContributorActivityTrend;
    private getRatingActivityTrend;
    private getTopContributors;
    private getNoteStatusBreakdown;
    private getHelpfulnessBreakdown;
    private getHelpfulnessTrend;
    private getVisibilityTrend;
    private getResponseTimeTrend;
    private getThroughputTrend;
    private getErrorRateTrend;
    private getServerInfo;
    private aggregateByTimeframe;
    private mergeTimeSeriesData;
}
export declare const analyticsService: AnalyticsService;
export default analyticsService;
//# sourceMappingURL=AnalyticsService.d.ts.map