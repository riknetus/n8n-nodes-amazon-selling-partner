import { MetricsCollector } from '../MetricsCollector';

describe('MetricsCollector', () => {
	let metricsCollector: MetricsCollector;

	beforeEach(() => {
		metricsCollector = new MetricsCollector();
		metricsCollector.stopMonitoring(); // Stop automatic health checks for tests
	});

	afterEach(() => {
		metricsCollector.stopMonitoring();
		metricsCollector.removeAllListeners();
	});

	describe('recordMetric', () => {
		it('should record a metric with timestamp', () => {
			const beforeTime = Date.now();
			metricsCollector.recordMetric('test_metric', 100, { tag1: 'value1' });
			const afterTime = Date.now();

			const metrics = metricsCollector.getMetrics();
			expect(metrics).toHaveLength(1);
			expect(metrics[0].name).toBe('test_metric');
			expect(metrics[0].value).toBe(100);
			expect(metrics[0].tags).toEqual({ tag1: 'value1' });
			expect(metrics[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
			expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime);
		});

		it('should emit metric event', (done) => {
			metricsCollector.on('metric', (metric) => {
				expect(metric.name).toBe('test_metric');
				expect(metric.value).toBe(50);
				done();
			});

			metricsCollector.recordMetric('test_metric', 50);
		});

		it('should limit metrics history', () => {
			// Record more than max history
			for (let i = 0; i < 1200; i++) {
				metricsCollector.recordMetric(`metric_${i}`, i);
			}

			const metrics = metricsCollector.getMetrics();
			expect(metrics.length).toBe(1000); // Should be limited to maxMetricsHistory
		});
	});

	describe('recordApiRequest', () => {
		it('should record successful API request', () => {
			metricsCollector.recordApiRequest('/orders/v0/orders', 1500, true);

			const stats = metricsCollector.getUsageStats();
			expect(stats.totalRequests).toBe(1);
			expect(stats.successfulRequests).toBe(1);
			expect(stats.failedRequests).toBe(0);
			expect(stats.averageResponseTime).toBe(1500);
			expect(stats.requestsByEndpoint['/orders/v0/orders']).toBe(1);
		});

		it('should record failed API request', () => {
			metricsCollector.recordApiRequest('/orders/v0/orders', 2000, false, 'HTTP_404');

			const stats = metricsCollector.getUsageStats();
			expect(stats.totalRequests).toBe(1);
			expect(stats.successfulRequests).toBe(0);
			expect(stats.failedRequests).toBe(1);
			expect(stats.averageResponseTime).toBe(2000);
			expect(stats.errorsByType['HTTP_404']).toBe(1);
		});

		it('should calculate average response time correctly', () => {
			metricsCollector.recordApiRequest('/orders/v0/orders', 1000, true);
			metricsCollector.recordApiRequest('/orders/v0/orders', 2000, true);
			metricsCollector.recordApiRequest('/orders/v0/orders', 3000, true);

			const stats = metricsCollector.getUsageStats();
			expect(stats.averageResponseTime).toBe(2000); // (1000 + 2000 + 3000) / 3
		});

		it('should record individual metrics', () => {
			metricsCollector.recordApiRequest('/orders/v0/orders', 1500, true);

			const metrics = metricsCollector.getMetrics();
			const durationMetrics = metrics.filter(m => m.name === 'api_request_duration');
			const countMetrics = metrics.filter(m => m.name === 'api_request_count');

			expect(durationMetrics).toHaveLength(1);
			expect(countMetrics).toHaveLength(1);
			expect(durationMetrics[0].value).toBe(1500);
			expect(countMetrics[0].value).toBe(1);
		});
	});

	describe('recordRateLimitHit', () => {
		it('should record rate limit hit', () => {
			metricsCollector.recordRateLimitHit('/orders/v0/orders');

			const stats = metricsCollector.getUsageStats();
			expect(stats.rateLimitHits).toBe(1);
		});

		it('should emit rateLimitHit event', (done) => {
			metricsCollector.on('rateLimitHit', (data) => {
				expect(data.endpoint).toBe('/orders/v0/orders');
				expect(data.timestamp).toBeInstanceOf(Date);
				done();
			});

			metricsCollector.recordRateLimitHit('/orders/v0/orders');
		});
	});

	describe('performHealthCheck', () => {
		it('should return healthy status with passing checks', async () => {
			// Record some successful requests
			metricsCollector.recordApiRequest('/orders/v0/orders', 1000, true);
			metricsCollector.recordApiRequest('/orders/v0/orders', 1200, true);

			const healthCheck = await metricsCollector.performHealthCheck();

			expect(healthCheck.status).toBe('healthy');
			expect(healthCheck.checks.memory.status).toBe('pass');
			expect(healthCheck.checks.errorRate.status).toBe('pass');
			expect(healthCheck.checks.responseTime.status).toBe('pass');
			expect(healthCheck.checks.rateLimits.status).toBe('pass');
		});

		it('should return degraded status with warnings', async () => {
			// Record some requests with high response times
			metricsCollector.recordApiRequest('/orders/v0/orders', 3000, true);
			metricsCollector.recordApiRequest('/orders/v0/orders', 4000, true);

			const healthCheck = await metricsCollector.performHealthCheck();

			expect(healthCheck.status).toBe('degraded');
			expect(healthCheck.checks.responseTime.status).toBe('warn');
		});

		it('should return unhealthy status with failures', async () => {
			// Record high error rate
			for (let i = 0; i < 8; i++) {
				metricsCollector.recordApiRequest('/orders/v0/orders', 1000, false, 'HTTP_500');
			}
			for (let i = 0; i < 2; i++) {
				metricsCollector.recordApiRequest('/orders/v0/orders', 1000, true);
			}

			const healthCheck = await metricsCollector.performHealthCheck();

			expect(healthCheck.status).toBe('unhealthy');
			expect(healthCheck.checks.errorRate.status).toBe('fail');
		});

		it('should emit healthCheck event', (done) => {
			metricsCollector.on('healthCheck', (result) => {
				expect(result.status).toBeDefined();
				expect(result.checks).toBeDefined();
				done();
			});

			metricsCollector.performHealthCheck();
		});
	});

	describe('getMetricsSummary', () => {
		it('should return summary for time window', () => {
			metricsCollector.recordMetric('test_metric', 10);
			metricsCollector.recordMetric('test_metric', 20);
			metricsCollector.recordMetric('test_metric', 30);

			const summary = metricsCollector.getMetricsSummary();

			expect(summary.test_metric).toBeDefined();
			expect(summary.test_metric.count).toBe(3);
			expect(summary.test_metric.sum).toBe(60);
			expect(summary.test_metric.min).toBe(10);
			expect(summary.test_metric.max).toBe(30);
			expect(summary.test_metric.avg).toBe(20);
		});

		it('should filter by time window', () => {
			// Record old metric (should be filtered out)
			const oldMetric = {
				name: 'old_metric',
				value: 100,
				timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
			};
			metricsCollector['metrics'].push(oldMetric);

			// Record recent metric
			metricsCollector.recordMetric('recent_metric', 50);

			const summary = metricsCollector.getMetricsSummary(5 * 60 * 1000); // 5 minutes window

			expect(summary.old_metric).toBeUndefined();
			expect(summary.recent_metric).toBeDefined();
		});
	});

	describe('resetStats', () => {
		it('should reset all statistics', () => {
			metricsCollector.recordApiRequest('/orders/v0/orders', 1000, true);
			metricsCollector.recordMetric('test_metric', 100);

			metricsCollector.resetStats();

			const stats = metricsCollector.getUsageStats();
			const metrics = metricsCollector.getMetrics();

			expect(stats.totalRequests).toBe(0);
			expect(metrics).toHaveLength(0);
		});

		it('should emit statsReset event', (done) => {
			metricsCollector.on('statsReset', (timestamp) => {
				expect(timestamp).toBeInstanceOf(Date);
				done();
			});

			metricsCollector.resetStats();
		});
	});

	describe('exportPrometheusMetrics', () => {
		it('should export metrics in Prometheus format', () => {
			metricsCollector.recordMetric('api_request_duration', 1500, { endpoint: '/orders', success: 'true' });
			metricsCollector.recordMetric('api_request_count', 1, { endpoint: '/orders', success: 'true' });

			const prometheusData = metricsCollector.exportPrometheusMetrics();

			expect(prometheusData).toContain('# TYPE api_request_duration gauge');
			expect(prometheusData).toContain('api_request_duration{endpoint="/orders",success="true"}');
			expect(prometheusData).toContain('# TYPE api_request_count gauge');
			expect(prometheusData).toContain('api_request_count{endpoint="/orders",success="true"}');
		});

		it('should handle metrics without tags', () => {
			metricsCollector.recordMetric('simple_metric', 42);

			const prometheusData = metricsCollector.exportPrometheusMetrics();

			expect(prometheusData).toContain('# TYPE simple_metric gauge');
			expect(prometheusData).toContain('simple_metric 42');
		});

		it('should sanitize metric names', () => {
			metricsCollector.recordMetric('metric-with-dashes', 100);
			metricsCollector.recordMetric('metric.with.dots', 200);

			const prometheusData = metricsCollector.exportPrometheusMetrics();

			expect(prometheusData).toContain('metric_with_dashes');
			expect(prometheusData).toContain('metric_with_dots');
		});
	});
}); 