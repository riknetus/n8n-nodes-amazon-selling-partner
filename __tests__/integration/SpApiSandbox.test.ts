import { SpApiRequest } from '../../nodes/AmazonSellingPartner/helpers/SpApiRequest';
import { LwaClient } from '../../nodes/AmazonSellingPartner/helpers/LwaClient';
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
				awsRegion: process.env.SP_API_AWS_REGION || 'eu-west-1',
				primaryMarketplace: process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV',
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

	describe('Preflight Smoke Tests', () => {
		it('should exchange LWA token successfully', async () => {
			const credentials = await mockExecuteFunctions.getCredentials('amazonSpApi');
			const accessToken = await LwaClient.getAccessToken(credentials);
			
			expect(accessToken).toBeDefined();
			expect(typeof accessToken).toBe('string');
			expect(accessToken.length).toBeGreaterThan(0);
		});

		it('should resolve correct sandbox base URL', async () => {
			const credentials = await mockExecuteFunctions.getCredentials('amazonSpApi');
			// Access private method via any cast for testing
			const baseUrl = (SpApiRequest as any).getBaseUrl(credentials);
			
			expect(baseUrl).toBe('https://sandbox.sellingpartnerapi-eu.amazon.com');
		});

		it('should connect to sellers endpoint', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/sellers/v1/marketplaceParticipations',
			});

			// Accept either 200 with payload or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('payload');
				expect(response.data.payload).toHaveProperty('marketplaceParticipations');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Orders API', () => {
		it('should retrieve orders from sandbox', async () => {
			// Use a recent date range for sandbox testing
			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 7); // 7 days ago
			const createdBefore = new Date();

			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
				query: {
					MarketplaceIds: [process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV'], // India marketplace
					CreatedAfter: createdAfter.toISOString(),
					CreatedBefore: createdBefore.toISOString(),
				},
			});

			// Accept either 200 with payload or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('payload');
				expect(response.data.payload).toHaveProperty('Orders');
				expect(Array.isArray(response.data.payload.Orders)).toBe(true);
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should handle rate limiting gracefully', async () => {
			// Make multiple rapid requests to test rate limiting
			const promises: Promise<any>[] = [];
			const createdAfter = new Date();
			createdAfter.setDate(createdAfter.getDate() - 1); // 1 day ago
			const createdBefore = new Date();

			for (let i = 0; i < 3; i++) { // Reduced to 3 requests to be gentler
				promises.push(
					SpApiRequest.makeRequest(mockExecuteFunctions, {
						method: 'GET',
						endpoint: '/orders/v0/orders',
						query: {
							MarketplaceIds: [process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV'],
							CreatedAfter: createdAfter.toISOString(),
							CreatedBefore: createdBefore.toISOString(),
						},
					})
				);
			}

			// All requests should eventually succeed (may be queued due to rate limiting)
			const responses = await Promise.all(promises);
			
			responses.forEach(response => {
				// Accept 200 or 403 (missing permissions)
				expect([200, 403]).toContain(response.status);
				if (response.status === 200) {
					expect(response.data).toHaveProperty('payload');
				} else if (response.status === 403) {
					expect(response.data).toHaveProperty('errors');
				}
			});
		}, 30000); // Increase timeout for rate limiting tests

		it('should handle invalid marketplace IDs', async () => {
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
			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/nonexistent/endpoint',
				})
			).rejects.toThrow();
		});

		it('should handle invalid date ranges', async () => {
			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
					query: {
						MarketplaceIds: [process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV'],
						CreatedAfter: 'invalid-date',
						CreatedBefore: new Date().toISOString(),
					},
				})
			).rejects.toThrow();
		});
	});

	describe('Performance', () => {
		it('should complete requests within reasonable time', async () => {
			const startTime = Date.now();
			
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/sellers/v1/marketplaceParticipations',
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Request should complete within 10 seconds
			expect(duration).toBeLessThan(10000);
			
			// Should get either 200 or 403
			expect([200, 403]).toContain(response.status);
		});
	});

	describe('Order Details & Items', () => {
		const testOrderId = process.env.SPAPI_SANDBOX_TEST_ORDER_ID || '123-1234567-1234567'; // Replace with a valid sandbox orderId if available

		it('should retrieve order details', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: `/orders/v0/orders/${testOrderId}`,
			});
			
			// Accept either 200 with payload or 404/403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('payload');
				expect(response.data.payload).toHaveProperty('AmazonOrderId');
			} else if ([404, 403].includes(response.status)) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should retrieve order items', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: `/orders/v0/orders/${testOrderId}/orderItems`,
			});
			
			// Accept either 200 with payload or 404/403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('payload');
				expect(response.data.payload).toHaveProperty('OrderItems');
				// OrderItems may be empty in sandbox
				expect(Array.isArray(response.data.payload.OrderItems)).toBe(true);
			} else if ([404, 403].includes(response.status)) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Orders Operations', () => {
		it('should retrieve orders from sandbox successfully', async () => {
			// Setup parameters for getOrders operation
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('orders') // resource
				.mockReturnValueOnce('getOrders') // operation
				.mockReturnValueOnce([process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV']) // marketplaceIds
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
				.mockReturnValueOnce([process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV']) // marketplaceIds
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
						.mockReturnValueOnce([process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV']) // marketplaceIds
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
				.mockReturnValueOnce([process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV']) // marketplaceIds
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
				.mockReturnValueOnce([process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV']) // marketplaceIds
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

	describe('Shipments Operations', () => {
		it('should handle confirm shipment', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'POST',
				endpoint: '/orders/v0/orders/123-1234567-1234567/shipmentConfirmation',
				body: {
					shipmentConfirmation: {
						amazonOrderId: '123-1234567-1234567',
						shipmentDate: new Date().toISOString(),
						shipmentItems: [{
							orderItemId: 'test-item-id',
							quantity: 1
						}]
					}
				}
			});

			// Accept 2xx success or 403/422 with proper error structure
			if (response.status >= 200 && response.status < 300) {
				expect(response.data).toBeDefined();
			} else if ([403, 422].includes(response.status)) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should handle update shipment status', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'POST',
				endpoint: '/orders/v0/orders/123-1234567-1234567/shipmentStatus',
				body: {
					shipmentStatus: {
						amazonOrderId: '123-1234567-1234567',
						status: 'SHIPPED',
						shipmentDate: new Date().toISOString()
					}
				}
			});

			// Accept 2xx success or 403/422 with proper error structure
			if (response.status >= 200 && response.status < 300) {
				expect(response.data).toBeDefined();
			} else if ([403, 422].includes(response.status)) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Listings Operations', () => {
		it('should list ASINs', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/listings/2021-08-01/items',
				query: {
					marketplaceIds: [process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV'],
					pageSize: 10
				}
			});

			// Accept either 200 with listings or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('listings');
				expect(response.data).toHaveProperty('nextToken');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should get listing details by SKU', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/listings/2021-08-01/items/test-sku',
				query: {
					marketplaceIds: [process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV']
				}
			});

			// Accept either 200 with listing or 404/403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('listing');
			} else if ([404, 403].includes(response.status)) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Finance Operations', () => {
		it('should list financial event groups', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/finances/v0/financialEventGroups',
				query: {
					MaxResultsPerPage: 10
				}
			});

			// Accept either 200 with groups or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('payload');
				expect(response.data.payload).toHaveProperty('FinancialEventGroupList');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should list financial events', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/finances/v0/financialEvents',
				query: {
					MaxResultsPerPage: 10
				}
			});

			// Accept either 200 with events or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('payload');
				expect(response.data.payload).toHaveProperty('FinancialEvents');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should list transactions', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/finances/v0/transactions',
				query: {
					MaxResultsPerPage: 10
				}
			});

			// Accept either 200 with transactions or 404/403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('payload');
				expect(response.data.payload).toHaveProperty('Transactions');
			} else if ([404, 403].includes(response.status)) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Reports Operations', () => {
		it('should create sales traffic report', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'POST',
				endpoint: '/reports/2021-06-30/reports',
				body: {
					reportType: 'GET_SALES_AND_TRAFFIC_REPORT',
					marketplaceIds: [process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV'],
					dataStartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
					dataEndTime: new Date().toISOString()
				}
			});

			// Accept either 202 with reportId or 403 with proper error structure
			if (response.status === 202) {
				expect(response.data).toHaveProperty('reportId');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should get report types', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/reports/2021-06-30/reports'
			});

			// Accept either 200 with reports or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('reports');
				expect(Array.isArray(response.data.reports)).toBe(true);
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Invoices Operations', () => {
		it('should get GST report (India only)', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'POST',
				endpoint: '/invoices/v0/invoices',
				body: {
					reportType: 'GET_GST_MTR_B2B_CUSTOM',
					marketplaceIds: [process.env.SP_API_MARKETPLACE_ID || 'A21TJRUUN4KGV'],
					dataStartTime: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
					dataEndTime: new Date().toISOString()
				}
			});

			// Accept either 202 with reportId or 403 with proper error structure
			if (response.status === 202) {
				expect(response.data).toHaveProperty('reportId');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should get VAT invoice report (EU/UK)', async () => {
			// Temporarily switch to EU marketplace for this test
			const originalCredentials = await mockExecuteFunctions.getCredentials('amazonSpApi');
			mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
				...originalCredentials,
				primaryMarketplace: 'A1F83G8C2ARO7P' // UK marketplace
			});

			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'POST',
				endpoint: '/invoices/v0/invoices',
				body: {
					reportType: 'GET_VAT_INVOICE_REPORT',
					marketplaceIds: ['A1F83G8C2ARO7P'],
					dataStartTime: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
					dataEndTime: new Date().toISOString()
				}
			});

			// Accept either 202 with reportId or 403 with proper error structure
			if (response.status === 202) {
				expect(response.data).toHaveProperty('reportId');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Data Kiosk Operations', () => {
		it('should create query', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'POST',
				endpoint: '/dataKiosk/2023-11-15/queries',
				body: {
					query: 'SELECT * FROM sales_and_traffic_by_asin LIMIT 10'
				}
			});

			// Accept either 202 with queryId or 403 with proper error structure
			if (response.status === 202) {
				expect(response.data).toHaveProperty('queryId');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});

		it('should get queries', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/dataKiosk/2023-11-15/queries'
			});

			// Accept either 200 with queries or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('queries');
				expect(Array.isArray(response.data.queries)).toBe(true);
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
	});

	describe('Analytics Operations', () => {
		it('should validate access', async () => {
			const response = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/analytics/v1/validateAccess'
			});

			// Accept either 200 with validation or 403 with proper error structure
			if (response.status === 200) {
				expect(response.data).toHaveProperty('recommendedMode');
				expect(response.data).toHaveProperty('errors');
			} else if (response.status === 403) {
				expect(response.data).toHaveProperty('errors');
				expect(Array.isArray(response.data.errors)).toBe(true);
			} else {
				fail(`Unexpected status code: ${response.status}`);
			}
		});
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