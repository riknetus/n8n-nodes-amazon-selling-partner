import { EventEmitter } from 'events';
export interface Metric {
    name: string;
    value: number;
    timestamp: Date;
    tags?: Record<string, string>;
}
export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: Date;
    checks: {
        [key: string]: {
            status: 'pass' | 'fail' | 'warn';
            message?: string;
            duration?: number;
        };
    };
}
export interface UsageStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    errorsByType: Record<string, number>;
    rateLimitHits: number;
    lastResetTime: Date;
}
export declare class MetricsCollector extends EventEmitter {
    private metrics;
    private usageStats;
    private readonly maxMetricsHistory;
    private healthCheckInterval?;
    constructor();
    private initializeUsageStats;
    /**
     * Record a performance metric
     */
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Record API request metrics
     */
    recordApiRequest(endpoint: string, duration: number, success: boolean, errorType?: string): void;
    /**
     * Record rate limit hit
     */
    recordRateLimitHit(endpoint: string): void;
    /**
     * Perform comprehensive health check
     */
    performHealthCheck(): Promise<HealthCheckResult>;
    /**
     * Get current usage statistics
     */
    getUsageStats(): UsageStats;
    /**
     * Get recent metrics
     */
    getMetrics(limit?: number): Metric[];
    /**
     * Reset usage statistics
     */
    resetStats(): void;
    /**
     * Get metrics summary for a specific time window
     */
    getMetricsSummary(timeWindowMs?: number): Record<string, any>;
    /**
     * Start automatic health check monitoring
     */
    private startHealthCheckMonitoring;
    /**
     * Stop health check monitoring
     */
    stopMonitoring(): void;
    /**
     * Export metrics in Prometheus format
     */
    exportPrometheusMetrics(): string;
}
export declare const metricsCollector: MetricsCollector;
