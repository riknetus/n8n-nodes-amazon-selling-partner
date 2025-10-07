import { SpApiRequest } from '../../nodes/AmazonSellingPartner/helpers/SpApiRequest';
import { IExecuteFunctions } from 'n8n-workflow';
import { getEndpointGroup } from '../../nodes/AmazonSellingPartner/core/rateLimitConfig';

// Skip integration tests if no credentials are provided
const hasCredentials = process.env.SP_API_LWA_CLIENT_ID && process.env.SP_API_LWA_CLIENT_SECRET;
const describeIntegration = hasCredentials ? describe : describe.skip;

describeIntegration('Order Rate Limiting Integration Tests', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeAll(() => {
		if (!hasCredentials) {
			console.log('Skipping Order Rate Limiting integration tests - no credentials provided');
			console.log('Set SP_API_LWA_CLIENT_ID, SP_API_LWA_CLIENT_SECRET, and SP_API_LWA_REFRESH_TOKEN to run these tests');
		}
	});

	beforeEach(() => {
		mockExecuteFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				lwaClientId: process.env.SP_API_LWA_CLIENT_ID,
				lwaClientSecret: process.env.SP_API_LWA_CLIENT_SECRET,
				lwaRefreshToken: process.env.SP_API_LWA_REFRESH_TOKEN,
				environment: 'sandbox',
				awsRegion: 'us-east-1',
			}),
			getNode: jest.fn().mockReturnValue({
				id: 'rate-limit-test-node',
				name: 'Rate Limit Test',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
		} as any;
	});

	describe('Rate Limit Group Classification', () => {
		it('should classify order detail endpoints correctly', () => {
			const testCases = [
				{ endpoint: '/orders/v0/orders/123-1234567-1234567', expectedGroup: 'orders-detail' },
				{ endpoint: '/orders/v0/orders/123-1234567-1234567/orderItems', expectedGroup: 'orders-detail' },
				{ endpoint: '/orders/v0/orders/123-1234567-1234567/orderAddress', expectedGroup: 'orders-detail' },
				{ endpoint: '/orders/v0/orders/123-1234567-1234567/buyerInfo', expectedGroup: 'orders-detail' },
				{ endpoint: '/orders/v0/orders/123-1234567-1234567/orderItemsBuyerInfo', expectedGroup: 'orders-detail' },
			];

			testCases.forEach(({ endpoint, expectedGroup }) => {
				expect(getEndpointGroup(endpoint)).toBe(expectedGroup);
			});
		});

		it('should classify order list endpoints correctly', () => {
			expect(getEndpointGroup('/orders/v0/orders')).toBe('orders-list');
		});
	});

	describe('Order Details Rate Limiting (0.5 rps, 30 burst)', () => {
		const testOrderId = process.env.SPAPI_SANDBOX_TEST_ORDER_ID || '123-1234567-1234567';

		it('should handle burst of getOrder requests within rate limits', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const promises: Promise<any>[] = [];
			const startTime = Date.now();

			// Make 10 parallel getOrder requests (well within 30 burst limit)
			for (let i = 0; i < 10; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}`,
					}).catch(error => {
						// Handle expected errors (like order not found) but track timing
						return { error: error.message, timestamp: Date.now() };
					})
				);
			}

			const results = await Promise.all(promises);
			const duration = Date.now() - startTime;

			// All requests should complete relatively quickly (within burst capacity)
			expect(duration).toBeLessThan(5000); // 5 seconds max
			expect(results).toHaveLength(10);

			// Verify no rate limit errors occurred
			const rateLimitErrors = results.filter(result => 
				'error' in result && result.error && result.error.includes('rate limit')
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 30000);

		it('should handle burst of getOrderItems requests within rate limits', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const promises: Promise<any>[] = [];
			const startTime = Date.now();

			// Make 15 parallel getOrderItems requests (within 30 burst limit)
			for (let i = 0; i < 15; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}/orderItems`,
					}).catch(error => {
						// Handle expected errors but track timing
						return { error: error.message, timestamp: Date.now() };
					})
				);
			}

			const results = await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(8000); // 8 seconds max
			expect(results).toHaveLength(15);

			// Verify no rate limit errors occurred
			const rateLimitErrors = results.filter(result => 
				'error' in result && result.error && result.error.includes('rate limit')
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 30000);

		it('should properly throttle requests exceeding burst capacity', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const promises: Promise<any>[] = [];
			const startTime = Date.now();

			// Make 35 requests (exceeding 30 burst limit)
			for (let i = 0; i < 35; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}`,
					}).catch(error => {
						return { error: error.message, timestamp: Date.now() };
					})
				);
			}

			const results = await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should take longer due to rate limiting (5 extra requests / 0.5 rps = 10+ seconds)
			expect(duration).toBeGreaterThan(8000); // At least 8 seconds
			expect(results).toHaveLength(35);

			// Verify no 429 errors occurred (our rate limiter should prevent them)
			const rateLimitErrors = results.filter(result => 
				'error' in result && result.error && (result.error.includes('429') || result.error.includes('rate limit'))
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 60000); // Longer timeout for this test

		it('should handle mixed order detail operations correctly', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const promises: Promise<any>[] = [];
			const startTime = Date.now();

			// Mix of different order detail operations (all should use same rate limit group)
			const operations = [
				`/orders/v0/orders/${testOrderId}`,
				`/orders/v0/orders/${testOrderId}/orderItems`,
				`/orders/v0/orders/${testOrderId}/orderAddress`,
				`/orders/v0/orders/${testOrderId}/buyerInfo`,
			];

			// Make 20 requests total (5 of each type)
			for (let i = 0; i < 20; i++) {
				const endpoint = operations[i % operations.length];
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint,
					}).catch(error => {
						return { error: error.message, timestamp: Date.now() };
					})
				);
			}

			const results = await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should complete within reasonable time (within burst capacity)
			expect(duration).toBeLessThan(8000);
			expect(results).toHaveLength(20);

			// Verify no rate limit errors occurred
			const rateLimitErrors = results.filter(result => 
				'error' in result && result.error && result.error.includes('rate limit')
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 30000);
	});

	describe('Order List Rate Limiting (0.0167 rps, 20 burst)', () => {
		it('should handle burst of getOrders requests within rate limits', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const promises: Promise<any>[] = [];
			const startTime = Date.now();

			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 7);
			const createdBefore = new Date();

			// Make 10 parallel getOrders requests (within 20 burst limit)
			for (let i = 0; i < 10; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: '/orders/v0/orders',
						query: {
							MarketplaceIds: ['ATVPDKIKX0DER'],
							CreatedAfter: createdAfter.toISOString(),
							CreatedBefore: createdBefore.toISOString(),
						},
					}).catch(error => {
						return { error: error.message, timestamp: Date.now() };
					})
				);
			}

			const results = await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(10000);
			expect(results).toHaveLength(10);

			// Verify no rate limit errors occurred
			const rateLimitErrors = results.filter(result => 
				'error' in result && result.error && result.error.includes('rate limit')
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 30000);

		it('should properly throttle getOrders requests exceeding burst capacity', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const promises: Promise<any>[] = [];
			const startTime = Date.now();

			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 7);
			const createdBefore = new Date();

			// Make 25 requests (exceeding 20 burst limit)
			for (let i = 0; i < 25; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: '/orders/v0/orders',
						query: {
							MarketplaceIds: ['ATVPDKIKX0DER'],
							CreatedAfter: createdAfter.toISOString(),
							CreatedBefore: createdBefore.toISOString(),
						},
					}).catch(error => {
						return { error: error.message, timestamp: Date.now() };
					})
				);
			}

			const results = await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should take much longer due to very low rate limit (5 extra requests / 0.0167 rps = ~300 seconds)
			// But we'll use a more reasonable timeout for testing
			expect(duration).toBeGreaterThan(30000); // At least 30 seconds
			expect(results).toHaveLength(25);

			// Verify no 429 errors occurred
			const rateLimitErrors = results.filter(result => 
				'error' in result && result.error && (result.error.includes('429') || result.error.includes('rate limit'))
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 120000); // 2 minute timeout
	});

	describe('Cross-Group Rate Limiting Independence', () => {
		it('should handle order detail and order list operations independently', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const testOrderId = process.env.SPAPI_SANDBOX_TEST_ORDER_ID || '123-1234567-1234567';
			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 7);
			const createdBefore = new Date();

			// Exhaust order detail tokens first
			const detailPromises: Promise<any>[] = [];
			for (let i = 0; i < 30; i++) {
				detailPromises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}`,
					}).catch(error => ({ error: error.message }))
				);
			}

			await Promise.all(detailPromises);

			// Now make order list requests - should still work immediately
			const startTime = Date.now();
			const listPromise = SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
				query: {
					MarketplaceIds: ['ATVPDKIKX0DER'],
					CreatedAfter: createdAfter.toISOString(),
					CreatedBefore: createdBefore.toISOString(),
				},
			}).catch(error => ({ error: error.message }));

			const result = await listPromise;
			const duration = Date.now() - startTime;

			// Should complete quickly despite order detail tokens being exhausted
			expect(duration).toBeLessThan(5000);
			expect(result).toBeDefined();
		}, 60000);
	});

	describe('Production Scenario Simulation', () => {
		it('should handle realistic order processing workflow', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const testOrderId = process.env.SPAPI_SANDBOX_TEST_ORDER_ID || '123-1234567-1234567';
			const startTime = Date.now();

			// Simulate realistic workflow: get orders, then get details for each
			const workflow = async () => {
				// 1. Get orders (orders-list group)
				const ordersResponse = await SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
					query: {
						MarketplaceIds: ['ATVPDKIKX0DER'],
						CreatedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
						CreatedBefore: new Date().toISOString(),
					},
				}).catch(error => ({ error: error.message }));

				// 2. Get order details for multiple orders (orders-detail group)
				const detailPromises = [];
				for (let i = 0; i < 5; i++) {
					detailPromises.push(
						SpApiRequest.makeRequest(mockExecuteFunctions, {
							method: 'GET',
							endpoint: `/orders/v0/orders/${testOrderId}`,
						}).catch(error => ({ error: error.message }))
					);
				}

				// 3. Get order items for each order (orders-detail group)
				const itemPromises = [];
				for (let i = 0; i < 5; i++) {
					itemPromises.push(
						SpApiRequest.makeRequest(mockExecuteFunctions, {
							method: 'GET',
							endpoint: `/orders/v0/orders/${testOrderId}/orderItems`,
						}).catch(error => ({ error: error.message }))
					);
				}

				const [detailResults, itemResults] = await Promise.all([
					Promise.all(detailPromises),
					Promise.all(itemPromises),
				]);

				return {
					ordersResponse,
					detailResults,
					itemResults,
				};
			};

			const results = await workflow();
			const duration = Date.now() - startTime;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(15000); // 15 seconds
			expect(results.ordersResponse).toBeDefined();
			expect(results.detailResults).toHaveLength(5);
			expect(results.itemResults).toHaveLength(5);

			// Verify no rate limit errors in any operation
			const allResults = [
				results.ordersResponse,
				...results.detailResults,
				...results.itemResults,
			];

			const rateLimitErrors = allResults.filter(result => 
				'error' in result && result.error && (result.error.includes('429') || result.error.includes('rate limit'))
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 45000);
	});

	describe('Rate Limit Recovery', () => {
		it('should recover from rate limit exhaustion over time', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const testOrderId = process.env.SPAPI_SANDBOX_TEST_ORDER_ID || '123-1234567-1234567';

			// Exhaust order detail tokens
			const exhaustPromises: Promise<any>[] = [];
			for (let i = 0; i < 30; i++) {
				exhaustPromises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}`,
					}).catch(error => ({ error: error.message }))
				);
			}

			await Promise.all(exhaustPromises);

			// Wait for some token recovery (0.5 rps means 1 token every 2 seconds)
			await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds = ~2.5 tokens

			// Should be able to make a few more requests
			const startTime = Date.now();
			const recoveryPromises: Promise<any>[] = [];
			for (let i = 0; i < 2; i++) {
				recoveryPromises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}`,
					}).catch(error => ({ error: error.message }))
				);
			}

			const results = await Promise.all(recoveryPromises);
			const duration = Date.now() - startTime;

			// Should complete relatively quickly (using recovered tokens)
			expect(duration).toBeLessThan(3000);
			expect(results).toHaveLength(2);

			// Verify no rate limit errors
			const rateLimitErrors = results.filter(result => 
				'error' in result && result.error && result.error.includes('rate limit')
			);
			expect(rateLimitErrors).toHaveLength(0);
		}, 30000);
	});
}); 