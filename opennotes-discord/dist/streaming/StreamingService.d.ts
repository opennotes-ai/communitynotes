export interface StreamingMessage {
    id?: string;
    subject: string;
    data: any;
    timestamp: Date;
    headers?: Record<string, string>;
}
export interface StreamingSubscription {
    subject: string;
    callback: (message: StreamingMessage) => Promise<void>;
    options?: SubscriptionOptions;
}
export interface SubscriptionOptions {
    durable?: string;
    queue?: string;
    startSequence?: number;
    startTime?: Date;
    maxDeliver?: number;
    ackWait?: number;
    filterSubject?: string;
}
export interface StreamingService {
    /**
     * Publish a message to a subject
     */
    publish(subject: string, data: any, headers?: Record<string, string>): Promise<void>;
    /**
     * Subscribe to messages on a subject
     */
    subscribe(subject: string, callback: (message: StreamingMessage) => Promise<void>, options?: SubscriptionOptions): Promise<void>;
    /**
     * Create a durable consumer for reliable message processing
     */
    createConsumer(subject: string, consumerName: string, callback: (message: StreamingMessage) => Promise<void>, options?: SubscriptionOptions): Promise<void>;
    /**
     * Get messages from a stream (for replay/historical data)
     */
    getMessages(subject: string, options: {
        startSequence?: number;
        startTime?: Date;
        endTime?: Date;
        limit?: number;
    }): Promise<StreamingMessage[]>;
    /**
     * Check if the streaming service is ready
     */
    isReady(): boolean;
    /**
     * Get service health status
     */
    healthCheck(): Promise<boolean>;
}
export declare enum MessagePriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    CRITICAL = 4
}
export interface NotificationMessage {
    id: string;
    userId: string;
    type: string;
    priority: MessagePriority;
    data: Record<string, any>;
    scheduledFor?: Date;
    batchKey?: string;
}
export interface AnalyticsMessage {
    metric: string;
    value: number;
    timestamp: Date;
    metadata?: Record<string, any>;
    tags?: Record<string, string>;
}
export interface EventMessage {
    eventType: string;
    source: string;
    data: Record<string, any>;
    timestamp: Date;
    userId?: string;
    serverId?: string;
}
//# sourceMappingURL=StreamingService.d.ts.map