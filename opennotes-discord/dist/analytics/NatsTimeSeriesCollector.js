import { jetStreamService } from '../streaming/JetStreamService.js';
import { logger } from '../shared/utils/logger.js';
export class NatsTimeSeriesCollector {
    TTL_DAYS = 90;
    async recordMetric(metric, value, timestamp, metadata) {
        try {
            const ts = timestamp || new Date();
            const subject = `analytics.timeseries.${metric}`;
            const message = {
                metric,
                value,
                timestamp: ts,
                metadata: metadata || {},
                tags: {
                    date: this.getDateKey(ts),
                    hour: this.getHourKey(ts),
                    minute: this.getMinuteKey(ts)
                }
            };
            await jetStreamService.publish(subject, message);
            logger.debug('Recorded time series metric to NATS', { metric, value, timestamp: ts });
        }
        catch (error) {
            logger.error('Failed to record time series metric to NATS', { metric, value, error });
        }
    }
    async recordConversionEvent(serverId, eventType, timestamp) {
        const ts = timestamp || new Date();
        await Promise.all([
            this.recordMetric(`conversion.${eventType}.global`, 1, ts, { serverId }),
            this.recordMetric(`conversion.${eventType}.server.${serverId}`, 1, ts),
            this.recordMetric(`conversion.${eventType}.hourly`, 1, this.getHourBoundary(ts)),
            this.recordMetric(`conversion.${eventType}.daily`, 1, this.getDayBoundary(ts))
        ]);
    }
    async recordUserActivity(userId, activityType, serverId, timestamp) {
        const ts = timestamp || new Date();
        const metrics = [
            this.recordMetric(`activity.${activityType}.global`, 1, ts, { userId, serverId }),
            this.recordMetric(`activity.${activityType}.daily`, 1, this.getDayBoundary(ts))
        ];
        if (serverId) {
            metrics.push(this.recordMetric(`activity.${activityType}.server.${serverId}`, 1, ts, { userId }));
        }
        await Promise.all(metrics);
    }
    async recordPerformanceMetric(metric, value, timestamp) {
        const ts = timestamp || new Date();
        await Promise.all([
            this.recordMetric(`performance.${metric}`, value, ts),
            this.recordMetric(`performance.${metric}.minute`, value, this.getMinuteBoundary(ts)),
            this.recordMetric(`performance.${metric}.hourly`, value, this.getHourBoundary(ts))
        ]);
    }
    async recordNoteEffectiveness(noteId, helpfulnessRatio, isVisible, serverId, timestamp) {
        const ts = timestamp || new Date();
        const metrics = [
            this.recordMetric('effectiveness.helpfulness.global', helpfulnessRatio, ts, { noteId, serverId }),
            this.recordMetric('effectiveness.visibility.global', isVisible ? 1 : 0, ts, { noteId, serverId }),
            this.recordMetric('effectiveness.helpfulness.daily', helpfulnessRatio, this.getDayBoundary(ts)),
            this.recordMetric('effectiveness.visibility.daily', isVisible ? 1 : 0, this.getDayBoundary(ts))
        ];
        if (serverId) {
            metrics.push(this.recordMetric(`effectiveness.helpfulness.server.${serverId}`, helpfulnessRatio, ts, { noteId }), this.recordMetric(`effectiveness.visibility.server.${serverId}`, isVisible ? 1 : 0, ts, { noteId }));
        }
        await Promise.all(metrics);
    }
    async getTimeSeriesData(metric, startTime, endTime, granularity = 'hour') {
        try {
            const subject = `analytics.timeseries.${metric}`;
            const messages = await jetStreamService.getMessages(subject, {
                startTime,
                endTime,
                limit: 10000
            });
            const results = [];
            for (const message of messages) {
                const analyticsMsg = message.data;
                // Filter by granularity if needed
                if (this.shouldIncludeByGranularity(analyticsMsg.timestamp, granularity, startTime, endTime)) {
                    results.push({
                        timestamp: analyticsMsg.timestamp,
                        value: analyticsMsg.value,
                        metadata: analyticsMsg.metadata || {}
                    });
                }
            }
            return results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }
        catch (error) {
            logger.error('Failed to get time series data from NATS', { metric, startTime, endTime, error });
            return [];
        }
    }
    async getAggregatedData(metric, startTime, endTime, aggregation = 'sum') {
        try {
            const data = await this.getTimeSeriesData(metric, startTime, endTime);
            if (data.length === 0)
                return 0;
            const values = data.map(d => d.value);
            switch (aggregation) {
                case 'sum':
                    return values.reduce((sum, val) => sum + val, 0);
                case 'avg':
                    return values.reduce((sum, val) => sum + val, 0) / values.length;
                case 'max':
                    return Math.max(...values);
                case 'min':
                    return Math.min(...values);
                default:
                    return 0;
            }
        }
        catch (error) {
            logger.error('Failed to get aggregated data from NATS', { metric, startTime, endTime, aggregation, error });
            return 0;
        }
    }
    async getConversionRate(serverId, startTime, endTime) {
        try {
            const requestMetric = serverId ? `conversion.request.server.${serverId}` : 'conversion.request.global';
            const noteMetric = serverId ? `conversion.note.server.${serverId}` : 'conversion.note.global';
            const [requests, notes] = await Promise.all([
                this.getAggregatedData(requestMetric, startTime, endTime, 'sum'),
                this.getAggregatedData(noteMetric, startTime, endTime, 'sum')
            ]);
            return requests > 0 ? (notes / requests) * 100 : 0;
        }
        catch (error) {
            logger.error('Failed to calculate conversion rate from NATS', { serverId, startTime, endTime, error });
            return 0;
        }
    }
    async getEngagementTrends(serverId, startTime, endTime) {
        try {
            const noteMetric = serverId ? `activity.note_created.server.${serverId}` : 'activity.note_created.global';
            const ratingMetric = serverId ? `activity.note_rated.server.${serverId}` : 'activity.note_rated.global';
            const requestMetric = serverId ? `activity.request_made.server.${serverId}` : 'activity.request_made.global';
            const [noteCreationTrend, ratingActivityTrend, requestTrend] = await Promise.all([
                this.getTimeSeriesData(noteMetric, startTime, endTime, 'day'),
                this.getTimeSeriesData(ratingMetric, startTime, endTime, 'day'),
                this.getTimeSeriesData(requestMetric, startTime, endTime, 'day')
            ]);
            return {
                noteCreationTrend,
                ratingActivityTrend,
                requestTrend
            };
        }
        catch (error) {
            logger.error('Failed to get engagement trends from NATS', { serverId, startTime, endTime, error });
            return {
                noteCreationTrend: [],
                ratingActivityTrend: [],
                requestTrend: []
            };
        }
    }
    shouldIncludeByGranularity(timestamp, granularity, startTime, endTime) {
        // For now, include all messages within the time range
        // In a more sophisticated implementation, we could filter by granularity boundaries
        return timestamp >= startTime && timestamp <= endTime;
    }
    getDateKey(date, granularity = 'day') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        switch (granularity) {
            case 'minute':
                const hour = String(date.getHours()).padStart(2, '0');
                const minute = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}-${hour}-${minute}`;
            case 'hour':
                const hourOnly = String(date.getHours()).padStart(2, '0');
                return `${year}-${month}-${day}-${hourOnly}`;
            case 'day':
            default:
                return `${year}-${month}-${day}`;
        }
    }
    getHourKey(date) {
        return this.getDateKey(date, 'hour');
    }
    getMinuteKey(date) {
        return this.getDateKey(date, 'minute');
    }
    getMinuteBoundary(date) {
        const boundary = new Date(date);
        boundary.setSeconds(0, 0);
        return boundary;
    }
    getHourBoundary(date) {
        const boundary = new Date(date);
        boundary.setMinutes(0, 0, 0);
        return boundary;
    }
    getDayBoundary(date) {
        const boundary = new Date(date);
        boundary.setHours(0, 0, 0, 0);
        return boundary;
    }
}
export const natsTimeSeriesCollector = new NatsTimeSeriesCollector();
export default natsTimeSeriesCollector;
//# sourceMappingURL=NatsTimeSeriesCollector.js.map