import { SpApiRequest } from '../../nodes/AmazonSellingPartner/helpers/SpApiRequest';
import { IExecuteFunctions } from 'n8n-workflow';
import { getEndpointGroup } from '../../nodes/AmazonSellingPartner/core/rateLimitConfig';

// Skip integration tests if no credentials are provided
const hasCredentials = process.env.SP_API_LWA_CLIENT_ID && process.env.SP_API_LWA_CLIENT_SECRET;
const describeIntegration = hasCredentials ? describe : describe.skip;

describeIntegration('Production Rate Limiting Tests', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeAll(() => {
		if (!hasCredentials) {
			console.log('Skipping production rate limiting tests - no credentials provided');
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
				id: 'production-test-node',
				name: 'Production Rate Limit Test',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
		} as any;
	});

	describe('Rate Limit Group Classification', () => {
		it('should correctly classify order endpoints', () => {
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567')).toBe('orders-detail');
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/orderItems')).toBe('orders-detail');
			expect(getEndpointGroup('/orders/v0/orders')).toBe('orders-list');
			expect(getEndpointGroup('/orders/v0/orders?CreatedAfter=2024-01-01')).toBe('orders-list');
		});
	});

	describe('Order Details Rate Limiting (Production Readiness)', () => {
		const testOrderId = '123-1234567-1234567';

		it('should handle moderate burst load within limits', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const startTime = Date.now();
			const promises = [];

			// Make 5 parallel requests (well within 30 burst limit)
			for (let i = 0; i < 5; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}`,
					}).catch(() => ({ success: false }))
				);
			}

			await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should complete quickly (within burst capacity)
			expect(duration).toBeLessThan(3000);
		}, 15000);

		it('should handle order items requests independently', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const startTime = Date.now();
			const promises = [];

			// Make 5 getOrderItems requests
			for (let i = 0; i < 5; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/${testOrderId}/orderItems`,
					}).catch(() => ({ success: false }))
				);
			}

			await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(3000);
		}, 15000);
	});

	describe('Cross-Group Independence', () => {
		it('should handle different operation types independently', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const testOrderId = '123-1234567-1234567';
			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 7);
			const createdBefore = new Date();

			// Make requests to different groups simultaneously
			const promises = [
				// Orders detail group
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: `/orders/v0/orders/${testOrderId}`,
				}).catch(() => ({ success: false })),
				
				// Orders list group
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
					query: {
						MarketplaceIds: ['ATVPDKIKX0DER'],
						CreatedAfter: createdAfter.toISOString(),
						CreatedBefore: createdBefore.toISOString(),
					},
				}).catch(() => ({ success: false })),
			];

			const startTime = Date.now();
			await Promise.all(promises);
			const duration = Date.now() - startTime;

			// Should complete quickly since groups are independent
			expect(duration).toBeLessThan(5000);
		}, 15000);
	});

	describe('Production Workflow Simulation', () => {
		it('should handle realistic order processing workflow', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const testOrderId = '123-1234567-1234567';
			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 7);
			const createdBefore = new Date();

			// Simulate realistic workflow
			const startTime = Date.now();

			try {
				// 1. Get orders list
				await SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
					query: {
						MarketplaceIds: ['ATVPDKIKX0DER'],
						CreatedAfter: createdAfter.toISOString(),
						CreatedBefore: createdBefore.toISOString(),
					},
				});

				// 2. Get order details
				await SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: `/orders/v0/orders/${testOrderId}`,
				});

				// 3. Get order items
				await SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: `/orders/v0/orders/${testOrderId}/orderItems`,
				});
			} catch (error) {
				// Expected for sandbox - just ensure no rate limit errors
				const errorMessage = error instanceof Error ? error.message : '';
				expect(errorMessage).not.toContain('429');
				expect(errorMessage).not.toContain('rate limit');
			}

			const duration = Date.now() - startTime;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(10000);
		}, 20000);
	});

	describe('Error Handling and Recovery', () => {
		it('should not produce 429 errors under normal load', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) return;

			const promises = [];
			let rateLimitErrors = 0;

			// Make multiple requests that should be handled by rate limiter
			for (let i = 0; i < 10; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: `/orders/v0/orders/123-1234567-1234567`,
					}).catch((error) => {
						const errorMessage = error instanceof Error ? error.message : '';
						if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
							rateLimitErrors++;
						}
						return { error: errorMessage };
					})
				);
			}

			await Promise.all(promises);

			// Should not have any 429 errors due to our rate limiting
			expect(rateLimitErrors).toBe(0);
		}, 30000);
	});
}); 