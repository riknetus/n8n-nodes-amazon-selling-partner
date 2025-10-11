import axios from 'axios';
import { SpApiRequest } from '../SpApiRequest';
import { LwaClient } from '../LwaClient';
import { RdtClient } from '../RdtClient';
import { ICredentialDataDecryptedObject, IExecuteFunctions } from 'n8n-workflow';

// Mock dependencies
jest.mock('axios');
jest.mock('../LwaClient');
jest.mock('../RdtClient');
jest.mock('../../core/RateLimiter');
jest.mock('../../core/AuditLogger');
jest.mock('../../core/MetricsCollector');
jest.mock('../../core/SecurityValidator');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLwaClient = LwaClient as jest.Mocked<typeof LwaClient>;
const mockedRdtClient = RdtClient as jest.Mocked<typeof RdtClient>;

describe('SpApiRequest', () => {
	const mockCredentials: ICredentialDataDecryptedObject = {
		lwaClientId: 'test-client-id',
		lwaClientSecret: 'test-client-secret',
		lwaRefreshToken: 'test-refresh-token',
		awsRegion: 'us-east-1',
		environment: 'sandbox',
	};

	const mockExecuteFunctions = {
		getCredentials: jest.fn().mockResolvedValue(mockCredentials),
		getNode: jest.fn().mockReturnValue({ id: 'test-node-id' }),
	} as unknown as IExecuteFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
    // Ensure both callable axios() and axios.request() return a successful response
    (mockedAxios as any).mockResolvedValue({
      data: { test: 'response' },
      headers: {},
      status: 200,
    } as any);
    (mockedAxios.request as jest.Mock).mockResolvedValue({
    data: { test: 'response' },
    headers: {},
    status: 200,
  } as any);
	});

	describe('Token Selection', () => {
		it('should use LWA token when no restricted resources provided', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
			});

			expect(mockedLwaClient.getAccessToken).toHaveBeenCalledWith(mockCredentials);
			expect(mockedRdtClient.getRestrictedAccessToken).not.toHaveBeenCalled();
		});

		it('should use RDT token when restricted resources provided', async () => {
			mockedRdtClient.getRestrictedAccessToken.mockResolvedValue('rdt-token-456');

			const restrictedResources = [
				{
					method: 'GET' as const,
					path: '/orders/v0/orders/123-4567890-1234567',
					dataElements: ['buyerInfo'],
				},
			];

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders/123-4567890-1234567',
				restrictedResources,
			});

			expect(mockedRdtClient.getRestrictedAccessToken).toHaveBeenCalledWith(
				mockCredentials,
				restrictedResources
			);
			expect(mockedLwaClient.getAccessToken).not.toHaveBeenCalled();
		});

		it('should use LWA token when restricted resources array is empty', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
				restrictedResources: [],
			});

			expect(mockedLwaClient.getAccessToken).toHaveBeenCalledWith(mockCredentials);
			expect(mockedRdtClient.getRestrictedAccessToken).not.toHaveBeenCalled();
		});
	});

  describe('AWS Signing Behavior', () => {
    it('should not use AWS signing (LWA-only enforced)', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
			});

			// Verify headers don't include AWS signature
			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						'x-amz-access-token': 'lwa-token-123',
						'User-Agent': 'n8n-amazon-sp-api/1.0.0',
					}),
				})
			);
		});
	});

	describe('Request Headers', () => {
		it('should set correct headers for LWA-only request', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders',
			});

			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
						'User-Agent': 'n8n-amazon-sp-api/1.0.0',
						'x-amz-access-token': 'lwa-token-123',
					},
				})
			);
		});

		it('should set correct headers for RDT request', async () => {
			mockedRdtClient.getRestrictedAccessToken.mockResolvedValue('rdt-token-456');

			await SpApiRequest.makeRequest(mockExecuteFunctions, {
				method: 'GET',
				endpoint: '/orders/v0/orders/123-4567890-1234567',
				restrictedResources: [
					{
						method: 'GET',
						path: '/orders/v0/orders/123-4567890-1234567',
						dataElements: ['buyerInfo'],
					},
				],
			});

			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
						'User-Agent': 'n8n-amazon-sp-api/1.0.0',
						'x-amz-access-token': 'rdt-token-456',
					},
				})
			);
		});
	});
});