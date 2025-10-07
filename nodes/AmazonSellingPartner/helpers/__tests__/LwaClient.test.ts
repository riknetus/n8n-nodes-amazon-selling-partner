import axios from 'axios';
import { LwaClient } from '../LwaClient';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.isAxiosError as well
const mockIsAxiosError = jest.fn();
(axios as any).isAxiosError = mockIsAxiosError;

describe('LwaClient', () => {
	const mockCredentials: ICredentialDataDecryptedObject = {
		lwaClientId: 'test-client-id',
		lwaClientSecret: 'test-client-secret',
		lwaRefreshToken: 'test-refresh-token',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockIsAxiosError.mockClear();
		// Clear the static cache between tests
		LwaClient.clearCache();
	});

	describe('getAccessToken', () => {
		it('should return cached token when valid', async () => {
			// Setup - mock successful token fetch
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'cached-token',
					token_type: 'bearer',
					expires_in: 3600,
				},
			});

			// First call should fetch token
			const token1 = await LwaClient.getAccessToken(mockCredentials);
			expect(token1).toBe('cached-token');
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);

			// Second call should return cached token
			const token2 = await LwaClient.getAccessToken(mockCredentials);
			expect(token2).toBe('cached-token');
			expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No additional call
		});

		it('should refresh token when expired', async () => {
			// Setup - mock first token that expires quickly
			mockedAxios.post
				.mockResolvedValueOnce({
					data: {
						access_token: 'expired-token',
						token_type: 'bearer',
						expires_in: 1, // 1 second
					},
				})
				.mockResolvedValueOnce({
					data: {
						access_token: 'new-token',
						token_type: 'bearer',
						expires_in: 3600,
					},
				});

			// First call
			const token1 = await LwaClient.getAccessToken(mockCredentials);
			expect(token1).toBe('expired-token');

			// Wait for token to expire (plus buffer time)
			await new Promise(resolve => setTimeout(resolve, 1100));

			// Second call should fetch new token
			const token2 = await LwaClient.getAccessToken(mockCredentials);
			expect(token2).toBe('new-token');
			expect(mockedAxios.post).toHaveBeenCalledTimes(2);
		});

		it('should make correct API request', async () => {
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'test-token',
					token_type: 'bearer',
					expires_in: 3600,
				},
			});

			await LwaClient.getAccessToken(mockCredentials);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				'https://api.amazon.com/auth/o2/token',
				{
					grant_type: 'refresh_token',
					refresh_token: 'test-refresh-token',
					client_id: 'test-client-id',
					client_secret: 'test-client-secret',
				},
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'User-Agent': 'n8n-amazon-sp-api/1.0.0',
					},
					timeout: 30000,
				}
			);
		});

		it('should handle 400 error response', async () => {
			const axiosError = new Error('Request failed') as any;
			axiosError.isAxiosError = true;
			axiosError.response = {
				status: 400,
				data: {
					error: 'invalid_grant',
					error_description: 'The provided authorization grant is invalid',
				},
			};

			mockIsAxiosError.mockReturnValueOnce(true);
			mockedAxios.post.mockRejectedValueOnce(axiosError);

			await expect(LwaClient.getAccessToken(mockCredentials))
				.rejects
				.toThrow('LWA authentication failed (400): The provided authorization grant is invalid');
		});

		it('should handle 401 error response', async () => {
			const axiosError = new Error('Request failed') as any;
			axiosError.isAxiosError = true;
			axiosError.response = {
				status: 401,
				data: {
					error: 'invalid_client',
				},
			};

			mockIsAxiosError.mockReturnValueOnce(true);
			mockedAxios.post.mockRejectedValueOnce(axiosError);

			await expect(LwaClient.getAccessToken(mockCredentials))
				.rejects
				.toThrow('LWA authentication failed (401): invalid_client');
		});

		it('should handle network errors', async () => {
			mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

			await expect(LwaClient.getAccessToken(mockCredentials))
				.rejects
				.toThrow('LWA request failed: Network Error');
		});

		it('should handle timeout errors', async () => {
			const axiosError = new Error('timeout of 30000ms exceeded') as any;
			axiosError.code = 'ECONNABORTED';
			axiosError.isAxiosError = true;

			mockedAxios.post.mockRejectedValueOnce(axiosError);

			await expect(LwaClient.getAccessToken(mockCredentials))
				.rejects
				.toThrow('LWA request failed: timeout of 30000ms exceeded');
		});
	});

	describe('clearCache', () => {
		it('should clear specific credential cache', async () => {
			// Setup - cache a token
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'cached-token',
					token_type: 'bearer',
					expires_in: 3600,
				},
			});

			await LwaClient.getAccessToken(mockCredentials);
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);

			// Clear cache for specific credentials
			LwaClient.clearCache(mockCredentials);

			// Next call should fetch new token
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'new-token',
					token_type: 'bearer',
					expires_in: 3600,
				},
			});

			await LwaClient.getAccessToken(mockCredentials);
			expect(mockedAxios.post).toHaveBeenCalledTimes(2);
		});

		it('should clear all cache when no credentials provided', async () => {
			// Setup - cache tokens for different credentials
			const creds1 = { ...mockCredentials, lwaClientId: 'client-1' };
			const creds2 = { ...mockCredentials, lwaClientId: 'client-2' };

			mockedAxios.post
				.mockResolvedValueOnce({
					data: { access_token: 'token-1', token_type: 'bearer', expires_in: 3600 },
				})
				.mockResolvedValueOnce({
					data: { access_token: 'token-2', token_type: 'bearer', expires_in: 3600 },
				});

			await LwaClient.getAccessToken(creds1);
			await LwaClient.getAccessToken(creds2);
			expect(mockedAxios.post).toHaveBeenCalledTimes(2);

			// Clear all cache
			LwaClient.clearCache();

			// Next calls should fetch new tokens
			mockedAxios.post
				.mockResolvedValueOnce({
					data: { access_token: 'new-token-1', token_type: 'bearer', expires_in: 3600 },
				})
				.mockResolvedValueOnce({
					data: { access_token: 'new-token-2', token_type: 'bearer', expires_in: 3600 },
				});

			await LwaClient.getAccessToken(creds1);
			await LwaClient.getAccessToken(creds2);
			expect(mockedAxios.post).toHaveBeenCalledTimes(4);
		});
	});
}); 