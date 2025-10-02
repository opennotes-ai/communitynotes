import { redis } from '../cache/redis.js';
import { jetStreamService } from '../streaming/JetStreamService.js';
import { natsConnection } from '../streaming/NatsConnection.js';
import { logger } from '../shared/utils/logger.js';

interface BenchmarkResult {
  operation: string;
  technology: 'Redis' | 'NATS';
  totalMessages: number;
  totalTime: number;
  messagesPerSecond: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  errors: number;
  memoryUsage?: number;
}

export class RedisVsNatsBenchmark {
  private readonly MESSAGE_COUNTS = [100, 1000, 5000];
  private readonly MESSAGE_SIZE_BYTES = 1024; // 1KB messages

  async runFullBenchmark(): Promise<{
    results: BenchmarkResult[];
    summary: {
      redisWins: number;
      natsWins: number;
      ties: number;
    };
  }> {
    logger.info('Starting Redis vs NATS performance benchmark');

    const results: BenchmarkResult[] = [];

    // Ensure connections are ready
    if (!redis.isReady()) {
      logger.warn('Redis not connected, skipping Redis benchmarks');
    }

    if (!natsConnection.isReady()) {
      logger.warn('NATS not connected, skipping NATS benchmarks');
    }

    // Benchmark simple publish/subscribe
    for (const count of this.MESSAGE_COUNTS) {
      if (redis.isReady()) {
        const redisResult = await this.benchmarkRedisPublish(count);
        results.push(redisResult);
      }

      if (natsConnection.isReady()) {
        const natsResult = await this.benchmarkNatsPublish(count);
        results.push(natsResult);
      }
    }

    // Benchmark time series operations
    for (const count of this.MESSAGE_COUNTS) {
      if (redis.isReady()) {
        const redisTimeSeriesResult = await this.benchmarkRedisTimeSeries(count);
        results.push(redisTimeSeriesResult);
      }

      if (natsConnection.isReady()) {
        const natsTimeSeriesResult = await this.benchmarkNatsTimeSeries(count);
        results.push(natsTimeSeriesResult);
      }
    }

    // Calculate winner summary
    const summary = this.calculateSummary(results);

    logger.info('Benchmark completed', {
      totalResults: results.length,
      summary
    });

    return { results, summary };
  }

