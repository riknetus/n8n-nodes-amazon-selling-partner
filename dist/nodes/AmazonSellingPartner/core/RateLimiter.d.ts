interface RateLimiterMetrics {
    queueLength: number;
    waitTimeMs: number;
    rateLimitHits: number;
    activeGroups: number;
}
interface DistributedBackend {
    getTokens(groupKey: string): Promise<number>;
    consumeTokens(groupKey: string, count: number): Promise<boolean>;
    refillTokens(groupKey: string, tokens: number, maxTokens: number): Promise<void>;
}
export declare class RateLimiter {
    private limits;
    private readonly QUEUE_TIMEOUT;
    private readonly MAX_RETRIES;
    private readonly BASE_RETRY_DELAY;
    private readonly MAX_RETRY_DELAY;
    private distributedBackend?;
    private metrics;
    constructor(options?: {
        queueTimeout?: number;
        distributedBackend?: DistributedBackend;
    });
    waitForToken(groupKey: string, retryCount?: number): Promise<void>;
    updateFromHeaders(groupKey: string, headers: Record<string, string>): void;
    getMetrics(): RateLimiterMetrics & {
        groupDetails: Record<string, {
            queueLength: number;
            tokens: number;
            maxTokens: number;
        }>;
    };
    private getRateLimit;
    private refillTokens;
    private processQueue;
    private calculateRetryDelay;
    private recordRateLimitHit;
    private updateQueueMetrics;
    private updateMetrics;
    private startMetricsCollection;
    cleanup(): void;
}
export {};
