import { jetStreamService } from '../streaming/JetStreamService.js';
import { logger } from '../shared/utils/logger.js';
export class RequestAggregationEventService {
    REQUEST_EVENTS_SUBJECT = 'events.requests';
    NOTE_EVENTS_SUBJECT = 'events.notes';
    USER_EVENTS_SUBJECT = 'events.users';
    async publishRequestEvent(event) {
        try {
            const eventMessage = {
                eventType: event.type,
                source: 'request-aggregation',
                data: {
                    messageId: event.messageId,
                    serverId: event.serverId,
                    requestorId: event.requestorId,
                    aggregationData: event.aggregationData
                },
                timestamp: event.timestamp,
                userId: event.requestorId,
                serverId: event.serverId
            };
            await jetStreamService.publish(this.REQUEST_EVENTS_SUBJECT, eventMessage);
            logger.debug('Published request aggregation event', {
                type: event.type,
                messageId: event.messageId,
                serverId: event.serverId
            });
        }
        catch (error) {
            logger.error('Failed to publish request aggregation event', {
                event,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async publishNoteEvent(event) {
        try {
            const eventMessage = {
                eventType: event.type,
                source: 'open-notes',
                data: {
                    noteId: event.noteId,
                    messageId: event.messageId,
                    ...event.data
                },
                timestamp: event.timestamp,
                userId: event.userId,
                serverId: event.serverId
            };
            await jetStreamService.publish(this.NOTE_EVENTS_SUBJECT, eventMessage);
            logger.debug('Published note event', {
                type: event.type,
                noteId: event.noteId,
                messageId: event.messageId
            });
        }
        catch (error) {
            logger.error('Failed to publish note event', {
                event,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async publishUserEvent(event) {
        try {
            const eventMessage = {
                eventType: event.type,
                source: 'user-management',
                data: event.data,
                timestamp: event.timestamp,
                userId: event.userId,
                serverId: event.serverId
            };
            await jetStreamService.publish(this.USER_EVENTS_SUBJECT, eventMessage);
            logger.debug('Published user event', {
                type: event.type,
                userId: event.userId,
                serverId: event.serverId
            });
        }
        catch (error) {
            logger.error('Failed to publish user event', {
                event,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async subscribeToRequestEvents(callback, consumerName = 'request-event-processor') {
        try {
            await jetStreamService.createConsumer(this.REQUEST_EVENTS_SUBJECT, consumerName, async (message) => {
                const eventMsg = message.data;
                const requestEvent = {
                    type: eventMsg.eventType,
                    messageId: eventMsg.data.messageId,
                    serverId: eventMsg.serverId,
                    requestorId: eventMsg.userId,
                    aggregationData: eventMsg.data.aggregationData,
                    timestamp: eventMsg.timestamp
                };
                await callback(requestEvent);
            }, {
                durable: consumerName,
                maxDeliver: 3,
                ackWait: 30000
            });
            logger.info('Subscribed to request aggregation events', { consumerName });
        }
        catch (error) {
            logger.error('Failed to subscribe to request events', {
                consumerName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async subscribeToNoteEvents(callback, consumerName = 'note-event-processor') {
        try {
            await jetStreamService.createConsumer(this.NOTE_EVENTS_SUBJECT, consumerName, async (message) => {
                const eventMsg = message.data;
                const noteEvent = {
                    type: eventMsg.eventType,
                    noteId: eventMsg.data.noteId,
                    messageId: eventMsg.data.messageId,
                    serverId: eventMsg.serverId,
                    userId: eventMsg.userId,
                    data: eventMsg.data,
                    timestamp: eventMsg.timestamp
                };
                await callback(noteEvent);
            }, {
                durable: consumerName,
                maxDeliver: 3,
                ackWait: 30000
            });
            logger.info('Subscribed to note events', { consumerName });
        }
        catch (error) {
            logger.error('Failed to subscribe to note events', {
                consumerName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async subscribeToUserEvents(callback, consumerName = 'user-event-processor') {
        try {
            await jetStreamService.createConsumer(this.USER_EVENTS_SUBJECT, consumerName, async (message) => {
                const eventMsg = message.data;
                const userEvent = {
                    type: eventMsg.eventType,
                    userId: eventMsg.userId,
                    serverId: eventMsg.serverId,
                    data: eventMsg.data,
                    timestamp: eventMsg.timestamp
                };
                await callback(userEvent);
            }, {
                durable: consumerName,
                maxDeliver: 3,
                ackWait: 30000
            });
            logger.info('Subscribed to user events', { consumerName });
        }
        catch (error) {
            logger.error('Failed to subscribe to user events', {
                consumerName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async getRecentEvents(subject, limit = 100, hours = 24) {
        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            const messages = await jetStreamService.getMessages(subject, {
                startTime: since,
                limit
            });
            return messages.map(msg => msg.data)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }
        catch (error) {
            logger.error('Failed to get recent events', {
                subject,
                limit,
                hours,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }
    async getEventStats(hours = 24) {
        try {
            const [requestEvents, noteEvents, userEvents] = await Promise.all([
                this.getRecentEvents(this.REQUEST_EVENTS_SUBJECT, 10000, hours),
                this.getRecentEvents(this.NOTE_EVENTS_SUBJECT, 10000, hours),
                this.getRecentEvents(this.USER_EVENTS_SUBJECT, 10000, hours)
            ]);
            return {
                requestEvents: requestEvents.length,
                noteEvents: noteEvents.length,
                userEvents: userEvents.length,
                totalEvents: requestEvents.length + noteEvents.length + userEvents.length
            };
        }
        catch (error) {
            logger.error('Failed to get event stats', {
                hours,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                requestEvents: 0,
                noteEvents: 0,
                userEvents: 0,
                totalEvents: 0
            };
        }
    }
}
export const requestAggregationEventService = new RequestAggregationEventService();
export default requestAggregationEventService;
//# sourceMappingURL=RequestAggregationEventService.js.map