import * as aws4 from 'aws4';
import { SigV4Signer } from '../SigV4Signer';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';

// Mock aws4
jest.mock('aws4');
const mockedAws4 = aws4 as jest.Mocked<typeof aws4>;

describe('SigV4Signer', () => {
	const mockCredentials: ICredentialDataDecryptedObject = {
		awsRegion: 'us-east-1',
		awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
		awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('signRequest', () => {
		it('should sign GET request correctly', async () => {
			const mockSignedHeaders = {
				'Authorization': 'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20240101/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=example-signature',
				'X-Amz-Date': '20240101T120000Z',
				'Host': 'sellingpartnerapi-na.amazon.com',
			};

			mockedAws4.sign.mockReturnValueOnce({
				headers: mockSignedHeaders,
			} as any);

			const url = 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders';
			const headers = { 'Accept': 'application/json' };
			
			const result = await SigV4Signer.signRequest('GET', url, headers, undefined, mockCredentials);

			expect(result).toEqual(mockSignedHeaders);
			expect(mockedAws4.sign).toHaveBeenCalledWith(
				{
					method: 'GET',
					host: 'sellingpartnerapi-na.amazon.com',
					path: '/orders/v0/orders',
					headers: { 'Accept': 'application/json' },
					body: undefined,
					service: 'execute-api',
					region: 'us-east-1',
				},
				{
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				}
			);
		});

		it('should sign POST request with body', async () => {
			const mockSignedHeaders = {
				'Authorization': 'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20240101/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=example-signature',
				'X-Amz-Date': '20240101T120000Z',
			};

			mockedAws4.sign.mockReturnValueOnce({
				headers: mockSignedHeaders,
			} as any);

			const url = 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders';
			const headers = { 'Content-Type': 'application/json' };
			const body = '{"test": "data"}';
			
			const result = await SigV4Signer.signRequest('POST', url, headers, body, mockCredentials);

			expect(result).toEqual(mockSignedHeaders);
			expect(mockedAws4.sign).toHaveBeenCalledWith(
				{
					method: 'POST',
					host: 'sellingpartnerapi-na.amazon.com',
					path: '/orders/v0/orders',
					headers: { 'Content-Type': 'application/json' },
					body: '{"test": "data"}',
					service: 'execute-api',
					region: 'us-east-1',
				},
				{
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				}
			);
		});

		it('should handle URL with query parameters', async () => {
			const mockSignedHeaders = { 'Authorization': 'test-auth' };
			mockedAws4.sign.mockReturnValueOnce({ headers: mockSignedHeaders } as any);

			const url = 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders?MarketplaceIds=ATVPDKIKX0DER&CreatedAfter=2024-01-01T00:00:00Z';
			const headers = {};
			
			await SigV4Signer.signRequest('GET', url, headers, undefined, mockCredentials);

			expect(mockedAws4.sign).toHaveBeenCalledWith(
				expect.objectContaining({
					path: '/orders/v0/orders?MarketplaceIds=ATVPDKIKX0DER&CreatedAfter=2024-01-01T00:00:00Z',
				}),
				expect.any(Object)
			);
		});

		it('should handle different regions', async () => {
			const mockSignedHeaders = { 'Authorization': 'test-auth' };
			mockedAws4.sign.mockReturnValueOnce({ headers: mockSignedHeaders } as any);

			const euCredentials = { ...mockCredentials, awsRegion: 'eu-west-1' };
			const url = 'https://sellingpartnerapi-eu.amazon.com/orders/v0/orders';
			
			await SigV4Signer.signRequest('GET', url, {}, undefined, euCredentials);

			expect(mockedAws4.sign).toHaveBeenCalledWith(
				expect.objectContaining({
					region: 'eu-west-1',
					host: 'sellingpartnerapi-eu.amazon.com',
				}),
				expect.any(Object)
			);
		});

		it('should preserve original headers', async () => {
			const mockSignedHeaders = { 'Authorization': 'test-auth' };
			mockedAws4.sign.mockReturnValueOnce({ headers: mockSignedHeaders } as any);

			const originalHeaders = {
				'Accept': 'application/json',
				'User-Agent': 'test-agent',
				'x-amz-access-token': 'test-token',
			};
			
			await SigV4Signer.signRequest('GET', 'https://example.com/test', originalHeaders, undefined, mockCredentials);

			expect(mockedAws4.sign).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: originalHeaders,
				}),
				expect.any(Object)
			);
		});

		it('should handle signing errors', async () => {
			mockedAws4.sign.mockImplementationOnce(() => {
				throw new Error('Invalid AWS credentials');
			});

			await expect(
				SigV4Signer.signRequest('GET', 'https://example.com/test', {}, undefined, mockCredentials)
			).rejects.toThrow('Failed to sign request: Invalid AWS credentials');
		});

		it('should handle malformed URLs', async () => {
			await expect(
				SigV4Signer.signRequest('GET', 'not-a-valid-url', {}, undefined, mockCredentials)
			).rejects.toThrow('Failed to sign request:');
		});
	});
}); 