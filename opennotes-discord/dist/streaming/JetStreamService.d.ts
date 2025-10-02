import { StreamingService, StreamingMessage, SubscriptionOptions } from './StreamingService.js';
export declare class JetStreamService implements StreamingService {
    private consumers;
    publish(subject: string, data: any, headers?: Record<string, string>): Promise<void>;
    subscribe(subject: string, callback: (message: StreamingMessage) => Promise<void>, options?: SubscriptionOptions): Promise<void>;
    createConsumer(subject: string, consumerName: string, callback: (message: StreamingMessage) => Promise<void>, options?: SubscriptionOptions): Promise<void>;
    getMessages(subject: string, options?: {
        startSequence?: number;
        startTime?: Date;
        endTime?: Date;
        limit?: number;
    }): Promise<StreamingMessage[]>;
    private getStreamForSubject;
    isReady(): boolean;
    healthCheck(): Promise<boolean>;
    removeConsumer(subject: string, consumerName: string): Promise<void>;
    getConsumerInfo(subject: string, consumerName: string): Promise<any>;
    getStreamInfo(subject: string): Promise<any>;
}
export declare const jetStreamService: JetStreamService;
export default jetStreamService;
//# sourceMappingURL=JetStreamService.d.ts.map