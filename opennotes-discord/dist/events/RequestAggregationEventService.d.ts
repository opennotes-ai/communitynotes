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
export declare class RequestAggregationEventService {
    private readonly REQUEST_EVENTS_SUBJECT;
    private readonly NOTE_EVENTS_SUBJECT;
    private readonly USER_EVENTS_SUBJECT;
    publishRequestEvent(event: RequestAggregationEvent): Promise<void>;
    publishNoteEvent(event: NoteEvent): Promise<void>;
    publishUserEvent(event: UserEvent): Promise<void>;
    subscribeToRequestEvents(callback: (event: RequestAggregationEvent) => Promise<void>, consumerName?: string): Promise<void>;
    subscribeToNoteEvents(callback: (event: NoteEvent) => Promise<void>, consumerName?: string): Promise<void>;
    subscribeToUserEvents(callback: (event: UserEvent) => Promise<void>, consumerName?: string): Promise<void>;
    getRecentEvents(subject: string, limit?: number, hours?: number): Promise<EventMessage[]>;
    getEventStats(hours?: number): Promise<{
        requestEvents: number;
        noteEvents: number;
        userEvents: number;
        totalEvents: number;
    }>;
}
export declare const requestAggregationEventService: RequestAggregationEventService;
export default requestAggregationEventService;
//# sourceMappingURL=RequestAggregationEventService.d.ts.map