import { IExecuteFunctions } from 'n8n-workflow';
import { getGstReport, getVatInvoiceReport, getVatInvoicePdfLinks } from '../operations/Invoices.operations';
import { SpApiRequest } from '../helpers/SpApiRequest';
import { ReportDownloader } from '../helpers/ReportDownloader';

// Mock the dependencies
jest.mock('../helpers/SpApiRequest');
jest.mock('../helpers/ReportDownloader');

const mockSpApiRequest = SpApiRequest as jest.Mocked<typeof SpApiRequest>;
const mockReportDownloader = ReportDownloader as jest.Mocked<typeof ReportDownloader>;

describe('Invoices Operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Test Node',
				type: 'amazonSellingPartner',
			}),
			helpers: {
				prepareBinaryData: jest.fn().mockResolvedValue({
					data: 'binary-data',
					mimeType: 'text/plain',
					fileName: 'test.txt',
				}),
			},
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('getGstReport', () => {
		it('should validate marketplace ID for GST reports', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
				.mockReturnValueOnce('INVALID_MARKETPLACE') // marketplaceId
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}); // advancedOptions

			await expect(getGstReport.call(mockExecuteFunctions, 0))
				.rejects
				.toThrow('GST reports are only available for Amazon.in marketplace (A21TJRUUN4KGV)');
		});

		it('should require date range for custom GST reports', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
				.mockReturnValueOnce('A21TJRUUN4KGV') // marketplaceId
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}) // advancedOptions
				.mockReturnValueOnce('') // startDate
				.mockReturnValueOnce(''); // endDate

			await expect(getGstReport.call(mockExecuteFunctions, 0))
				.rejects
				.toThrow('Start date and end date are required for custom GST reports');
		});

		it('should validate date range for GST reports (max 31 days)', async () => {
			const startDate = '2024-01-01T00:00:00Z';
			const endDate = '2024-02-15T00:00:00Z'; // 45 days later

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
				.mockReturnValueOnce('A21TJRUUN4KGV') // marketplaceId
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}) // advancedOptions
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate); // endDate

			await expect(getGstReport.call(mockExecuteFunctions, 0))
				.rejects
				.toThrow('Date range for GST reports cannot exceed 31 days');
		});

		it('should process GST report successfully', async () => {
			const startDate = '2024-01-01T00:00:00Z';
			const endDate = '2024-01-15T00:00:00Z';

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('GET_GST_MTR_B2B_CUSTOM') // reportType
				.mockReturnValueOnce('A21TJRUUN4KGV') // marketplaceId
				.mockReturnValueOnce({ returnBinary: true }) // outputOptions
				.mockReturnValueOnce({ maxPollTimeMinutes: 5 }) // advancedOptions
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate); // endDate

			// Mock API responses
			mockSpApiRequest.makeRequest
				.mockResolvedValueOnce({
					data: { reportId: 'test-report-id' },
					headers: {},
					status: 200,
				})
				.mockResolvedValueOnce({
					data: {
						reportId: 'test-report-id',
						reportType: 'GET_GST_MTR_B2B_CUSTOM',
						processingStatus: 'DONE',
						reportDocumentId: 'test-document-id',
						createdTime: '2024-01-01T00:00:00Z',
					},
					headers: {},
					status: 200,
				})
				.mockResolvedValueOnce({
					data: {
						reportDocumentId: 'test-document-id',
						url: 'https://example.com/report.txt',
					},
					headers: {},
					status: 200,
				});

			mockReportDownloader.downloadReportDocument.mockResolvedValue(
				Buffer.from('test,data\n1,2')
			);

			const result = await getGstReport.call(mockExecuteFunctions, 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.reportType).toBe('GET_GST_MTR_B2B_CUSTOM');
			expect(result[0].binary).toBeDefined();
		});
	});

	describe('getVatInvoiceReport', () => {
		it('should validate marketplace ID for VAT reports', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT') // reportType
				.mockReturnValueOnce('INVALID_MARKETPLACE') // marketplaceId
				.mockReturnValueOnce({}) // reportOptions
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}); // advancedOptions

			await expect(getVatInvoiceReport.call(mockExecuteFunctions, 0))
				.rejects
				.toThrow('VAT invoice reports are only available for EU/UK marketplaces');
		});

		it('should require date range when not using pending invoices only', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT') // reportType
				.mockReturnValueOnce('A1F83G8C2ARO7P') // marketplaceId (UK)
				.mockReturnValueOnce({ pendingInvoices: false }) // reportOptions
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}) // advancedOptions
				.mockReturnValueOnce('') // startDate
				.mockReturnValueOnce(''); // endDate

			await expect(getVatInvoiceReport.call(mockExecuteFunctions, 0))
				.rejects
				.toThrow('Start date and end date are required when not using pending invoices only');
		});

		it('should validate date range for VAT reports (max 30 days)', async () => {
			const startDate = '2024-01-01T00:00:00Z';
			const endDate = '2024-02-15T00:00:00Z'; // 45 days later

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT') // reportType
				.mockReturnValueOnce('A1F83G8C2ARO7P') // marketplaceId (UK)
				.mockReturnValueOnce({ pendingInvoices: false }) // reportOptions
				.mockReturnValueOnce({}) // outputOptions
				.mockReturnValueOnce({}) // advancedOptions
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate); // endDate

			await expect(getVatInvoiceReport.call(mockExecuteFunctions, 0))
				.rejects
				.toThrow('Date range for VAT invoice reports cannot exceed 30 days');
		});
	});

	describe('getVatInvoicePdfLinks', () => {
		it('should process VAT PDF links report successfully', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('A1F83G8C2ARO7P') // marketplaceId (UK)
				.mockReturnValueOnce({ returnBinary: true }) // outputOptions
				.mockReturnValueOnce({ maxPollTimeMinutes: 5 }); // advancedOptions

			// Mock API responses
			mockSpApiRequest.makeRequest
				.mockResolvedValueOnce({
					data: { reportId: 'test-report-id' },
					headers: {},
					status: 200,
				})
				.mockResolvedValueOnce({
					data: {
						reportId: 'test-report-id',
						reportType: 'SC_VAT_TAX_REPORT',
						processingStatus: 'DONE',
						reportDocumentId: 'test-document-id',
						createdTime: '2024-01-01T00:00:00Z',
					},
					headers: {},
					status: 200,
				})
				.mockResolvedValueOnce({
					data: {
						reportDocumentId: 'test-document-id',
						url: 'https://example.com/report.txt',
					},
					headers: {},
					status: 200,
				});

			mockReportDownloader.downloadReportDocument.mockResolvedValue(
				Buffer.from('PDF link data')
			);

			const result = await getVatInvoicePdfLinks.call(mockExecuteFunctions, 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.reportType).toBe('SC_VAT_TAX_REPORT');
		});
	});
}); 