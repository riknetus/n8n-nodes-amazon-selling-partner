import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { executeOrdersOperation } from '../operations/Orders.operations';
import { SpApiRequest } from '../helpers/SpApiRequest';
import { securityValidator } from '../core/SecurityValidator';

// Mock the dependencies
jest.mock('../helpers/SpApiRequest');
jest.mock('../core/SecurityValidator');

const mockedSpApiRequest = SpApiRequest as jest.Mocked<typeof SpApiRequest>;
const mockedSecurityValidator = securityValidator as jest.Mocked<typeof securityValidator>;

describe('Orders Operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data: any) => data.map((item: any) => ({ json: item } as INodeExecutionData))),
			},
			getCredentials: jest.fn().mockResolvedValue({
				lwaClientId: 'test_client_id',
				lwaClientSecret: 'test_client_secret',
				lwaRefreshToken: 'test_refresh_token',
				environment: 'sandbox',
				awsRegion: 'us-east-1',
			}),
			getNode: jest.fn().mockReturnValue({ id: 'test-node-id' }),
		} as any;

		// Mock validator to return valid by default in most tests
		mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({
			isValid: true,
			errors: [],
		});
		mockedSecurityValidator.validateDateRange.mockReturnValue({
			isValid: true,
			errors: [],
		});
	});

	describe('getOrders', () => {
		it('should throw error if date range is invalid', async () => {
			mockedSecurityValidator.validateDateRange.mockReturnValue({
				isValid: false,
				errors: ['Date range cannot exceed 30 days'],
			});
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce([]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('');
			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0),
			).rejects.toThrow('Date range cannot exceed 30 days');
		});

		it('should throw error if marketplace ID is invalid', async () => {
			mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({
				isValid: false,
				errors: ['Invalid marketplace ID'],
			});
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce([]);
			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0),
			).rejects.toThrow('Invalid marketplace ID');
		});

		it('should call SpApiRequest with correct parameters', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER'])
				.mockReturnValueOnce('2024-01-01T00:00:00Z')
				.mockReturnValueOnce('2024-01-10T00:00:00Z')
				.mockReturnValueOnce({ maxResultsPerPage: 50 });

			mockedSpApiRequest.makeRequest.mockResolvedValue({
				data: { payload: { Orders: [] } },
				status: 200,
				headers: {},
			});

			await executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0);

			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					endpoint: '/orders/v0/orders',
					query: expect.objectContaining({
						MarketplaceIds: ['ATVPDKIKX0DER'],
						MaxResultsPerPage: 50,
					}),
				}),
			);
		});

		it('should validate date range constraints', async () => {
			// Setup - date range > 30 days (31 days exactly)
			const mockDate30DaysAgo = new Date('2024-01-01T00:00:00Z');
			const mockDate31DaysLater = new Date('2024-02-01T00:00:00Z'); // 31 days later

			// Verify our date calculation
			const daysDiff = Math.ceil((mockDate31DaysLater.getTime() - mockDate30DaysAgo.getTime()) / (1000 * 60 * 60 * 24));
			expect(daysDiff).toBe(31); // Sanity check

			// Setup mock execution context with proper sequence of calls
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce('2024-01-01T00:00:00Z') // createdAfter
				.mockReturnValueOnce('2024-03-01T00:00:00Z') // createdBefore
				.mockReturnValueOnce({}); // additionalOptions

			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

        // Execute the operation with validation failure
        mockedSecurityValidator.validateDateRange.mockReturnValueOnce({ isValid: false, errors: ['Date range cannot exceed 30 days'] });
        await expect(
            executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0)
        ).rejects.toThrow('Date range cannot exceed 30 days');
		});

		it('should validate date order', async () => {
			// Setup - after date is later than before date
			const afterDate = new Date('2024-01-15T00:00:00Z');
			const beforeDate = new Date('2024-01-10T00:00:00Z'); // 5 days before after date

			// Verify our date logic
			expect(afterDate >= beforeDate).toBe(true); // Sanity check

			// Setup mock execution context with proper sequence of calls
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({}); // additionalOptions

			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

        // Execute the operation with validation failure
        mockedSecurityValidator.validateDateRange.mockReturnValueOnce({ isValid: false, errors: ['Created After date must be before Created Before date'] });
        await expect(
            executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0)
        ).rejects.toThrow('Created After date must be before Created Before date');
		});

		it('should handle empty results gracefully', async () => {
			// Setup
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			SpApiRequest.makeRequest = jest.fn().mockResolvedValue({
				data: {
					payload: {
						Orders: [],
					},
				},
				headers: {},
				status: 200,
			});

			const afterDate = new Date('2024-01-01T00:00:00Z');
			const beforeDate = new Date('2024-01-07T00:00:00Z');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({}); // additionalOptions

			// Execute
			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0);

			// Verify
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({
				message: 'No orders found for the specified criteria',
				searchCriteria: {
					marketplaceIds: ['ATVPDKIKX0DER'],
					createdAfter: afterDate.toISOString(),
					createdBefore: beforeDate.toISOString(),
				},
			});
		});

		it('should process orders successfully', async () => {
			// Setup
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockOrders = [
				{
					AmazonOrderId: 'TEST-ORDER-1',
					PurchaseDate: '2024-01-01T10:00:00Z',
					OrderStatus: 'Unshipped',
					FulfillmentChannel: 'MFN',
					MarketplaceId: 'ATVPDKIKX0DER',
				},
				{
					AmazonOrderId: 'TEST-ORDER-2',
					PurchaseDate: '2024-01-02T15:30:00Z',
					OrderStatus: 'Shipped',
					FulfillmentChannel: 'AFN',
					MarketplaceId: 'ATVPDKIKX0DER',
				},
			];

			SpApiRequest.makeRequest = jest.fn().mockResolvedValue({
				data: {
					payload: {
						Orders: mockOrders,
					},
				},
				headers: {},
				status: 200,
			});

			const afterDate = new Date('2024-01-01T00:00:00Z');
			const beforeDate = new Date('2024-01-07T00:00:00Z');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({}); // additionalOptions

			// Execute
			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0);

			// Verify
			expect(result).toHaveLength(2);
			expect(result[0].json).toEqual(mockOrders[0]);
			expect(result[1].json).toEqual(mockOrders[1]);
			expect(result[0].pairedItem).toEqual({ item: 0 });
			expect(result[1].pairedItem).toEqual({ item: 0 });
		});

		it('should handle pagination correctly', async () => {
			// Setup
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockOrdersPage1 = [
				{ AmazonOrderId: 'ORDER-1', OrderStatus: 'Unshipped' },
			];
			const mockOrdersPage2 = [
				{ AmazonOrderId: 'ORDER-2', OrderStatus: 'Shipped' },
			];

			SpApiRequest.makeRequest = jest.fn()
				.mockResolvedValueOnce({
					data: {
						payload: {
							Orders: mockOrdersPage1,
							NextToken: 'next-token-123',
						},
					},
					headers: {},
					status: 200,
				})
				.mockResolvedValueOnce({
					data: {
						payload: {
							Orders: mockOrdersPage2,
						},
					},
					headers: {},
					status: 200,
				});

			const afterDate = new Date('2024-01-01T00:00:00Z');
			const beforeDate = new Date('2024-01-07T00:00:00Z');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({ returnAll: true }); // additionalOptions

			// Execute
			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0);

			// Verify
			expect(result).toHaveLength(2);
			expect(result[0].json.AmazonOrderId).toBe('ORDER-1');
			expect(result[1].json.AmazonOrderId).toBe('ORDER-2');
			expect(SpApiRequest.makeRequest).toHaveBeenCalledTimes(2);
		});

		it('should validate maxResultsPerPage range', async () => {
			const afterDate = new Date('2024-01-01T00:00:00Z');
			const beforeDate = new Date('2024-01-07T00:00:00Z');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({ maxResultsPerPage: 150 }); // additionalOptions - invalid

			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

        await expect(
            executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0)
        ).rejects.toThrow('MaxResultsPerPage must be between 1 and 100');
		});

		it('should validate maxResultsPerPage minimum value', async () => {
			const afterDate = new Date('2024-01-01T00:00:00Z');
			const beforeDate = new Date('2024-01-07T00:00:00Z');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({ maxResultsPerPage: 0 }); // additionalOptions - invalid

			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

			// Mock SpApiRequest to avoid actual API call
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			SpApiRequest.makeRequest = jest.fn().mockResolvedValue({
				data: {
					payload: {
						Orders: [],
					},
				},
				headers: {},
				status: 200,
			});

			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0)
			).rejects.toThrow('MaxResultsPerPage must be between 1 and 100');
		});

		it('should return only first page when returnAll is false', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockOrdersPage1 = [
				{ AmazonOrderId: 'ORDER-1', OrderStatus: 'Unshipped' },
			];

			SpApiRequest.makeRequest = jest.fn().mockResolvedValueOnce({
				data: {
					payload: {
						Orders: mockOrdersPage1,
						NextToken: 'next-token-123',
					},
				},
				headers: {},
				status: 200,
			});

			const afterDate = new Date('2024-01-01T00:00:00Z');
			const beforeDate = new Date('2024-01-07T00:00:00Z');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({ returnAll: false }); // additionalOptions

			// Execute
			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0);

			// Verify - should only have first page and only one API call
			expect(result).toHaveLength(1);
			expect(result[0].json.AmazonOrderId).toBe('ORDER-1');
			expect(SpApiRequest.makeRequest).toHaveBeenCalledTimes(1);
		});

		it('should handle API error responses properly', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockError = new Error('API Error: Throttled');
			SpApiRequest.makeRequest = jest.fn().mockRejectedValue(mockError);

			const afterDate = new Date('2024-01-01T00:00:00Z');
			const beforeDate = new Date('2024-01-07T00:00:00Z');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(['ATVPDKIKX0DER']) // marketplaceIds
				.mockReturnValueOnce(afterDate.toISOString()) // createdAfter
				.mockReturnValueOnce(beforeDate.toISOString()) // createdBefore
				.mockReturnValueOnce({}); // additionalOptions

			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrders', 0)
			).rejects.toThrow('Failed to retrieve orders: API Error: Throttled');
		});
	});

	describe('getOrder', () => {
		it('should throw on invalid orderId format', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('invalid-id');

			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrder', 0),
			).rejects.toThrow('Invalid Order ID format');
		});

		it('should call SpApiRequest with correct orderId', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('111-2222222-3333333');

			mockedSpApiRequest.makeRequest.mockResolvedValue({
				data: { payload: { AmazonOrderId: '111-2222222-3333333' } },
				status: 200,
				headers: {},
			});

			await executeOrdersOperation.call(mockExecuteFunctions, 'getOrder', 0);

			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					endpoint: '/orders/v0/orders/111-2222222-3333333',
				}),
			);
		});

		it('should fetch order details successfully', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockOrder = {
				AmazonOrderId: '123-1234567-1234567',
				OrderStatus: 'Shipped',
				PurchaseDate: '2024-01-01T10:00:00Z',
			};
			SpApiRequest.makeRequest = jest.fn().mockResolvedValue({
				data: { payload: mockOrder },
				headers: {},
				status: 200,
			});

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('123-1234567-1234567');

			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrder', 0);
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual(mockOrder);
			expect(result[0].pairedItem).toEqual({ item: 0 });
		});

		it('should handle getOrder API errors', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockError = new Error('Order access denied');
			SpApiRequest.makeRequest = jest.fn().mockRejectedValue(mockError);

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('123-1234567-1234567');
			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrder', 0)
			).rejects.toThrow('Failed to retrieve order details: Order access denied');
		});
	});

	describe('getOrderItems', () => {
		it('should throw on invalid orderId format', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('invalid-id');

			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0),
			).rejects.toThrow('Invalid Order ID format');
		});

		it('should call SpApiRequest with correct orderId', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('111-2222222-3333333');

			mockedSpApiRequest.makeRequest.mockResolvedValue({
				data: { payload: { OrderItems: [] } },
				status: 200,
				headers: {},
			});

			await executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0);

			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					endpoint: '/orders/v0/orders/111-2222222-3333333/orderItems',
				}),
			);
		});

		it('should fetch order items successfully (single page)', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockItems = [
				{ ASIN: 'B001', OrderItemId: 'ITEM-1', Title: 'Item 1', QuantityOrdered: 1, QuantityShipped: 1, SellerSKU: 'SKU1' },
				{ ASIN: 'B002', OrderItemId: 'ITEM-2', Title: 'Item 2', QuantityOrdered: 2, QuantityShipped: 2, SellerSKU: 'SKU2' },
			];
			SpApiRequest.makeRequest = jest.fn().mockResolvedValue({
				data: { payload: { AmazonOrderId: '123-1234567-1234567', OrderItems: mockItems } },
				headers: {},
				status: 200,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('123-1234567-1234567') // orderId
				.mockReturnValueOnce(true); // returnAll

			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0);
			expect(result).toHaveLength(2);
			expect(result[0].json).toEqual(mockItems[0]);
			expect(result[1].json).toEqual(mockItems[1]);
		});

		it('should fetch order items with pagination', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const page1 = { payload: { AmazonOrderId: '123-1234567-1234567', OrderItems: [{ ASIN: 'B001', OrderItemId: 'ITEM-1', Title: 'Item 1', QuantityOrdered: 1, QuantityShipped: 1, SellerSKU: 'SKU1' }], NextToken: 'NEXT' } };
			const page2 = { payload: { AmazonOrderId: '123-1234567-1234567', OrderItems: [{ ASIN: 'B002', OrderItemId: 'ITEM-2', Title: 'Item 2', QuantityOrdered: 2, QuantityShipped: 2, SellerSKU: 'SKU2' }] } };
			SpApiRequest.makeRequest = jest.fn()
				.mockResolvedValueOnce({ data: page1, headers: {}, status: 200 })
				.mockResolvedValueOnce({ data: page2, headers: {}, status: 200 });

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('123-1234567-1234567') // orderId
				.mockReturnValueOnce(true); // returnAll

			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0);
			expect(result).toHaveLength(2);
			expect(result[0].json.OrderItemId).toBe('ITEM-1');
			expect(result[1].json.OrderItemId).toBe('ITEM-2');
			// Should call makeRequest twice (pagination)
			expect(SpApiRequest.makeRequest).toHaveBeenCalledTimes(2);
		});

		it('should handle no order items found', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			SpApiRequest.makeRequest = jest.fn().mockResolvedValue({
				data: { payload: { AmazonOrderId: '123-1234567-1234567', OrderItems: [] } },
				headers: {},
				status: 200,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('123-1234567-1234567') // orderId
				.mockReturnValueOnce(true); // returnAll

			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0);
			expect(result).toHaveLength(1);
			expect(result[0].json.message).toContain('No order items found');
			expect(result[0].json.orderId).toBe('123-1234567-1234567');
		});

		it('should return only first page when returnAll is false for order items', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockItems = [
				{ ASIN: 'B001', OrderItemId: 'ITEM-1', Title: 'Item 1', QuantityOrdered: 1, QuantityShipped: 1, SellerSKU: 'SKU1' },
			];

			SpApiRequest.makeRequest = jest.fn().mockResolvedValueOnce({
				data: { 
					payload: { 
						AmazonOrderId: '123-1234567-1234567', 
						OrderItems: mockItems,
						NextToken: 'next-token-123'
					} 
				},
				headers: {},
				status: 200,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('123-1234567-1234567') // orderId
				.mockReturnValueOnce(false); // returnAll

			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0);
			expect(result).toHaveLength(1);
			expect(result[0].json.OrderItemId).toBe('ITEM-1');
			expect(SpApiRequest.makeRequest).toHaveBeenCalledTimes(1);
		});

		it('should handle order items API errors', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			const mockError = new Error('Order not found');
			SpApiRequest.makeRequest = jest.fn().mockRejectedValue(mockError);

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('123-1234567-1234567') // orderId
				.mockReturnValueOnce(true); // returnAll

			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

			await expect(
				executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0)
			).rejects.toThrow('Failed to retrieve order items: Order not found');
		});

		it('should respect maxPages safety guard', async () => {
			const SpApiRequest = require('../helpers/SpApiRequest').SpApiRequest;
			
			// Mock 31 pages of responses (exceeding maxPages = 30)
			const mockResponses = Array.from({ length: 31 }, (_, i) => ({
				data: { 
					payload: { 
						AmazonOrderId: '123-1234567-1234567', 
						OrderItems: [{ OrderItemId: `ITEM-${i}` }],
						NextToken: i < 30 ? `token-${i + 1}` : undefined
					} 
				},
				headers: {},
				status: 200,
			}));

			SpApiRequest.makeRequest = jest.fn();
			mockResponses.forEach((response) => {
				SpApiRequest.makeRequest.mockResolvedValueOnce(response);
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('123-1234567-1234567') // orderId
				.mockReturnValueOnce(true); // returnAll

			const result = await executeOrdersOperation.call(mockExecuteFunctions, 'getOrderItems', 0);
			
			// Should stop at maxPages (30) even though there's a NextToken
			expect(SpApiRequest.makeRequest).toHaveBeenCalledTimes(30);
			expect(result).toHaveLength(30);
		});
	});
});

// Integration test example (would run in Docker)
describe('Orders Integration Tests', () => {
	// These tests would use real SP-API sandbox environment
	// and would be run in Docker container as per project convention
	
	it.skip('should connect to SP-API sandbox successfully', async () => {
		// This test would require real sandbox credentials
		// and would verify end-to-end connectivity
	});

	it.skip('should handle rate limiting gracefully', async () => {
		// This test would make rapid requests to test rate limiting
	});

	it.skip('should recover from network failures', async () => {
		// This test would simulate network issues
	});
}); 