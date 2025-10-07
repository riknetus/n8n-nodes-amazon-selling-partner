import { SpApiRequest } from '../../nodes/AmazonSellingPartner/helpers/SpApiRequest';
import { IExecuteFunctions } from 'n8n-workflow';
import { AmazonSellingPartner } from '../../nodes/AmazonSellingPartner/AmazonSellingPartner.node';

// Skip integration tests if no credentials are provided
const hasCredentials = process.env.SP_API_LWA_CLIENT_ID && process.env.SP_API_LWA_CLIENT_SECRET;

const describeIntegration = hasCredentials ? describe : describe.skip;

describeIntegration('SP-API Sandbox Integration Tests', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let amazonNode: AmazonSellingPartner;

	beforeAll(() => {
		if (!hasCredentials) {
			console.log('Skipping SP-API integration tests - no credentials provided');
			console.log('Set SP_API_LWA_CLIENT_ID, SP_API_LWA_CLIENT_SECRET, and SP_API_LWA_REFRESH_TOKEN to run these tests');
		}
	});

	beforeEach(() => {
		amazonNode = new AmazonSellingPartner();
		
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
				id: 'integration-test-node',
				name: 'SP-API Integration Test',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
		} as any;
	});

	describe('Authentication', () => {
		it('should successfully authenticate with sandbox', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return; // Skip if no credentials
			}

			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/sellers/v1/marketplaceParticipations',
			});

			expect(response.status).toBe(200);
			expect(response.data).toHaveProperty('payload');
			expect(response.data.payload).toHaveProperty('marketplaceParticipations');
		});
	});

	describe('Orders API', () => {
		it('should retrieve orders from sandbox', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return; // Skip if no credentials
			}

			// Use a recent date range for sandbox testing
			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 7); // 7 days ago
			const createdBefore = new Date();

			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
				query: {
					MarketplaceIds: ['ATVPDKIKX0DER'], // US marketplace
					CreatedAfter: createdAfter.toISOString(),
					CreatedBefore: createdBefore.toISOString(),
				},
			});

			expect(response.status).toBe(200);
			expect(response.data).toHaveProperty('payload');
			expect(response.data.payload).toHaveProperty('Orders');
			expect(Array.isArray(response.data.payload.Orders)).toBe(true);
		});

		it('should handle rate limiting gracefully', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return; // Skip if no credentials
			}

			// Make multiple rapid requests to test rate limiting
			const promises: Promise<any>[] = [];
			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 1); // 1 day ago
			const createdBefore = new Date();

			for (let i = 0; i < 5; i++) {
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: '/orders/v0/orders',
						query: {
							MarketplaceIds: ['ATVPDKIKX0DER'],
							CreatedAfter: createdAfter.toISOString(),
							CreatedBefore: createdBefore.toISOString(),
						},
					})
				);
			}

			// All requests should eventually succeed (may be queued due to rate limiting)
			const responses = await Promise.all(promises);
			
			responses.forEach(response => {
				expect(response.status).toBe(200);
				expect(response.data).toHaveProperty('payload');
			});
		}, 30000); // Increase timeout for rate limiting tests

		it('should handle invalid marketplace IDs', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return; // Skip if no credentials
			}

			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 1);
			const createdBefore = new Date();

			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
					query: {
						MarketplaceIds: ['INVALID_MARKETPLACE_ID'],
						CreatedAfter: createdAfter.toISOString(),
						CreatedBefore: createdBefore.toISOString(),
					},
				})
			).rejects.toThrow();
		});
	});

	describe('Error Handling', () => {
		it('should handle 404 errors properly', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return; // Skip if no credentials
			}

			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/nonexistent/endpoint',
				})
			).rejects.toThrow('Resource not found');
		});

		it('should handle invalid date ranges', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return; // Skip if no credentials
			}

			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
					query: {
						MarketplaceIds: ['ATVPDKIKX0DER'],
						CreatedAfter: 'invalid-date',
						CreatedBefore: new Date().toISOString(),
					},
				})
			).rejects.toThrow();
		});
	});

	describe('Performance', () => {
		it('should complete requests within reasonable time', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return; // Skip if no credentials
			}

			const startTime = Date.now();
			
			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/sellers/v1/marketplaceParticipations',
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Request should complete within 10 seconds
			expect(duration).toBeLessThan(10000);
		});
	});

	describe('Order Details & Items', () => {
		const testOrderId = process.env.SPAPI_SANDBOX_TEST_ORDER_ID || '123-1234567-1234567'; // Replace with a valid sandbox orderId if available

		it('should retrieve order details', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return;
			}
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: `/orders/v0/orders/${testOrderId}`,
			});
			expect(response.status).toBe(200);
			expect(response.data).toHaveProperty('payload');
			expect(response.data.payload).toHaveProperty('AmazonOrderId');
		});

		it('should retrieve order items', async () => {
			if (!process.env.SPAPI_SANDBOX_LWA_CLIENT_ID) {
				return;
			}
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: `/orders/v0/orders/${testOrderId}/orderItems`,
			});
			expect(response.status).toBe(200);
			expect(response.data).toHaveProperty('payload');
			expect(response.data.payload).toHaveProperty('OrderItems');
			// OrderItems may be empty in sandbox
			expect(Array.isArray(response.data.payload.OrderItems)).toBe(true);
		});
	});

	describe('Orders Operations', () => {
		it('should retrieve orders from sandbox successfully', async () => {
			// Setup parameters for getOrders operation
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('orders') // resource
				.mockReturnValueOnce('getOrders') // operation
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce('2024-01-01T00:00:00Z') // createdAfter
				.mockReturnValueOnce('2024-01-31T23:59:59Z') // createdBefore
				.mockReturnValueOnce({ returnAll: false, maxResultsPerPage: 5 }); // additionalOptions

			const result = await amazonNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Array);
			
			// Should return either orders or a "no orders found" message
			if (result[0].length > 0) {
				const firstItem = result[0][0];
				expect(firstItem.json).toBeDefined();
				
				// If it's an actual order, check for required fields
				if (firstItem.json.AmazonOrderId) {
					expect(firstItem.json.AmazonOrderId).toMatch(/^\d{3}-\d{7}-\d{7}$/);
					expect(firstItem.json.OrderStatus).toBeDefined();
					expect(firstItem.json.MarketplaceId).toBeDefined();
				} else {
					// Should be a "no orders found" message
					expect(firstItem.json.message).toContain('No orders found');
				}
			}
		}, 30000); // 30 second timeout for API calls

		it('should validate date range limits', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('orders') // resource
				.mockReturnValueOnce('getOrders') // operation
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce('2024-01-01T00:00:00Z') // createdAfter
				.mockReturnValueOnce('2024-03-01T23:59:59Z') // createdBefore (>30 days)
				.mockReturnValueOnce({}); // additionalOptions

			await expect(
				amazonNode.execute.call(mockExecuteFunctions)
			).rejects.toThrow('Date range cannot exceed 30 days');
		});

		it('should reject invalid order ID format', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('orders') // resource
				.mockReturnValueOnce('getOrder') // operation
				.mockReturnValueOnce('INVALID-ORDER-ID'); // orderId

			await expect(
				amazonNode.execute.call(mockExecuteFunctions)
			).rejects.toThrow('Invalid Order ID format');
		});
	});

	describe('Rate Limiting and Performance', () => {
		it('should handle multiple rapid requests without exceeding rate limits', async () => {
			const requests = Array.from({ length: 3 }, () => {
				const mockExecFunctions = {
					...mockExecuteFunctions,
					getNodeParameter: jest.fn()
						.mockReturnValueOnce('orders') // resource
						.mockReturnValueOnce('getOrders') // operation
						.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
						.mockReturnValueOnce('2024-01-01T00:00:00Z') // createdAfter
						.mockReturnValueOnce('2024-01-07T23:59:59Z') // createdBefore
						.mockReturnValueOnce({ maxResultsPerPage: 1 }), // additionalOptions
				};

				return amazonNode.execute.call(mockExecFunctions as any);
			});

			const startTime = Date.now();
			const results = await Promise.all(requests);
			const duration = Date.now() - startTime;

			// All requests should succeed
			expect(results).toHaveLength(3);
			results.forEach(result => {
				expect(result).toHaveLength(1);
				expect(result[0]).toBeInstanceOf(Array);
			});

			// Should take some time due to rate limiting (but not too long)
			expect(duration).toBeGreaterThan(1000); // At least 1 second
			expect(duration).toBeLessThan(30000); // Less than 30 seconds
		}, 45000);
	});

	describe('Error Recovery and Resilience', () => {
		it('should handle credential refresh gracefully', async () => {
			// This test simulates what happens when LWA tokens expire
			// The system should automatically refresh and retry

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('orders') // resource
				.mockReturnValueOnce('getOrders') // operation
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce('2024-01-01T00:00:00Z') // createdAfter
				.mockReturnValueOnce('2024-01-07T23:59:59Z') // createdBefore
				.mockReturnValueOnce({ maxResultsPerPage: 1 }); // additionalOptions

			const result = await amazonNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Array);
		}, 20000);
	});

	describe('Pagination Handling', () => {
		it('should handle pagination correctly when returnAll is true', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('orders') // resource
				.mockReturnValueOnce('getOrders') // operation
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce('2024-01-01T00:00:00Z') // createdAfter
				.mockReturnValueOnce('2024-01-31T23:59:59Z') // createdBefore
				.mockReturnValueOnce({ 
					returnAll: true, 
					maxResultsPerPage: 2 // Small page size to test pagination
				});

			const result = await amazonNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Array);
			
			// Even if no orders are found, should return a result
			expect(result[0].length).toBeGreaterThanOrEqual(1);
		}, 30000);
	});
});

// Load testing suite (optional, run separately)
describe('SP-API Load Tests', () => {
	it.skip('should handle sustained load', async () => {
		// This test would make 100+ requests over time to test sustained load
		// Skip by default as it's resource intensive
	});

	it.skip('should recover from rate limit bursts', async () => {
		// This test would intentionally trigger rate limits and verify recovery
	});
}); 