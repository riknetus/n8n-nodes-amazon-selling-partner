import { AxiosResponse, AxiosError } from 'axios';
import { ErrorHandler } from '../ErrorHandler';

describe('ErrorHandler', () => {
	describe('handleApiError', () => {
		it('should handle 429 throttling error', async () => {
			const response: AxiosResponse = {
				status: 429,
				data: {},
				headers: {
					'retry-after': '120',
				},
				statusText: 'Too Many Requests',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toBe('Request throttled by Amazon SP-API');
			expect(error.description).toContain('Retry after 120 seconds');
		});

		it('should handle 429 with x-amzn-rate-limit-wait header', async () => {
			const response: AxiosResponse = {
				status: 429,
				data: {},
				headers: {
					'x-amzn-rate-limit-wait': '60',
				},
				statusText: 'Too Many Requests',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.description).toContain('Retry after 60 seconds');
		});

		it('should handle 401 authentication error', async () => {
			const response: AxiosResponse = {
				status: 401,
				data: {},
				headers: {},
				statusText: 'Unauthorized',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toBe('Authentication failed');
			expect(error.description).toContain('Check your SP-API credentials');
		});

		it('should handle 403 forbidden error', async () => {
			const response: AxiosResponse = {
				status: 403,
				data: {},
				headers: {},
				statusText: 'Forbidden',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toBe('Authentication failed');
			expect(error.description).toContain('LWA tokens, and AWS permissions');
		});

		it('should handle 404 not found error', async () => {
			const response: AxiosResponse = {
				status: 404,
				data: {},
				headers: {},
				statusText: 'Not Found',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toBe('Resource not found');
			expect(error.description).toContain('Check your marketplace IDs');
		});

		it('should handle SP-API specific errors', async () => {
			const response: AxiosResponse = {
				status: 400,
				data: {
					errors: [
						{
							code: 'InvalidInput',
							message: 'Invalid marketplace ID',
							details: 'The marketplace ID INVALID is not valid',
						},
						{
							code: 'MissingParameter',
							message: 'Required parameter missing',
						},
					],
				},
				headers: {},
				statusText: 'Bad Request',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toBe('SP-API Error: Invalid marketplace ID');
			expect(error.description).toContain('InvalidInput: Invalid marketplace ID');
			expect(error.description).toContain('MissingParameter: Required parameter missing');
		});

		it('should handle generic 4xx client errors', async () => {
			const response: AxiosResponse = {
				status: 422,
				data: {
					message: 'Unprocessable Entity',
				},
				headers: {},
				statusText: 'Unprocessable Entity',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toBe('Client error (422): Unprocessable Entity');
			expect(error.description).toContain('Check your request parameters');
		});

		it('should handle 5xx server errors', async () => {
			const response: AxiosResponse = {
				status: 500,
				data: {},
				headers: {},
				statusText: 'Internal Server Error',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toBe('Server error (500): Amazon SP-API is temporarily unavailable');
			expect(error.description).toContain('temporary issue with Amazon\'s servers');
		});

		it('should handle 503 service unavailable', async () => {
			const response: AxiosResponse = {
				status: 503,
				data: {},
				headers: {},
				statusText: 'Service Unavailable',
				config: {} as any,
			};

			const error = await ErrorHandler.handleApiError(response);
			
			expect(error.message).toContain('Server error (503)');
		});
	});

	describe('handleNetworkError', () => {
		it('should handle timeout errors', async () => {
			const axiosError: AxiosError = {
				name: 'AxiosError',
				message: 'timeout of 30000ms exceeded',
				code: 'ECONNABORTED',
				config: {} as any,
				isAxiosError: true,
				toJSON: () => ({}),
			};

			const error = await ErrorHandler.handleNetworkError(axiosError);
			
			expect(error.message).toBe('Request timeout');
			expect(error.description).toContain('request to Amazon SP-API timed out');
		});

		it('should handle connection timeout', async () => {
			const axiosError: AxiosError = {
				name: 'AxiosError',
				message: 'Connection timeout',
				code: 'ETIMEDOUT',
				config: {} as any,
				isAxiosError: true,
				toJSON: () => ({}),
			};

			const error = await ErrorHandler.handleNetworkError(axiosError);
			
			expect(error.message).toBe('Request timeout');
		});

		it('should handle DNS resolution errors', async () => {
			const axiosError: AxiosError = {
				name: 'AxiosError',
				message: 'getaddrinfo ENOTFOUND sellingpartnerapi-na.amazon.com',
				code: 'ENOTFOUND',
				config: {} as any,
				isAxiosError: true,
				toJSON: () => ({}),
			};

			const error = await ErrorHandler.handleNetworkError(axiosError);
			
			expect(error.message).toBe('Network connection failed');
			expect(error.description).toContain('Check your internet connection');
		});

		it('should handle connection refused errors', async () => {
			const axiosError: AxiosError = {
				name: 'AxiosError',
				message: 'connect ECONNREFUSED',
				code: 'ECONNREFUSED',
				config: {} as any,
				isAxiosError: true,
				toJSON: () => ({}),
			};

			const error = await ErrorHandler.handleNetworkError(axiosError);
			
			expect(error.message).toBe('Network connection failed');
			expect(error.description).toContain('firewall settings');
		});

		it('should handle generic network errors', async () => {
			const axiosError: AxiosError = {
				name: 'AxiosError',
				message: 'Network Error',
				code: 'NETWORK_ERROR',
				config: {} as any,
				isAxiosError: true,
				toJSON: () => ({}),
			};

			const error = await ErrorHandler.handleNetworkError(axiosError);
			
			expect(error.message).toBe('Network error: Network Error');
			expect(error.description).toContain('unexpected network error');
		});

		it('should handle errors without message', async () => {
			const axiosError: AxiosError = {
				name: 'AxiosError',
				message: '',
				code: 'UNKNOWN',
				config: {} as any,
				isAxiosError: true,
				toJSON: () => ({}),
			};

			const error = await ErrorHandler.handleNetworkError(axiosError);
			
			expect(error.message).toBe('Network error: Unknown network error');
		});
	});
}); 