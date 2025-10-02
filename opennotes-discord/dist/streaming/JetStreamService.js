import { DeliverPolicy, AckPolicy } from 'nats';
import { natsConnection } from './NatsConnection.js';
import { logger } from '../shared/utils/logger.js';
export class JetStreamService {
    consumers = new Map();
    async publish(subject, data, headers) {
        try {
            const message = {
                subject,
                data,
                timestamp: new Date(),
                headers
            };
            await natsConnection.publish(subject, message);
            logger.debug('Published message to JetStream', {
                subject,
                dataSize: JSON.stringify(data).length,
                headers
            });
        }
        catch (error) {
            logger.error('Failed to publish message to JetStream:', {
                subject,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async subscribe(subject, callback, options) {
        try {
            const consumerName = options?.durable || `sub-${subject.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
            await this.createConsumer(subject, consumerName, callback, options);
        }
        catch (error) {
            logger.error('Failed to create subscription:', {
                subject,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async createConsumer(subject, consumerName, callback, options) {
        try {
            if (!natsConnection.isReady()) {
                throw new Error('NATS connection not ready');
            }
            const jsClient = await natsConnection.getJetStreamClient();
            const jsManager = await natsConnection.getJetStreamManager();
            const streamName = this.getStreamForSubject(subject);
            // Create consumer if it doesn't exist
            try {
                await jsManager.consumers.add(streamName, {
                    durable_name: consumerName,
                    filter_subject: options?.filterSubject || subject,
                    deliver_policy: options?.startSequence ? DeliverPolicy.ByStartSequence :
                        options?.startTime ? DeliverPolicy.ByStartTime : DeliverPolicy.New,
                    opt_start_seq: options?.startSequence,
                    opt_start_time: options?.startTime?.toISOString(),
                    ack_policy: AckPolicy.Explicit,
                    max_deliver: options?.maxDeliver || 3,
                    ack_wait: (options?.ackWait || 30) * 1000_000_000, // Convert to nanoseconds
                    max_ack_pending: 100
                });
            }
            catch (error) {
                if (!error.message?.includes('consumer name already in use')) {
                    throw error;
                }
                logger.debug(`Consumer ${consumerName} already exists`);
            }
            const consumer = await jsClient.consumers.get(streamName, consumerName);
            this.consumers.set(`${subject}:${consumerName}`, consumer);
            // Start consuming messages
            const subscription = await consumer.consume({
                callback: async (msg) => {
                    try {
                        const streamingMessage = JSON.parse(new TextDecoder().decode(msg.data));
                        await callback(streamingMessage);
                        msg.ack();
                        logger.debug('Processed JetStream message', {
                            subject: msg.subject,
                            sequence: msg.seq,
                            consumer: consumerName
                        });
                    }
                    catch (error) {
                        logger.error('Error processing JetStream message:', {
                            subject: msg.subject,
                            sequence: msg.seq,
                            consumer: consumerName,
                            error: error instanceof Error ? error.message : String(error)
                        });
                        // Negative acknowledge to trigger redelivery
                        msg.nak();
                    }
                }
            });
            logger.info('Created JetStream consumer', {
                subject,
                consumer: consumerName,
                stream: streamName
            });
        }
        catch (error) {
            logger.error('Failed to create JetStream consumer:', {
                subject,
                consumer: consumerName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async getMessages(subject, options = {}) {
        try {
            if (!natsConnection.isReady()) {
                throw new Error('NATS connection not ready');
            }
            const jsClient = await natsConnection.getJetStreamClient();
            const streamName = this.getStreamForSubject(subject);
            const messages = [];
            const limit = options.limit || 100;
            // Create a temporary consumer for message retrieval
            const tempConsumerName = `temp-${Date.now()}`;
            try {
                const jsManager = await natsConnection.getJetStreamManager();
                await jsManager.consumers.add(streamName, {
                    durable_name: tempConsumerName,
                    filter_subject: subject,
                    deliver_policy: options.startSequence ? DeliverPolicy.ByStartSequence :
                        options.startTime ? DeliverPolicy.ByStartTime : DeliverPolicy.All,
                    opt_start_seq: options.startSequence,
                    opt_start_time: options.startTime?.toISOString(),
                    ack_policy: AckPolicy.Explicit,
                    inactive_threshold: 5 * 1000_000_000 // 5 seconds in nanoseconds
                });
                const consumer = await jsClient.consumers.get(streamName, tempConsumerName);
                // Fetch messages
                const iter = await consumer.fetch({ max_messages: limit, expires: 5000 });
                for await (const msg of iter) {
                    try {
                        const streamingMessage = JSON.parse(new TextDecoder().decode(msg.data));
                        // Filter by end time if specified
                        if (options.endTime && streamingMessage.timestamp > options.endTime) {
                            break;
                        }
                        messages.push(streamingMessage);
                        msg.ack();
                    }
                    catch (error) {
                        logger.warn('Failed to parse message during retrieval:', {
                            subject: msg.subject,
                            sequence: msg.seq,
                            error
                        });
                        msg.ack(); // Acknowledge to avoid redelivery
                    }
                }
                // Clean up temporary consumer
                await jsManager.consumers.delete(streamName, tempConsumerName);
            }
            catch (error) {
                logger.error('Error retrieving messages from JetStream:', {
                    subject,
                    streamName,
                    error
                });
                // Try to clean up temporary consumer if it was created
                try {
                    const jsManager = await natsConnection.getJetStreamManager();
                    await jsManager.consumers.delete(streamName, tempConsumerName);
                }
                catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
            logger.debug('Retrieved messages from JetStream', {
                subject,
                count: messages.length,
                options
            });
            return messages;
        }
        catch (error) {
            logger.error('Failed to get messages from JetStream:', {
                subject,
                error: error instanceof Error ? error.message : String(error)
            });
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
    isReady() {
        return natsConnection.isReady();
    }
    async healthCheck() {
        try {
            return await natsConnection.healthCheck();
        }
        catch (error) {
            logger.error('JetStream health check failed:', error);
            return false;
        }
    }
    async removeConsumer(subject, consumerName) {
        try {
            const key = `${subject}:${consumerName}`;
            const consumer = this.consumers.get(key);
            if (consumer) {
                // The consumer will be automatically cleaned up when connection closes
                this.consumers.delete(key);
            }
            const jsManager = await natsConnection.getJetStreamManager();
            const streamName = this.getStreamForSubject(subject);
            await jsManager.consumers.delete(streamName, consumerName);
            logger.info('Removed JetStream consumer', {
                subject,
                consumer: consumerName
            });
        }
        catch (error) {
            logger.error('Failed to remove JetStream consumer:', {
                subject,
                consumer: consumerName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async getConsumerInfo(subject, consumerName) {
        try {
            const jsManager = await natsConnection.getJetStreamManager();
            const streamName = this.getStreamForSubject(subject);
            return await jsManager.consumers.info(streamName, consumerName);
        }
        catch (error) {
            logger.error('Failed to get consumer info:', {
                subject,
                consumer: consumerName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async getStreamInfo(subject) {
        try {
            const jsManager = await natsConnection.getJetStreamManager();
            const streamName = this.getStreamForSubject(subject);
            return await jsManager.streams.info(streamName);
        }
        catch (error) {
            logger.error('Failed to get stream info:', {
                subject,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
}
export const jetStreamService = new JetStreamService();
export default jetStreamService;
//# sourceMappingURL=JetStreamService.js.map