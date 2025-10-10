import axios from 'axios';
import { RdtClient, RestrictedResource } from '../RdtClient';
import { LwaClient } from '../LwaClient';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock LwaClient
jest.mock('../LwaClient');
const mockedLwaClient = LwaClient as jest.Mocked<typeof LwaClient>;

describe('RdtClient', () => {
	const mockCredentials: ICredentialDataDecryptedObject = {
		lwaClientId: 'test-client-id',
		lwaClientSecret: 'test-client-secret',
		lwaRefreshToken: 'test-refresh-token',
		awsRegion: 'us-east-1',
		environment: 'sandbox',
	};

	const mockRestrictedResources: RestrictedResource[] = [
		{
			method: 'GET',
			path: '/orders/v0/orders/123-4567890-1234567',
			dataElements: ['buyerInfo'],
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getRestrictedAccessToken', () => {
		it('should successfully get RDT token', async () => {
			// Mock LWA token
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');

			// Mock RDT response
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					restrictedDataToken: 'rdt-token-456',
					expiresIn: 3600,
				},
			});

			const result = await RdtClient.getRestrictedAccessToken(mockCredentials, mockRestrictedResources);

			expect(result).toBe('rdt-token-456');
			expect(mockedLwaClient.getAccessToken).toHaveBeenCalledWith(mockCredentials);
			expect(mockedAxios.post).toHaveBeenCalledWith(
				'https://sandbox.sellingpartnerapi-na.amazon.com/tokens/2021-03-01/restrictedDataToken',
				{
					restrictedResources: mockRestrictedResources,
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'n8n-amazon-sp-api/1.0.0',
						'x-amz-access-token': 'lwa-token-123',
					},
					timeout: 30000,
				}
			);
		});

		it('should handle RDT API error response', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');

			mockedAxios.post.mockRejectedValueOnce({
				isAxiosError: true,
				response: {
					status: 400,
					data: {
						error: 'InvalidRequest',
						error_description: 'Invalid restricted resources',
					},
				},
			});

			await expect(
				RdtClient.getRestrictedAccessToken(mockCredentials, mockRestrictedResources)
			).rejects.toThrow('RDT authentication failed (400): Invalid restricted resources');
		});

		it('should handle network error', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');

			mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				RdtClient.getRestrictedAccessToken(mockCredentials, mockRestrictedResources)
			).rejects.toThrow('RDT request failed: Network error');
		});

		it('should use correct endpoint for different regions', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					restrictedDataToken: 'rdt-token-456',
					expiresIn: 3600,
				},
			});

			// Test EU region
			const euCredentials = { ...mockCredentials, awsRegion: 'eu-west-1' };
			await RdtClient.getRestrictedAccessToken(euCredentials, mockRestrictedResources);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				'https://sandbox.sellingpartnerapi-eu.amazon.com/tokens/2021-03-01/restrictedDataToken',
				expect.any(Object),
				expect.any(Object)
			);
		});

		it('should use custom endpoint when provided', async () => {
			mockedLwaClient.getAccessToken.mockResolvedValue('lwa-token-123');
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					restrictedDataToken: 'rdt-token-456',
					expiresIn: 3600,
				},
			});

			const customCredentials = {
				...mockCredentials,
				spApiEndpoint: 'https://custom-endpoint.amazon.com',
			};

			await RdtClient.getRestrictedAccessToken(customCredentials, mockRestrictedResources);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				'https://custom-endpoint.amazon.com/tokens/2021-03-01/restrictedDataToken',
				expect.any(Object),
				expect.any(Object)
			);
		});
	});
});
