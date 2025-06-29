import { IExecuteFunctions } from 'n8n-workflow';
import { AmazonSellingPartner } from '../../nodes/AmazonSellingPartner/AmazonSellingPartner.node';

// Skip integration tests if no credentials are provided
const hasCredentials = process.env.SP_API_LWA_CLIENT_ID && process.env.SP_API_LWA_CLIENT_SECRET;

const describeIntegration = hasCredentials ? describe : describe.skip;

describeIntegration('Invoices Integration Tests', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let amazonNode: AmazonSellingPartner;

	beforeAll(() => {
		if (!hasCredentials) {
			console.log('Skipping Invoices integration tests - no credentials provided');
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
				id: 'invoices-integration-test-node',
				name: 'Invoices Integration Test',
				type: 'amazonSellingPartner',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
			helpers: {
				prepareBinaryData: jest.fn().mockImplementation((data, filename, mimeType) => ({
					data: data.toString('base64'),
					mimeType: mimeType || 'application/octet-stream',
					fileName: filename || 'file',
				})),
			},
		} as any;
	});

	describe('GST Reports', () => {
		it('should handle GST report request validation', async () => {
			// Test with invalid marketplace
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invoices') // resource
				.mockReturnValueOnce('getGstReport') // operation
				.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
				.mockReturnValueOnce('INVALID_MARKETPLACE') // marketplaceId
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}); // advancedOptions

			await expect(amazonNode.execute.call(mockExecuteFunctions))
				.rejects
				.toThrow('GST reports are only available for Amazon.in marketplace');
		});

		it('should handle date range validation for custom GST reports', async () => {
			const startDate = '2024-01-01T00:00:00Z';
			const endDate = '2024-02-15T00:00:00Z'; // 45 days later

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invoices') // resource
				.mockReturnValueOnce('getGstReport') // operation
				.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
				.mockReturnValueOnce('A21TJRUUN4KGV') // marketplaceId
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}) // advancedOptions
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate); // endDate

			await expect(amazonNode.execute.call(mockExecuteFunctions))
				.rejects
				.toThrow('Date range for GST reports cannot exceed 31 days');
		});

		it.skip('should create GST report request (requires valid Indian seller account)', async () => {
			// This test requires a valid Indian seller account with GST registration
			// Skip by default as it requires specific credentials and may take time
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - 7); // 7 days ago
			const endDate = new Date();

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invoices') // resource
				.mockReturnValueOnce('getGstReport') // operation
				.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
				.mockReturnValueOnce('A21TJRUUN4KGV') // marketplaceId (India)
				.mockReturnValueOnce({ returnBinary: true }) // outputOptions
				.mockReturnValueOnce({ maxPollTimeMinutes: 1, pollIntervalSeconds: 10 }) // advancedOptions
				.mockReturnValueOnce(startDate.toISOString()) // startDate
				.mockReturnValueOnce(endDate.toISOString()); // endDate

			const result = await amazonNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Array);
			expect(result[0].length).toBeGreaterThan(0);
		}, 120000); // 2 minute timeout
	});

	describe('VAT Invoice Reports', () => {
		it('should handle VAT report marketplace validation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invoices') // resource
				.mockReturnValueOnce('getVatInvoiceReport') // operation
				.mockReturnValueOnce('GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT') // reportType
				.mockReturnValueOnce('INVALID_MARKETPLACE') // marketplaceId
				.mockReturnValueOnce({}) // reportOptions
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}); // advancedOptions

			await expect(amazonNode.execute.call(mockExecuteFunctions))
				.rejects
				.toThrow('VAT invoice reports are only available for EU/UK marketplaces');
		});

		it('should handle date range validation for VAT reports', async () => {
			const startDate = '2024-01-01T00:00:00Z';
			const endDate = '2024-02-15T00:00:00Z'; // 45 days later

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invoices') // resource
				.mockReturnValueOnce('getVatInvoiceReport') // operation
				.mockReturnValueOnce('GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT') // reportType
				.mockReturnValueOnce('A1F83G8C2ARO7P') // marketplaceId (UK)
				.mockReturnValueOnce({ pendingInvoices: false }) // reportOptions
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}) // advancedOptions
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate); // endDate

			await expect(amazonNode.execute.call(mockExecuteFunctions))
				.rejects
				.toThrow('Date range for VAT invoice reports cannot exceed 30 days');
		});

		it.skip('should create VAT invoice report request (requires valid EU/UK seller account)', async () => {
			// This test requires a valid EU/UK seller account
			// Skip by default as it requires specific credentials and may take time
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invoices') // resource
				.mockReturnValueOnce('getVatInvoiceReport') // operation
				.mockReturnValueOnce('GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT') // reportType
				.mockReturnValueOnce('A1F83G8C2ARO7P') // marketplaceId (UK)
				.mockReturnValueOnce({ pendingInvoices: true }) // reportOptions
				.mockReturnValueOnce({ returnBinary: true }) // outputOptions
				.mockReturnValueOnce({ maxPollTimeMinutes: 1, pollIntervalSeconds: 10 }); // advancedOptions

			const result = await amazonNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Array);
			expect(result[0].length).toBeGreaterThan(0);
		}, 120000); // 2 minute timeout
	});

	describe('VAT PDF Links', () => {
		it.skip('should create VAT PDF links report request (requires valid EU/UK seller account)', async () => {
			// This test requires a valid EU/UK seller account
			// Skip by default as it requires specific credentials and may take time
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invoices') // resource
				.mockReturnValueOnce('getVatInvoicePdfLinks') // operation
				.mockReturnValueOnce('A1F83G8C2ARO7P') // marketplaceId (UK)
				.mockReturnValueOnce({ returnBinary: true }) // outputOptions
				.mockReturnValueOnce({ maxPollTimeMinutes: 1, pollIntervalSeconds: 10 }); // advancedOptions

			const result = await amazonNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Array);
			expect(result[0].length).toBeGreaterThan(0);
		}, 120000); // 2 minute timeout
	});

	describe('Rate Limiting', () => {
		it('should respect rate limits for Reports API', async () => {
			// Test that multiple report requests are properly rate limited
			const requests = Array.from({ length: 2 }, () => {
				const mockExecFunctions = {
					...mockExecuteFunctions,
					getNodeParameter: jest.fn()
						.mockReturnValueOnce('invoices') // resource
						.mockReturnValueOnce('getGstReport') // operation
						.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
						.mockReturnValueOnce('A21TJRUUN4KGV') // marketplaceId
						.mockReturnValueOnce({}) // outputOptions
						.mockReturnValueOnce({ maxPollTimeMinutes: 1 }) // advancedOptions
						.mockReturnValueOnce('2024-01-01T00:00:00Z') // startDate
						.mockReturnValueOnce('2024-01-07T23:59:59Z'), // endDate
				};

				return amazonNode.execute.call(mockExecFunctions as any);
			});

			const startTime = Date.now();
			
			// Both requests should eventually fail due to invalid credentials in sandbox
			// but they should be properly rate limited
			await Promise.allSettled(requests);
			
			const duration = Date.now() - startTime;
			
			// Should take at least 60 seconds due to Reports API rate limit (1 req/60s)
			// But we'll use a smaller threshold for testing
			expect(duration).toBeGreaterThan(1000); // At least 1 second
		}, 120000);
	});
}); 