  private async benchmarkRedisPublish(messageCount: number): Promise<BenchmarkResult> {
    const operation = `Publish ${messageCount} messages`;
    const latencies: number[] = [];
    let errors = 0;

    const testData = this.generateTestMessage();
    const startTime = Date.now();

    for (let i = 0; i < messageCount; i++) {
      const msgStart = Date.now();
      try {
        await redis.set(`bench:pub:${i}`, testData, 300); // 5 minute TTL
        latencies.push(Date.now() - msgStart);
      } catch (error) {
        errors++;
        logger.debug('Redis publish error:', error);
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      operation,
      technology: 'Redis',
      totalMessages: messageCount,
      totalTime,
      messagesPerSecond: messageCount / (totalTime / 1000),
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      errors
    };
  }

  private async benchmarkNatsPublish(messageCount: number): Promise<BenchmarkResult> {
    const operation = `Publish ${messageCount} messages`;
    const latencies: number[] = [];
    let errors = 0;

    const testData = this.generateTestMessage();
    const startTime = Date.now();

    for (let i = 0; i < messageCount; i++) {
      const msgStart = Date.now();
      try {
        await jetStreamService.publish(`benchmarks.publish`, {
          id: i,
          data: testData,
          timestamp: new Date()
        });
        latencies.push(Date.now() - msgStart);
      } catch (error) {
        errors++;
        logger.debug('NATS publish error:', error);
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      operation,
      technology: 'NATS',
      totalMessages: messageCount,
      totalTime,
      messagesPerSecond: messageCount / (totalTime / 1000),
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      errors
    };
  }

  private async benchmarkRedisTimeSeries(messageCount: number): Promise<BenchmarkResult> {
    const operation = `Time Series ${messageCount} entries`;
    const latencies: number[] = [];
    let errors = 0;

    const startTime = Date.now();

    for (let i = 0; i < messageCount; i++) {
      const msgStart = Date.now();
      try {
        const score = Date.now() + i;
        const member = JSON.stringify({
          metric: 'benchmark',
          value: Math.random() * 100,
          timestamp: new Date().toISOString()
        });

        await redis.zadd('bench:timeseries', score, member);
        latencies.push(Date.now() - msgStart);
      } catch (error) {
        errors++;
        logger.debug('Redis time series error:', error);
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      operation,
      technology: 'Redis',
      totalMessages: messageCount,
      totalTime,
      messagesPerSecond: messageCount / (totalTime / 1000),
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      errors
    };
  }

  private async benchmarkNatsTimeSeries(messageCount: number): Promise<BenchmarkResult> {
    const operation = `Time Series ${messageCount} entries`;
    const latencies: number[] = [];
    let errors = 0;

    const startTime = Date.now();

    for (let i = 0; i < messageCount; i++) {
      const msgStart = Date.now();
      try {
        await jetStreamService.publish('analytics.timeseries.benchmark', {
          metric: 'benchmark',
          value: Math.random() * 100,
          timestamp: new Date(),
          metadata: { sequence: i }
        });
        latencies.push(Date.now() - msgStart);
      } catch (error) {
        errors++;
        logger.debug('NATS time series error:', error);
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      operation,
      technology: 'NATS',
      totalMessages: messageCount,
      totalTime,
      messagesPerSecond: messageCount / (totalTime / 1000),
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      errors
    };
  }

  private generateTestMessage(): any {
    const message = {
      id: Math.random().toString(36),
      timestamp: new Date().toISOString(),
      data: {
        userId: 'user123',
        action: 'test_action',
        metadata: {
          source: 'benchmark',
          version: '1.0.0'
        }
      }
    };

    // Pad to target size
    const currentSize = JSON.stringify(message).length;
    if (currentSize < this.MESSAGE_SIZE_BYTES) {
      (message.data.metadata as any)['padding'] = 'x'.repeat(this.MESSAGE_SIZE_BYTES - currentSize - 20);
    }

    return message;
  }

  private calculateSummary(results: BenchmarkResult[]): {
    redisWins: number;
    natsWins: number;
    ties: number;
  } {
    let redisWins = 0;
    let natsWins = 0;
    let ties = 0;

    // Group results by operation and message count
    const groupedResults = new Map<string, BenchmarkResult[]>();

    for (const result of results) {
      const key = `${result.operation}`;
      if (!groupedResults.has(key)) {
        groupedResults.set(key, []);
      }
      groupedResults.get(key)!.push(result);
    }

    // Compare each group
    for (const [operation, groupResults] of groupedResults) {
      const redisResult = groupResults.find(r => r.technology === 'Redis');
      const natsResult = groupResults.find(r => r.technology === 'NATS');

      if (redisResult && natsResult) {
        // Compare by messages per second (higher is better)
        const redisThroughput = redisResult.messagesPerSecond;
        const natsThroughput = natsResult.messagesPerSecond;

        const difference = Math.abs(redisThroughput - natsThroughput);
        const threshold = Math.max(redisThroughput, natsThroughput) * 0.05; // 5% threshold

        if (difference < threshold) {
          ties++;
        } else if (redisThroughput > natsThroughput) {
          redisWins++;
        } else {
          natsWins++;
        }
      }
    }

    return { redisWins, natsWins, ties };
  }

  async cleanupBenchmarkData(): Promise<void> {
    try {
      // Clean up Redis benchmark data
      if (redis.isReady()) {
        const keys = await redis.keys('bench:*');
        for (const key of keys) {
          await redis.del(key);
        }
        logger.info('Cleaned up Redis benchmark data', { keysDeleted: keys.length });
      }

      // NATS data will be cleaned up automatically based on retention policies
      logger.info('Benchmark cleanup completed');
    } catch (error) {
      logger.error('Error cleaning up benchmark data:', error);
    }
  }

  async getBenchmarkReport(results: BenchmarkResult[]): Promise<string> {
    let report = '# Redis vs NATS Performance Benchmark Report\n\n';

    report += '## Summary\n\n';
    report += '| Technology | Avg Throughput (msg/s) | Avg Latency (ms) | Total Errors |\n';
    report += '|------------|------------------------|-------------------|---------------|\n';

    const redisResults = results.filter(r => r.technology === 'Redis');
    const natsResults = results.filter(r => r.technology === 'NATS');

    if (redisResults.length > 0) {
      const avgThroughput = redisResults.reduce((sum, r) => sum + r.messagesPerSecond, 0) / redisResults.length;
      const avgLatency = redisResults.reduce((sum, r) => sum + r.averageLatency, 0) / redisResults.length;
      const totalErrors = redisResults.reduce((sum, r) => sum + r.errors, 0);

      report += `| Redis      | ${avgThroughput.toFixed(2)} | ${avgLatency.toFixed(2)} | ${totalErrors} |\n`;
    }

    if (natsResults.length > 0) {
      const avgThroughput = natsResults.reduce((sum, r) => sum + r.messagesPerSecond, 0) / natsResults.length;
      const avgLatency = natsResults.reduce((sum, r) => sum + r.averageLatency, 0) / natsResults.length;
      const totalErrors = natsResults.reduce((sum, r) => sum + r.errors, 0);

      report += `| NATS       | ${avgThroughput.toFixed(2)} | ${avgLatency.toFixed(2)} | ${totalErrors} |\n`;
    }

    report += '\n## Detailed Results\n\n';

    for (const result of results) {
      report += `### ${result.technology} - ${result.operation}\n\n`;
      report += `- **Throughput**: ${result.messagesPerSecond.toFixed(2)} messages/second\n`;
      report += `- **Average Latency**: ${result.averageLatency.toFixed(2)}ms\n`;
      report += `- **Min Latency**: ${result.minLatency}ms\n`;
      report += `- **Max Latency**: ${result.maxLatency}ms\n`;
      report += `- **Total Time**: ${result.totalTime}ms\n`;
      report += `- **Errors**: ${result.errors}\n\n`;
    }

    return report;
  }
}

export const redisVsNatsBenchmark = new RedisVsNatsBenchmark();
export default redisVsNatsBenchmark;