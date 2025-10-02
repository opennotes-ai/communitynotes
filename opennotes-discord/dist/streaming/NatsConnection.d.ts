import { JetStreamManager, JetStreamClient, Consumer, JsMsg } from 'nats';
export declare class NatsConnectionManager {
    private connection;
    private jetStreamManager;
    private jetStreamClient;
    private isConnected;
    private reconnectInterval;
    private readonly maxReconnectAttempts;
    private reconnectAttempts;
    connect(): Promise<void>;
    private setupEventHandlers;
    private scheduleReconnect;
    private ensureStreams;
    disconnect(): Promise<void>;
    publish(subject: string, data: any): Promise<void>;
    subscribe(subject: string, callback: (data: any, msg: JsMsg) => Promise<void>, options?: {
        durable?: string;
        queue?: string;
        maxDeliver?: number;
        ackWait?: number;
    }): Promise<Consumer>;
    private getStreamForSubject;
    getJetStreamClient(): Promise<JetStreamClient>;
    getJetStreamManager(): Promise<JetStreamManager>;
    isReady(): boolean;
    healthCheck(): Promise<boolean>;
    getConnectionInfo(): any;
    getStats(): {
        connected: boolean;
        reconnectAttempts: number;
        serverInfo: any;
    };
}
export declare const natsConnection: NatsConnectionManager;
export default natsConnection;
//# sourceMappingURL=NatsConnection.d.ts.map