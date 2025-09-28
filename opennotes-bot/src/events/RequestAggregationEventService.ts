import { jetStreamService } from '../streaming/JetStreamService.js';
import { logger } from '../shared/utils/logger.js';
import { EventMessage } from '../streaming/StreamingService.js';

export interface RequestAggregationEvent {
  type: 'request_added' | 'request_removed' | 'threshold_met' | 'threshold_reset';
  messageId: string;
  serverId: string;
  requestorId?: string;
  aggregationData: {
    totalRequests: number;
    uniqueRequestors: number;
    thresholdMet: boolean;
    thresholdMetAt?: Date;
  };
  timestamp: Date;
}

export interface NoteEvent {
  type: 'note_created' | 'note_published' | 'note_rated' | 'note_status_changed';
  noteId: string;
  messageId: string;
  serverId: string;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface UserEvent {
  type: 'user_joined' | 'user_verified' | 'milestone_reached';
  userId: string;
  serverId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

export class RequestAggregationEventService {
  private readonly REQUEST_EVENTS_SUBJECT = 'events.requests';
  private readonly NOTE_EVENTS_SUBJECT = 'events.notes';
  private readonly USER_EVENTS_SUBJECT = 'events.users';

  async publishRequestEvent(event: RequestAggregationEvent): Promise<void> {
    try {
      const eventMessage: EventMessage = {
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
    } catch (error) {
      logger.error('Failed to publish request aggregation event', {
        event,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async publishNoteEvent(event: NoteEvent): Promise<void> {
    try {
      const eventMessage: EventMessage = {
        eventType: event.type,
        source: 'community-notes',
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
    } catch (error) {
      logger.error('Failed to publish note event', {
        event,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async publishUserEvent(event: UserEvent): Promise<void> {
    try {
      const eventMessage: EventMessage = {
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
    } catch (error) {
      logger.error('Failed to publish user event', {
        event,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async subscribeToRequestEvents(
    callback: (event: RequestAggregationEvent) => Promise<void>,
    consumerName: string = 'request-event-processor'
  ): Promise<void> {
    try {
      await jetStreamService.createConsumer(
        this.REQUEST_EVENTS_SUBJECT,
        consumerName,
        async (message) => {
          const eventMsg = message.data as EventMessage;
          const requestEvent: RequestAggregationEvent = {
            type: eventMsg.eventType as any,
            messageId: eventMsg.data.messageId,
            serverId: eventMsg.serverId!,
            requestorId: eventMsg.userId,
            aggregationData: eventMsg.data.aggregationData,
            timestamp: eventMsg.timestamp
          };

          await callback(requestEvent);
        },
        {
          durable: consumerName,
          maxDeliver: 3,
          ackWait: 30000
        }
      );

      logger.info('Subscribed to request aggregation events', { consumerName });
    } catch (error) {
      logger.error('Failed to subscribe to request events', {
        consumerName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async subscribeToNoteEvents(
    callback: (event: NoteEvent) => Promise<void>,
    consumerName: string = 'note-event-processor'
  ): Promise<void> {
    try {
      await jetStreamService.createConsumer(
        this.NOTE_EVENTS_SUBJECT,
        consumerName,
        async (message) => {
          const eventMsg = message.data as EventMessage;
          const noteEvent: NoteEvent = {
            type: eventMsg.eventType as any,
            noteId: eventMsg.data.noteId,
            messageId: eventMsg.data.messageId,
            serverId: eventMsg.serverId!,
            userId: eventMsg.userId!,
            data: eventMsg.data,
            timestamp: eventMsg.timestamp
          };

          await callback(noteEvent);
        },
        {
          durable: consumerName,
          maxDeliver: 3,
          ackWait: 30000
        }
      );

      logger.info('Subscribed to note events', { consumerName });
    } catch (error) {
      logger.error('Failed to subscribe to note events', {
        consumerName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async subscribeToUserEvents(
    callback: (event: UserEvent) => Promise<void>,
    consumerName: string = 'user-event-processor'
  ): Promise<void> {
    try {
      await jetStreamService.createConsumer(
        this.USER_EVENTS_SUBJECT,
        consumerName,
        async (message) => {
          const eventMsg = message.data as EventMessage;
          const userEvent: UserEvent = {
            type: eventMsg.eventType as any,
            userId: eventMsg.userId!,
            serverId: eventMsg.serverId,
            data: eventMsg.data,
            timestamp: eventMsg.timestamp
          };

          await callback(userEvent);
        },
        {
          durable: consumerName,
          maxDeliver: 3,
          ackWait: 30000
        }
      );

      logger.info('Subscribed to user events', { consumerName });
    } catch (error) {
      logger.error('Failed to subscribe to user events', {
        consumerName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getRecentEvents(
    subject: string,
    limit: number = 100,
    hours: number = 24
  ): Promise<EventMessage[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const messages = await jetStreamService.getMessages(subject, {
        startTime: since,
        limit
      });

      return messages.map(msg => msg.data as EventMessage)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error('Failed to get recent events', {
        subject,
        limit,
        hours,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async getEventStats(hours: number = 24): Promise<{
    requestEvents: number;
    noteEvents: number;
    userEvents: number;
    totalEvents: number;
  }> {
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
    } catch (error) {
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