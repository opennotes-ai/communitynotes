import { connect, RetentionPolicy, StorageType, DiscardPolicy } from 'nats';
import { logger } from '../shared/utils/logger.js';
import { appConfig } from '../shared/config/index.js';
export class NatsConnectionManager {
    connection = null;
    jetStreamManager = null;
    jetStreamClient = null;
    isConnected = false;
    reconnectInterval = null;
    maxReconnectAttempts = 10;
    reconnectAttempts = 0;
    async connect() {
        try {
            if (!appConfig.NATS_URL) {
                logger.warn('NATS URL not configured, NATS features disabled');
                return;
            }
            const options = {
                servers: [appConfig.NATS_URL],
                name: 'opennotes-discord',
                maxReconnectAttempts: this.maxReconnectAttempts,
                reconnectTimeWait: 2000,
                // maxPayload: 1024 * 1024, // 1MB - Not available in current NATS.js version
                debug: appConfig.NODE_ENV === 'development',
            };
            this.connection = await connect(options);
            this.jetStreamManager = await this.connection.jetstreamManager();
            this.jetStreamClient = this.connection.jetstream();
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger.info('Connected to NATS server', {
                server: appConfig.NATS_URL,
                clientId: this.connection.info?.client_id
            });
            this.setupEventHandlers();
            await this.ensureStreams();
        }
        catch (error) {
            logger.error('Failed to connect to NATS:', error);
            this.isConnected = false;
            this.scheduleReconnect();
        }
    }
    setupEventHandlers() {
        if (!this.connection)
            return;
        this.connection.closed().then((err) => {
            this.isConnected = false;
            if (err) {
                logger.error('NATS connection closed with error:', err);
            }
            else {
                logger.info('NATS connection closed gracefully');
            }
        });
        // Handle connection events
        (async () => {
            if (!this.connection)
                return;
            for await (const status of this.connection.status()) {
                logger.info('NATS connection status:', {
                    type: status.type,
                    data: status.data
                });
                if (status.type === 'disconnect' || status.type === 'error') {
                    this.isConnected = false;
                    this.scheduleReconnect();
                }
                else if (status.type === 'reconnect') {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    logger.info('NATS reconnected successfully');
                }
            }
        })();
    }
    scheduleReconnect() {
        if (this.reconnectInterval || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
        logger.info(`Scheduling NATS reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        this.reconnectInterval = setTimeout(async () => {
            this.reconnectInterval = null;
            try {
                await this.connect();
            }
            catch (error) {
                logger.error('NATS reconnect attempt failed:', error);
            }
        }, delay);
    }
    async ensureStreams() {
        if (!this.jetStreamManager)
            return;
        const streams = [
            {
                name: 'NOTIFICATIONS',
                subjects: ['notifications.>'],
                config: {
                    retention: RetentionPolicy.Limits,
                    max_age: 7 * 24 * 60 * 60 * 1000_000_000, // 7 days in nanoseconds
                    max_msgs: 100000,
                    storage: StorageType.File,
                    num_replicas: 1,
                    discard: DiscardPolicy.Old
                }
            },
            {
                name: 'ANALYTICS',
                subjects: ['analytics.>'],
                config: {
                    retention: RetentionPolicy.Limits,
                    max_age: 90 * 24 * 60 * 60 * 1000_000_000, // 90 days in nanoseconds
                    max_msgs: 1000000,
                    storage: StorageType.File,
                    num_replicas: 1,
                    discard: DiscardPolicy.Old
                }
            },
            {
                name: 'EVENTS',
                subjects: ['events.>'],
                config: {
                    retention: RetentionPolicy.Limits,
                    max_age: 24 * 60 * 60 * 1000_000_000, // 1 day in nanoseconds
                    max_msgs: 50000,
                    storage: StorageType.File,
                    num_replicas: 1,
                    discard: DiscardPolicy.Old
                }
            }
        ];
        for (const streamDef of streams) {
            try {
                await this.jetStreamManager.streams.add({
                    name: streamDef.name,
                    subjects: streamDef.subjects,
                    ...streamDef.config
                });
                logger.info(`Ensured NATS stream: ${streamDef.name}`);
            }
            catch (error) {
                if (error.message?.includes('stream name already in use')) {
                    logger.debug(`NATS stream ${streamDef.name} already exists`);
                }
                else {
                    logger.error(`Failed to create NATS stream ${streamDef.name}:`, error);
                }
            }
        }
    }
    async disconnect() {
        try {
            if (this.reconnectInterval) {
                clearTimeout(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            if (this.connection && !this.connection.isClosed()) {
                await this.connection.close();
                logger.info('NATS connection closed');
            }
            this.connection = null;
            this.jetStreamManager = null;
            this.jetStreamClient = null;
            this.isConnected = false;
        }
        catch (error) {
            logger.error('Error disconnecting from NATS:', error);
        }
    }
    async publish(subject, data) {
        if (!this.jetStreamClient || !this.isConnected) {
            throw new Error('NATS not connected');
        }
        try {
            const payload = JSON.stringify(data);
            await this.jetStreamClient.publish(subject, new TextEncoder().encode(payload));
        }
        catch (error) {
            logger.error('Failed to publish to NATS:', { subject, error });
            throw error;
        }
    }
    async subscribe(subject, callback, options = {}) {
        if (!this.jetStreamClient || !this.isConnected) {
            throw new Error('NATS not connected');
        }
        try {
            const consumer = await this.jetStreamClient.consumers.get(this.getStreamForSubject(subject), options.durable || `consumer-${Date.now()}`);
            const subscription = await consumer.consume({
                callback: async (msg) => {
                    try {
                        const data = JSON.parse(new TextDecoder().decode(msg.data));
                        await callback(data, msg);
                        msg.ack();
                    }
                    catch (error) {
                        logger.error('Error processing NATS message:', {
                            subject: msg.subject,
                            error
                        });
                        msg.nak();
                    }
                },
                max_messages: options.maxDeliver || 1000,
                expires: options.ackWait || 30000
            });
            logger.info('Created NATS subscription', {
                subject,
                durable: options.durable,
                queue: options.queue
            });
            return consumer;
        }
        catch (error) {
            logger.error('Failed to create NATS subscription:', { subject, error });
            throw error;
        }
    }
    getStreamForSubject(subject) {
        if (subject.startsWith('notifications.'))
            return 'NOTIFICATIONS';
        if (subject.startsWith('analytics.'))
            return 'ANALYTICS';
        if (subject.startsWith('events.'))
            return 'EVENTS';
        throw new Error(`No stream configured for subject: ${subject}`);
    }
    async getJetStreamClient() {
        if (!this.jetStreamClient || !this.isConnected) {
            throw new Error('NATS JetStream not connected');
        }
        return this.jetStreamClient;
    }
    async getJetStreamManager() {
        if (!this.jetStreamManager || !this.isConnected) {
            throw new Error('NATS JetStream Manager not available');
        }
        return this.jetStreamManager;
    }
    isReady() {
        return this.isConnected && this.connection !== null && !this.connection.isClosed();
    }
    async healthCheck() {
        try {
            if (!this.connection || this.connection.isClosed()) {
                return false;
            }
            // Try to get server info as a health check
            const info = this.connection.info;
            return info !== undefined;
        }
        catch (error) {
            logger.error('NATS health check failed:', error);
            return false;
        }
    }
    getConnectionInfo() {
        return this.connection?.info || null;
    }
    getStats() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            serverInfo: this.getConnectionInfo()
        };
    }
}
export const natsConnection = new NatsConnectionManager();
export default natsConnection;
//# sourceMappingURL=NatsConnection.js.map