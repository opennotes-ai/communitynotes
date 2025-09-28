import { connect, NatsConnection, ConnectionOptions, JetStreamManager, JetStreamClient, JsMsgCallback, Consumer, JsMsg, RetentionPolicy, StorageType, DiscardPolicy } from 'nats';
import { logger } from '../shared/utils/logger.js';
import { appConfig } from '../shared/config/index.js';

export class NatsConnectionManager {
  private connection: NatsConnection | null = null;
  private jetStreamManager: JetStreamManager | null = null;
  private jetStreamClient: JetStreamClient | null = null;
  private isConnected = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private readonly maxReconnectAttempts = 10;
  private reconnectAttempts = 0;

  async connect(): Promise<void> {
    try {
      if (!appConfig.NATS_URL) {
        logger.warn('NATS URL not configured, NATS features disabled');
        return;
      }

      const options: ConnectionOptions = {
        servers: [appConfig.NATS_URL],
        name: 'opennotes-bot',
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
    } catch (error) {
      logger.error('Failed to connect to NATS:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.closed().then((err) => {
      this.isConnected = false;
      if (err) {
        logger.error('NATS connection closed with error:', err);
      } else {
        logger.info('NATS connection closed gracefully');
      }
    });

    // Handle connection events
    (async () => {
      if (!this.connection) return;

      for await (const status of this.connection.status()) {
        logger.info('NATS connection status:', {
          type: status.type,
          data: status.data
        });

        if (status.type === 'disconnect' || status.type === 'error') {
          this.isConnected = false;
          this.scheduleReconnect();
        } else if (status.type === 'reconnect') {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('NATS reconnected successfully');
        }
      }
    })();
  }

  private scheduleReconnect(): void {
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
      } catch (error) {
        logger.error('NATS reconnect attempt failed:', error);
      }
    }, delay);
  }

  private async ensureStreams(): Promise<void> {
    if (!this.jetStreamManager) return;

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
      } catch (error: any) {
        if (error.message?.includes('stream name already in use')) {
          logger.debug(`NATS stream ${streamDef.name} already exists`);
        } else {
          logger.error(`Failed to create NATS stream ${streamDef.name}:`, error);
        }
      }
    }
  }

  async disconnect(): Promise<void> {
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
    } catch (error) {
      logger.error('Error disconnecting from NATS:', error);
    }
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.jetStreamClient || !this.isConnected) {
      throw new Error('NATS not connected');
    }

    try {
      const payload = JSON.stringify(data);
      await this.jetStreamClient.publish(subject, new TextEncoder().encode(payload));
    } catch (error) {
      logger.error('Failed to publish to NATS:', { subject, error });
      throw error;
    }
  }

  async subscribe(
    subject: string,
    callback: (data: any, msg: JsMsg) => Promise<void>,
    options: {
      durable?: string;
      queue?: string;
      maxDeliver?: number;
      ackWait?: number;
    } = {}
  ): Promise<Consumer> {
    if (!this.jetStreamClient || !this.isConnected) {
      throw new Error('NATS not connected');
    }

    try {
      const consumer = await this.jetStreamClient.consumers.get(
        this.getStreamForSubject(subject),
        options.durable || `consumer-${Date.now()}`
      );

      const subscription = await consumer.consume({
        callback: async (msg: JsMsg) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(msg.data));
            await callback(data, msg);
            msg.ack();
          } catch (error) {
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
    } catch (error) {
      logger.error('Failed to create NATS subscription:', { subject, error });
      throw error;
    }
  }

  private getStreamForSubject(subject: string): string {
    if (subject.startsWith('notifications.')) return 'NOTIFICATIONS';
    if (subject.startsWith('analytics.')) return 'ANALYTICS';
    if (subject.startsWith('events.')) return 'EVENTS';
    throw new Error(`No stream configured for subject: ${subject}`);
  }

  async getJetStreamClient(): Promise<JetStreamClient> {
    if (!this.jetStreamClient || !this.isConnected) {
      throw new Error('NATS JetStream not connected');
    }
    return this.jetStreamClient;
  }

  async getJetStreamManager(): Promise<JetStreamManager> {
    if (!this.jetStreamManager || !this.isConnected) {
      throw new Error('NATS JetStream Manager not available');
    }
    return this.jetStreamManager;
  }

  isReady(): boolean {
    return this.isConnected && this.connection !== null && !this.connection.isClosed();
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.connection || this.connection.isClosed()) {
        return false;
      }

      // Try to get server info as a health check
      const info = this.connection.info;
      return info !== undefined;
    } catch (error) {
      logger.error('NATS health check failed:', error);
      return false;
    }
  }

  getConnectionInfo(): any {
    return this.connection?.info || null;
  }

  getStats(): {
    connected: boolean;
    reconnectAttempts: number;
    serverInfo: any;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      serverInfo: this.getConnectionInfo()
    };
  }
}

export const natsConnection = new NatsConnectionManager();
export default natsConnection;