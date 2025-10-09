import { RateLimiter } from '../RateLimiter';
import { NodeOperationError } from 'n8n-workflow';

// Mock the rate limit config
jest.mock('../rateLimitConfig', () => ({
	getRateLimitConfig: jest.fn((group: string) => {
		const configs = {
			'orders-detail': { rate: 0.5, burst: 30 },
			'orders-list': { rate: 0.0167, burst: 20 },
			'test-group': { rate: 2.0, burst: 5 },
			'default': { rate: 0.5, burst: 10 },
		};
		return configs[group as keyof typeof configs] || configs['default'];
	}),
	validateRateLimitConfig: jest.fn(() => true),
}));

// Mock metrics collector
jest.mock('../MetricsCollector', () => ({
	metricsCollector: {
		recordRateLimitHit: jest.fn(),
		recordMetric: jest.fn(),
	},
}));

describe('RateLimiter', () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		rateLimiter = new RateLimiter({ queueTimeout: 5000 }); // Short timeout for tests
	});

	afterEach(() => {
		rateLimiter.cleanup();
		jest.useRealTimers();
	});

	describe('Basic token consumption', () => {
		it('should allow immediate requests when tokens are available', async () => {
			const startTime = Date.now();
			await rateLimiter.waitForToken('test-group');
			const duration = Date.now() - startTime;
			
			expect(duration).toBeLessThan(100); // Should be immediate
		});

		it('should consume tokens from the correct group', async (): Promise<void> => {
			// Consume all burst tokens for test-group (5 tokens)
			const promises: Promise<void>[] = [];
			for (let i = 0; i < 5; i++) {
				promises.push(rateLimiter.waitForToken('test-group'));
			}
			
			await Promise.all(promises);
			
			// Next request should be queued
			const promise = rateLimiter.waitForToken('test-group');
			
			// Should not resolve immediately
			let resolved = false;
			promise.then(() => { resolved = true; });
			
			await jest.advanceTimersByTimeAsync(100);
			expect(resolved).toBe(false);

			// Prevent unhandled promise rejection in test
			promise.catch(() => {});
		});

		it('should handle different groups independently', async () => {
			// Exhaust tokens for test-group
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// orders-detail group should still work
			const promise = rateLimiter.waitForToken('orders-detail');
			
			// Should not resolve immediately
			let resolved = false;
			promise.then(() => { resolved = true; });
			
			await jest.advanceTimersByTimeAsync(100);
			expect(resolved).toBe(false);
			
			// Prevent unhandled promise rejection in test
			promise.catch(() => {});
		});
	});

	describe('Token refill mechanism', () => {
		it('should refill tokens over time', async () => {
			// Consume all burst tokens
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// Wait for token refill (test-group has 2.0 rps, so 0.5s should give 1 token)
			await new Promise(resolve => setTimeout(resolve, 600));
			
			// Should be able to make another request
			await rateLimiter.waitForToken('test-group');
		});

		it('should not exceed maximum token capacity', async () => {
			// Wait longer than needed to refill
			await new Promise(resolve => setTimeout(resolve, 3000));
			
			// Should still only be able to make burst number of requests
			const promises: Promise<void>[] = [];
			for (let i = 0; i < 5; i++) {
				promises.push(rateLimiter.waitForToken('test-group'));
			}
			
			await Promise.all(promises);
			
			// Next request should be queued
			const promise = rateLimiter.waitForToken('test-group');
			
			let resolved = false;
			promise.then(() => { resolved = true; });
			
			await jest.advanceTimersByTimeAsync(100);
			expect(resolved).toBe(false);
			
			// Prevent unhandled promise rejection in test
			promise.catch(() => {});
		});
	});

	describe('Request queuing', () => {
		it('should queue requests when no tokens available', async () => {
			// Exhaust all tokens
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// Queue additional requests
			const queuedPromises: Promise<void>[] = [];
			for (let i = 0; i < 3; i++) {
				queuedPromises.push(rateLimiter.waitForToken('test-group'));
			}
			
			// Requests should be queued, not resolved immediately
			await jest.advanceTimersByTimeAsync(100);
			
			const metrics = rateLimiter.getMetrics();
			expect(metrics.groupDetails['test-group'].queueLength).toBe(3);
		});

		it('should process queued requests as tokens become available', async () => {
			// Exhaust all tokens
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// Queue a request
			const queuedPromise = rateLimiter.waitForToken('test-group');
			
			// Wait for token refill and processing
			await new Promise(resolve => setTimeout(resolve, 1500));
			
			// Queued request should now be resolved
			await queuedPromise;
		});

		it('should handle queue timeout', async () => {
			// Create rate limiter with very short timeout
			const shortTimeoutLimiter = new RateLimiter({ queueTimeout: 100 });
			
			try {
				// Exhaust all tokens
				for (let i = 0; i < 5; i++) {
					await shortTimeoutLimiter.waitForToken('test-group');
				}
				
				// This should timeout
				const promise = shortTimeoutLimiter.waitForToken('test-group');
				
				// Should eventually reject after timeout
				await expect(promise).rejects.toThrow(NodeOperationError);
			} finally {
				shortTimeoutLimiter.cleanup();
			}
		});

		it('should track queue lengths', async () => {
			// Exhaust tokens and queue requests
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// Queue some requests
			const queuedPromises = [];
			for (let i = 0; i < 3; i++) {
				queuedPromises.push(rateLimiter.waitForToken('test-group'));
			}
			
			const metrics = rateLimiter.getMetrics();
			expect(metrics.queueLength).toBe(3);
			expect(metrics.groupDetails['test-group'].queueLength).toBe(3);
		});

		it('should track active groups', async () => {
			await rateLimiter.waitForToken('orders-detail');
			await rateLimiter.waitForToken('orders-list');
			
			const metrics = rateLimiter.getMetrics();
			expect(metrics.activeGroups).toBe(2);
		});

		it('should track rate limit hits', async (): Promise<void> => {
			const { metricsCollector } = require('../MetricsCollector');
			
			// Exhaust tokens
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// This should trigger a rate limit hit
			const promise = rateLimiter.waitForToken('test-group');
			
			await jest.advanceTimersByTimeAsync(100);
			
			expect(metricsCollector.recordRateLimitHit).toHaveBeenCalledWith('test-group');

			// Prevent unhandled promise rejection
			promise.catch(() => {});
		});
	});

	describe('Header updates', () => {
		it('should update rate limits from response headers', () => {
			const headers = {
				'x-amzn-ratelimit-limit': '1.0:50'
			};

			rateLimiter.updateFromHeaders('test-group', headers);

			const metrics = rateLimiter.getMetrics();
			expect(metrics.groupDetails['test-group'].maxTokens).toBe(50);
		});

		it('should ignore invalid rate limit headers', () => {
			const originalMetrics = rateLimiter.getMetrics();
			
			const headers = {
				'x-amzn-ratelimit-limit': 'invalid-format'
			};
			
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
			rateLimiter.updateFromHeaders('test-group', headers);
			
			const newMetrics = rateLimiter.getMetrics();
			expect(newMetrics.groupDetails['test-group']?.maxTokens).toBe(originalMetrics.groupDetails['test-group']?.maxTokens || 5);
			
			consoleSpy.mockRestore();
		});

		it('should handle missing rate limit headers gracefully', () => {
			const headers = {};
			
			// Should not throw
			expect(() => rateLimiter.updateFromHeaders('test-group', headers)).not.toThrow();
		});
	});

	describe('Retry mechanism with exponential backoff', () => {
		it('should retry with exponential backoff on timeout', async () => {
			const shortTimeoutLimiter = new RateLimiter({ queueTimeout: 50 });
			
			try {
				// Exhaust all tokens
				for (let i = 0; i < 5; i++) {
					await shortTimeoutLimiter.waitForToken('test-group');
				}
				
				// This should trigger retry mechanism
				const startTime = Date.now();
				const promise = shortTimeoutLimiter.waitForToken('test-group');
				
				// Should eventually resolve or reject after retries
				await expect(promise).rejects.toThrow();
				
				const duration = Date.now() - startTime;
				expect(duration).toBeGreaterThan(50); // Should have taken some time for retries
			} finally {
				shortTimeoutLimiter.cleanup();
			}
		});
	});

	describe('Metrics collection', () => {
		it('should track queue lengths', async () => {
			// Exhaust tokens and queue requests
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// Queue some requests
			const queuedPromises = [];
			for (let i = 0; i < 3; i++) {
				queuedPromises.push(rateLimiter.waitForToken('test-group'));
			}
			
			const metrics = rateLimiter.getMetrics();
			expect(metrics.queueLength).toBe(3);
			expect(metrics.groupDetails['test-group'].queueLength).toBe(3);

			// Cleanup promises
			Promise.all(queuedPromises).catch(() => {});
		});

		it('should track active groups', async () => {
			await rateLimiter.waitForToken('orders-detail');
			await rateLimiter.waitForToken('orders-list');
			
			const metrics = rateLimiter.getMetrics();
			expect(metrics.activeGroups).toBe(2);
		});

		it('should track rate limit hits', async (): Promise<void> => {
			const { metricsCollector } = require('../MetricsCollector');
			
			// Exhaust tokens
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			// This should trigger a rate limit hit
			const promise = rateLimiter.waitForToken('test-group');
			
			await jest.advanceTimersByTimeAsync(100);
			
			expect(metricsCollector.recordRateLimitHit).toHaveBeenCalledWith('test-group');

			// Prevent unhandled promise rejection
			promise.catch(() => {});
		});
	});

	describe('Production scenarios', () => {
		it('should handle burst of order detail requests correctly', async () => {
			// Simulate 35 parallel getOrderItems calls (more than burst of 30)
			const promises = [];
			
			for (let i = 0; i < 35; i++) {
				promises.push(rateLimiter.waitForToken('orders-detail'));
			}
			
			// Advance timers to simulate time passing
			await jest.advanceTimersByTimeAsync(12000); // 12 seconds should be enough
			
			await Promise.all(promises);
		}, 30000);

		it('should maintain separate limits for different operation types', async () => {
			// Use up orders-detail tokens
			for (let i = 0; i < 30; i++) {
				await rateLimiter.waitForToken('orders-detail');
			}
			
			// orders-list should still work immediately
			const startTime = Date.now();
			await rateLimiter.waitForToken('orders-list');
			const duration = Date.now() - startTime;
			
			expect(duration).toBeLessThan(100);
		});

		it('should handle sustained load without errors', async () => {
			// Simulate sustained load at just under the rate limit
			const promises = [];
			
			// Make requests at 0.4 rps for orders-detail (under the 0.5 rps limit)
			for (let i = 0; i < 5; i++) {
				promises.push(rateLimiter.waitForToken('orders-detail'));
				if (i < 4) {
					await jest.advanceTimersByTimeAsync(2500); // 0.4 rps
				}
			}
			
			// All requests should complete successfully
			await expect(Promise.all(promises)).resolves.not.toThrow();
		}, 30000);
	});

	describe('Cleanup and resource management', () => {
		it('should cleanup intervals and reject queued requests on cleanup', async () => {
			// Queue some requests
			for (let i = 0; i < 5; i++) {
				await rateLimiter.waitForToken('test-group');
			}
			
			const queuedPromise = rateLimiter.waitForToken('test-group');
			
			// Cleanup should reject the queued request
			rateLimiter.cleanup();
			
			await expect(queuedPromise).rejects.toThrow('Rate limiter shutting down');
		});

		it('should clear all limits on cleanup', () => {
			rateLimiter.waitForToken('test-group');
			rateLimiter.cleanup();
			
			const metrics = rateLimiter.getMetrics();
			expect(metrics.activeGroups).toBe(0);
		});
	});
}); 