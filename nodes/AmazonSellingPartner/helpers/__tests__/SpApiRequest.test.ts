import { IExecuteFunctions } from 'n8n-workflow';
import { SpApiRequest } from '../SpApiRequest';
import { ErrorHandler } from '../../core/ErrorHandler';

// Mock all dependencies
jest.mock('axios');
jest.mock('../LwaClient');
jest.mock('../SigV4Signer');
jest.mock('../../core/RateLimiter');
jest.mock('../../core/ErrorHandler');
jest.mock('../../core/MetricsCollector');
jest.mock('../../core/AuditLogger');
jest.mock('../../core/SecurityValidator');

const mockAxios = require('axios');
const mockLwaClient = require('../LwaClient').LwaClient;
const mockSigV4Signer = require('../SigV4Signer').SigV4Signer;
const mockErrorHandler = require('../../core/ErrorHandler').ErrorHandler;

describe('SpApiRequest', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		
		mockExecuteFunctions = {
			getCredentials: jest.fn(),
			getNode: jest.fn().mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'amazonSellingPartner',
			}),
		} as any;

		// Setup default mocks
		mockLwaClient.getAccessToken = jest.fn().mockResolvedValue('mock-access-token');
		
		// Mock RateLimiter instance methods
		const mockRateLimiterInstance = {
			waitForToken: jest.fn().mockResolvedValue(undefined),
			updateFromHeaders: jest.fn(),
		};
		(SpApiRequest as any).rateLimiter = mockRateLimiterInstance;
	});

	describe('credential validation', () => {
		it('should validate LWA credentials are present', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				// Missing LWA credentials
				environment: 'sandbox',
				awsRegion: 'us-east-1',
			});

			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
				})
			).rejects.toThrow('Invalid credentials');
		});

		it('should accept valid LWA-only credentials', async () => {
			const validCredentials = {
				lwaClientId: 'amzn1.application-oa2-client.test123',
				lwaClientSecret: 'secret123',
				lwaRefreshToken: 'refresh123',
				environment: 'sandbox',
				awsRegion: 'us-east-1',
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(validCredentials);
			mockAxios.mockResolvedValue({
				data: { payload: { Orders: [] } },
				headers: {},
				status: 200,
			});

			const result = await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
			});

			expect(result.status).toBe(200);
			expect(mockLwaClient.getAccessToken).toHaveBeenCalledWith(validCredentials);
		});

		it('should use AWS signing when enabled in advanced options', async () => {
			const credentialsWithAwsSigning = {
				lwaClientId: 'amzn1.application-oa2-client.test123',
				lwaClientSecret: 'secret123',
				lwaRefreshToken: 'refresh123',
				environment: 'sandbox',
				awsRegion: 'us-east-1',
				advancedOptions: {
					useAwsSigning: true,
					awsAccessKeyId: 'AKIATEST',
					awsSecretAccessKey: 'secretkey123',
				},
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(credentialsWithAwsSigning);
			mockSigV4Signer.signRequest = jest.fn().mockResolvedValue({
				'Authorization': 'AWS4-HMAC-SHA256 ...',
				'X-Amz-Date': '20240101T000000Z',
			});
			mockAxios.mockResolvedValue({
				data: { payload: { Orders: [] } },
				headers: {},
				status: 200,
			});

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
			});

			expect(mockSigV4Signer.signRequest).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle HTTP 4xx errors through ErrorHandler', async () => {
			const validCredentials = {
				lwaClientId: 'amzn1.application-oa2-client.test123',
				lwaClientSecret: 'secret123',
				lwaRefreshToken: 'refresh123',
				environment: 'sandbox',
				awsRegion: 'us-east-1',
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(validCredentials);
			mockAxios.mockResolvedValue({
				data: { errors: [{ code: 'InvalidInput', message: 'Invalid marketplace ID' }] },
				headers: {},
				status: 400,
			});

			const mockApiError = new Error('Invalid marketplace ID');
			mockErrorHandler.handleApiError = jest.fn().mockRejectedValue(mockApiError);

			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
				})
			).rejects.toThrow('Invalid marketplace ID');

			expect(mockErrorHandler.handleApiError).toHaveBeenCalled();
		});

		it('should handle network errors through ErrorHandler', async () => {
			const networkError = {
				isAxiosError: true,
				message: 'Network timeout',
				config: {},
				response: undefined,
				request: undefined,
				name: 'AxiosError',
				toJSON: () => ({}),
			};
			mockAxios.mockRejectedValue(networkError);

			const mockErrorHandler = ErrorHandler as jest.Mocked<typeof ErrorHandler>;
			mockErrorHandler.handleNetworkError.mockRejectedValue(new Error('Network timeout'));

			await expect(
				SpApiRequest.makeRequest(mockExecuteFunctions, {
					method: 'GET',
					endpoint: '/orders/v0/orders',
				})
			).rejects.toThrow('Network timeout');

			expect(mockErrorHandler.handleNetworkError).toHaveBeenCalledWith(networkError);
		});
	});

	describe('query parameter handling', () => {
		it('should build query parameters correctly', async () => {
			const validCredentials = {
				lwaClientId: 'amzn1.application-oa2-client.test123',
				lwaClientSecret: 'secret123',
				lwaRefreshToken: 'refresh123',
				environment: 'sandbox',
				awsRegion: 'us-east-1',
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(validCredentials);
			mockAxios.mockResolvedValue({
				data: { payload: { Orders: [] } },
				headers: {},
				status: 200,
			});

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
				query: {
					MarketplaceIds: ['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2'],
					CreatedAfter: '2024-01-01T00:00:00Z',
					OrderStatuses: ['Unshipped', 'Shipped'],
				},
			});

			expect(mockAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining('MarketplaceIds=ATVPDKIKX0DER'),
				})
			);
		});
	});
}); 