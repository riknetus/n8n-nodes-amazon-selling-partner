import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { executeListingsOperation } from '../operations/Listings.operations';
import { SpApiRequest } from '../helpers/SpApiRequest';
import { securityValidator } from '../core/SecurityValidator';
import { metricsCollector } from '../core/MetricsCollector';
import { auditLogger } from '../core/AuditLogger';

// Mock all dependencies
jest.mock('../helpers/SpApiRequest');
jest.mock('../core/SecurityValidator');
jest.mock('../core/MetricsCollector');
jest.mock('../core/AuditLogger');

const mockedSpApiRequest = SpApiRequest as jest.Mocked<typeof SpApiRequest>;
const mockedSecurityValidator = securityValidator as jest.Mocked<typeof securityValidator>;
const mockedMetricsCollector = metricsCollector as jest.Mocked<typeof metricsCollector>;
const mockedAuditLogger = auditLogger as jest.Mocked<typeof auditLogger>;

describe('Listings Operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const mockNode = {
		id: 'test-node-id',
		name: 'Test Node',
		type: 'amazonSellingPartner',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			getNode: jest.fn().mockReturnValue(mockNode),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			},
		} as any;

		// Mock static method
		mockedSpApiRequest.makeRequest = jest.fn();

		mockedSecurityValidator.validateMarketplaceIds = jest.fn();
		mockedSecurityValidator.validateInput = jest.fn();

		mockedAuditLogger.logEvent = jest.fn();

		mockedMetricsCollector.recordMetric = jest.fn();
	});

	describe('listAsins operation', () => {
		const mockCredentials = {
			sellerId: 'TEST_SELLER_ID',
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			refreshToken: 'test-refresh-token',
			awsRegion: 'us-east-1',
			environment: 'sandbox',
		};

		const mockListingResponse = {
			data: {
				listings: [
					{
						asin: 'B08N5WRWNW',
						sku: 'TEST-SKU-001',
						summaries: [
							{
								marketplaceId: 'ATVPDKIKX0DER',
								asin: 'B08N5WRWNW',
								sku: 'TEST-SKU-001',
								itemName: 'Test Product Title',
								conditionType: 'new_new',
								status: ['BUYABLE'],
								fulfillmentChannels: ['AMAZON_NA'],
								createdDate: '2023-01-01T00:00:00Z',
								lastUpdatedDate: '2023-06-01T00:00:00Z',
								mainImage: {
									link: 'https://images-na.ssl-images-amazon.com/images/I/test.jpg',
									height: 500,
									width: 500,
								},
							},
						],
						attributes: [
							{
								marketplaceId: 'ATVPDKIKX0DER',
								attributes: [
									{
										attributeName: 'brand',
										attributeValue: 'Test Brand',
									},
									{
										attributeName: 'item_type_name',
										attributeValue: 'Test Category',
									},
								],
							},
						],
						offers: [
							{
								marketplaceId: 'ATVPDKIKX0DER',
								offers: [
									{
										buyingPrice: {
											listingPrice: {
												amount: 29.99,
												currencyCode: 'USD',
											},
											shippingPrice: {
												amount: 3.99,
												currencyCode: 'USD',
											},
										},
										regularPrice: {
											amount: 29.99,
											currencyCode: 'USD',
										},
									},
								],
							},
						],
						issues: [
							{
								marketplaceId: 'ATVPDKIKX0DER',
								issues: [
									{
										code: 'MISSING_BULLET_POINT',
										message: 'Bullet points are missing',
										severity: 'WARNING',
										attributeNames: ['bullet_point'],
									},
								],
							},
						],
						fulfillmentAvailability: [
							{
								marketplaceId: 'ATVPDKIKX0DER',
								fulfillmentAvailability: [
									{
										fulfillmentChannelCode: 'AMAZON_NA',
										quantity: 100,
									},
								],
							},
						],
					},
				],
				nextToken: undefined,
			},
			headers: {},
			status: 200,
		};

		beforeEach(() => {
			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string, _itemIndex: number, defaultValue?: any) => {
				switch (paramName) {
					case 'marketplaceIds':
						return ['ATVPDKIKX0DER'];
					case 'additionalOptions':
						return {
							includedData: ['summaries', 'attributes', 'offers'],
							pageSize: 20,
							returnAll: true,
							maxResultsLimit: 1000,
							skuFilter: '',
							statusFilter: [],
							issueLocale: 'en_US',
						};
					default:
						return defaultValue;
				}
			});
		});

		it('should successfully list ASINs with basic configuration', async () => {
			mockedSpApiRequest.makeRequest.mockResolvedValue(mockListingResponse);
			mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({ isValid: true, errors: [] });

			const result = await executeListingsOperation.call(
				mockExecuteFunctions,
				'listAsins',
				0
			);

			expect(result).toHaveLength(1);
			expect(result[0].json).toMatchObject({
				asin: 'B08N5WRWNW',
				sku: 'TEST-SKU-001',
				marketplaceId: 'ATVPDKIKX0DER',
				itemName: 'Test Product Title',
				status: ['BUYABLE'],
				conditionType: 'new_new',
			});

			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.objectContaining({
					method: 'GET',
					endpoint: '/listings/2021-08-01/items/TEST_SELLER_ID',
					query: expect.objectContaining({
						marketplaceIds: 'ATVPDKIKX0DER',
						includedData: 'summaries,attributes,offers',
						pageSize: '20',
					}),
				})
			);

			expect(mockedSecurityValidator.validateMarketplaceIds).toHaveBeenCalledWith(['ATVPDKIKX0DER'], 'test-node-id');
			expect(mockedMetricsCollector.recordMetric).toHaveBeenCalledWith('operation_duration', expect.any(Number), { operation: 'listAsins' });
		});

		it('should handle pagination correctly', async () => {
			const mockFirstResponse = {
				data: {
					listings: [mockListingResponse.data.listings[0]],
					nextToken: 'next-page-token',
				},
				headers: {},
				status: 200,
			};
			const mockSecondResponse = {
				data: {
					listings: [mockListingResponse.data.listings[0]],
					nextToken: undefined,
				},
				headers: {},
				status: 200,
			};

			mockedSpApiRequest.makeRequest
				.mockResolvedValueOnce(mockFirstResponse)
				.mockResolvedValueOnce(mockSecondResponse);
			mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({ isValid: true, errors: [] });

			const result = await executeListingsOperation.call(
				mockExecuteFunctions,
				'listAsins',
				0
			);

			expect(result).toHaveLength(2);
			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledTimes(2);

			expect(mockedSpApiRequest.makeRequest).toHaveBeenNthCalledWith(
				1,
				mockExecuteFunctions,
				expect.objectContaining({
					method: 'GET',
					endpoint: '/listings/2021-08-01/items/TEST_SELLER_ID',
				})
			);

			expect(mockedSpApiRequest.makeRequest).toHaveBeenNthCalledWith(
				2,
				mockExecuteFunctions,
				expect.objectContaining({
					method: 'GET',
					endpoint: '/listings/2021-08-01/items/TEST_SELLER_ID',
					query: expect.objectContaining({
						pageToken: 'next-page-token',
					}),
				})
			);
		});

		it('should handle API errors correctly', async () => {
			const apiError = new NodeOperationError(mockNode, 'Test API error');
			mockedSpApiRequest.makeRequest.mockRejectedValue(apiError);
			mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({ isValid: true, errors: [] });

			await expect(
				executeListingsOperation.call(mockExecuteFunctions, 'listAsins', 0)
			).rejects.toThrow(NodeOperationError);
		});
	});

	describe('getListingDetails operation', () => {
		const mockCredentials = {
			sellerId: 'TEST_SELLER_ID',
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			refreshToken: 'test-refresh-token',
			awsRegion: 'us-east-1',
			environment: 'sandbox',
		};

		const mockDetailResponse = {
			data: {
				sku: 'TEST-SKU-001',
				summaries: [
					{
						marketplaceId: 'ATVPDKIKX0DER',
						asin: 'B08N5WRWNW',
						sku: 'TEST-SKU-001',
						itemName: 'Test Product Title',
						conditionType: 'new_new',
						status: ['BUYABLE'],
						fulfillmentChannels: ['AMAZON_NA'],
						createdDate: '2023-01-01T00:00:00Z',
						lastUpdatedDate: '2023-06-01T00:00:00Z',
					},
				],
			},
			headers: {},
			status: 200,
		};

		beforeEach(() => {
			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
		});

		it('should get listing details by SKU', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string, _itemIndex: number, defaultValue?: any) => {
				switch (paramName) {
					case 'identifierType':
						return 'sku';
					case 'sku':
						return 'TEST-SKU-001';
					case 'marketplaceIds':
						return ['ATVPDKIKX0DER'];
					case 'detailOptions':
						return {
							includedData: ['summaries', 'attributes', 'offers', 'issues'],
							issueLocale: 'en_US',
						};
					default:
						return defaultValue;
				}
			});

			mockedSpApiRequest.makeRequest.mockResolvedValue(mockDetailResponse);
			mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({ isValid: true, errors: [] });

			const result = await executeListingsOperation.call(
				mockExecuteFunctions,
				'getListingDetails',
				0
			);

			expect(result).toHaveLength(1);
			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.objectContaining({
					method: 'GET',
					endpoint: '/listings/2021-08-01/items/TEST_SELLER_ID/TEST-SKU-001',
				})
			);
		});

		it('should get listing details by ASIN', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string, _itemIndex: number, defaultValue?: any) => {
				switch (paramName) {
					case 'identifierType':
						return 'asin';
					case 'asin':
						return 'B08N5WRWNW';
					case 'marketplaceIds':
						return ['ATVPDKIKX0DER'];
					case 'detailOptions':
						return {
							includedData: ['summaries', 'attributes', 'offers', 'issues'],
							issueLocale: 'en_US',
						};
					default:
						return defaultValue;
				}
			});

			const asinSearchResponse = {
				data: {
					listings: [
						{
							asin: 'B08N5WRWNW',
							sku: 'TEST-SKU-001',
							summaries: mockDetailResponse.data.summaries,
						},
					],
				},
				headers: {},
				status: 200,
			};

			mockedSpApiRequest.makeRequest.mockResolvedValue(asinSearchResponse);
			mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({ isValid: true, errors: [] });

			const result = await executeListingsOperation.call(
				mockExecuteFunctions,
				'getListingDetails',
				0
			);

			expect(result).toHaveLength(1);
			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.objectContaining({
					method: 'GET',
					endpoint: '/listings/2021-08-01/items/TEST_SELLER_ID',
					query: expect.objectContaining({
						asin: 'B08N5WRWNW',
					}),
				})
			);
		});
	});

	describe('error handling', () => {
		it('should throw error for unknown operation', async () => {
			await expect(
				executeListingsOperation.call(mockExecuteFunctions, 'unknownOperation', 0)
			).rejects.toThrow('Unknown operation: unknownOperation');
		});
	});
}); 