import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { executeAnalyticsOperation } from '../Analytics.operations';
import { SpApiRequest } from '../../helpers/SpApiRequest';
import { ReportDownloader } from '../../helpers/ReportDownloader';
import { securityValidator } from '../../core/SecurityValidator';

// Mock dependencies
jest.mock('../../helpers/SpApiRequest');
jest.mock('../../helpers/ReportDownloader');
jest.mock('../../core/SecurityValidator');
jest.mock('../../core/MetricsCollector');
jest.mock('../../core/AuditLogger');

const mockSpApiRequest = SpApiRequest as jest.Mocked<typeof SpApiRequest>;
const mockReportDownloader = ReportDownloader as jest.Mocked<typeof ReportDownloader>;
const mockSecurityValidator = securityValidator as jest.Mocked<typeof securityValidator>;

// Mock execution functions
const mockExecuteFunctions = {
	getNodeParameter: jest.fn(),
	getNode: jest.fn(() => ({ id: 'test-node-id', name: 'Test Node', type: 'amazonSellingPartner' })),
	getCredentials: jest.fn(),
	helpers: {
		returnJsonArray: jest.fn((data) => data),
	},
} as unknown as IExecuteFunctions;

describe('Analytics Operations', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		
		// Default mock implementations
		mockSecurityValidator.validateMarketplaceIds.mockReturnValue({ isValid: true, errors: [] });
		mockSecurityValidator.validateDateRange.mockReturnValue({ isValid: true, errors: [] });
		mockSecurityValidator.validateApiParameters.mockReturnValue({ 
			isValid: true, 
			errors: [], 
			sanitizedData: {} 
		});
	});

	describe('validateAccess', () => {
		it('should validate Data Kiosk and Reports API access successfully', async () => {
			// Mock successful Data Kiosk access
			mockSpApiRequest.makeRequest
				.mockResolvedValueOnce({
					data: { success: true },
					headers: {},
					status: 200,
				})
				// Mock successful Reports API access
				.mockResolvedValueOnce({
					data: { reportTypes: ['GET_SALES_AND_TRAFFIC_REPORT'] },
					headers: {},
					status: 200,
				});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'validateAccess', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.dataKioskAccess).toBe(true);
			expect(result[0].json.reportsAccess).toBe(true);
			expect(result[0].json.recommendedMode).toBe('dataKiosk');
		});

		it('should handle Data Kiosk failure with Reports fallback', async () => {
			// Mock Data Kiosk failure
			mockSpApiRequest.makeRequest
				.mockRejectedValueOnce(new Error('Data Kiosk not available'))
				// Mock successful Reports API access
				.mockResolvedValueOnce({
					data: { reportTypes: ['GET_SALES_AND_TRAFFIC_REPORT'] },
					headers: {},
					status: 200,
				});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'validateAccess', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.dataKioskAccess).toBe(false);
			expect(result[0].json.reportsAccess).toBe(true);
			expect(result[0].json.recommendedMode).toBe('reports');
			expect(result[0].json.errors).toContain('Data Kiosk: Data Kiosk not available');
		});

		it('should handle complete API access failure', async () => {
			// Mock both APIs failing
			mockSpApiRequest.makeRequest
				.mockRejectedValueOnce(new Error('Data Kiosk not available'))
				.mockRejectedValueOnce(new Error('Reports API not available'));

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'validateAccess', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(false);
			expect(result[0].json.dataKioskAccess).toBe(false);
			expect(result[0].json.reportsAccess).toBe(false);
			expect(result[0].json.recommendedMode).toBe('none');
			expect(result[0].json.errors).toHaveLength(2);
		});
	});

	describe('salesAndTrafficByAsin', () => {
		beforeEach(() => {
			// Setup default parameters
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last30days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							trafficMetrics: { metrics: ['sessions', 'pageViews'] },
							salesMetrics: { metrics: ['unitsOrdered', 'orderedProductSales'] },
							conversionMetrics: { metrics: ['unitSessionPercentage'] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						},
						filters: {},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: {},
					};
					return params[paramName] || defaultValue;
				});
		});

		it('should execute Data Kiosk mode successfully', async () => {
			const mockAnalyticsData = [
				{
					asin: 'B07ABC123XYZ',
					marketplaceId: 'ATVPDKIKX0DER',
					date: '2024-01-01',
					metrics: {
						sessions: 100,
						pageViews: 150,
						unitsOrdered: 5,
						orderedProductSales: 99.95,
						unitSessionPercentage: 5.0,
					},
				},
			];

			mockSpApiRequest.makeRequest.mockResolvedValueOnce({
				data: {
					results: mockAnalyticsData,
					nextToken: null,
					metadata: { totalResults: 1 },
				},
				headers: {},
				status: 200,
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.mode).toBe('dataKiosk');
			expect(result[0].json.data).toHaveLength(1);
			expect(result[0].json.data[0].asin).toBe('B07ABC123XYZ');
		});

		it('should fallback to Reports mode when Data Kiosk fails', async () => {
			// Mock Data Kiosk failure
			mockSpApiRequest.makeRequest
				.mockRejectedValueOnce(new Error('Data Kiosk not available'))
				// Mock Reports API success - create report
				.mockResolvedValueOnce({
					data: { reportId: 'test-report-id' },
					headers: {},
					status: 200,
				})
				// Mock Reports API success - get report status
				.mockResolvedValueOnce({
					data: {
						reportId: 'test-report-id',
						processingStatus: 'DONE',
						reportDocumentId: 'test-document-id',
						createdTime: '2024-01-01T00:00:00Z',
					},
					headers: {},
					status: 200,
				})
				// Mock Reports API success - get document
				.mockResolvedValueOnce({
					data: {
						reportDocumentId: 'test-document-id',
						url: 'https://example.com/report.csv',
					},
					headers: {},
					status: 200,
				});

			// Mock report download and parsing
			const mockCsvData = 'asin,sessions,pageViews,unitsOrdered,orderedProductSales\nB07ABC123XYZ,100,150,5,99.95';
			mockReportDownloader.downloadReportDocument.mockResolvedValueOnce(Buffer.from(mockCsvData));

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.mode).toBe('reports');
		});

		it('should validate marketplace IDs', async () => {
			mockSecurityValidator.validateMarketplaceIds.mockReturnValue({
				isValid: false,
				errors: ['Invalid marketplace ID format: INVALID'],
			});

			await expect(executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0))
				.rejects
				.toThrow('Invalid marketplace IDs: Invalid marketplace ID format: INVALID');
		});

		it('should validate date range', async () => {
			mockSecurityValidator.validateDateRange.mockReturnValue({
				isValid: false,
				errors: ['Date range cannot exceed 30 days'],
			});

			await expect(executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0))
				.rejects
				.toThrow('Invalid date range: Date range cannot exceed 30 days');
		});

		it('should require at least one metric', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string) => {
					if (paramName === 'metricsSelection') {
						return {
							trafficMetrics: { metrics: [] },
							salesMetrics: { metrics: [] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						};
					}
					return mockExecuteFunctions.getNodeParameter(paramName, 0);
				});

			await expect(executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0))
				.rejects
				.toThrow('At least one metric must be selected');
		});

		it('should handle CSV output format', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					if (paramName === 'outputOptions') {
						return {
							format: 'csv',
							csvDelimiter: ',',
							csvDecimalSeparator: '.',
							csvFilename: 'analytics_{marketplace}_{start}_{end}.csv',
							includeHeaders: true,
						};
					}
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last30days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							trafficMetrics: { metrics: ['sessions'] },
							salesMetrics: { metrics: ['unitsOrdered'] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						},
						filters: {},
						sortingLimiting: {},
						advancedOptions: {},
					};
					return params[paramName] || defaultValue;
				});

			const mockAnalyticsData = [
				{
					asin: 'B07ABC123XYZ',
					marketplaceId: 'ATVPDKIKX0DER',
					date: '2024-01-01',
					metrics: {
						sessions: 100,
						unitsOrdered: 5,
					},
				},
			];

			mockSpApiRequest.makeRequest.mockResolvedValueOnce({
				data: {
					results: mockAnalyticsData,
					nextToken: null,
					metadata: { totalResults: 1 },
				},
				headers: {},
				status: 200,
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].binary?.data).toBeDefined();
			expect(result[0].binary?.data.mimeType).toBe('text/csv');
			expect(result[0].json.filename).toContain('analytics_ATVPDKIKX0DER');
		});

		it('should handle computed metrics', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					if (paramName === 'metricsSelection') {
						return {
							trafficMetrics: { metrics: ['sessions'] },
							salesMetrics: { metrics: ['unitsOrdered', 'orderedProductSales'] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: ['aov', 'unitsPerSession'] },
						};
					}
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last30days',
						granularity: 'DAILY',
						timezone: 'UTC',
						filters: {},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: {},
					};
					return params[paramName] || defaultValue;
				});

			const mockAnalyticsData = [
				{
					asin: 'B07ABC123XYZ',
					marketplaceId: 'ATVPDKIKX0DER',
					date: '2024-01-01',
					metrics: {
						sessions: 100,
						unitsOrdered: 5,
						orderedProductSales: 99.95,
					},
				},
			];

			mockSpApiRequest.makeRequest.mockResolvedValueOnce({
				data: {
					results: mockAnalyticsData,
					nextToken: null,
					metadata: { totalResults: 1 },
				},
				headers: {},
				status: 200,
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.data[0].aov).toBeCloseTo(19.99, 2); // 99.95 / 5
			expect(result[0].json.data[0].unitsPerSession).toBe(0.05); // 5 / 100
		});

		it('should handle sorting and limiting', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					if (paramName === 'sortingLimiting') {
						return {
							sortBy: 'orderedProductSales',
							sortDirection: 'desc',
							topN: 2,
						};
					}
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last30days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							trafficMetrics: { metrics: ['sessions'] },
							salesMetrics: { metrics: ['orderedProductSales'] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						},
						filters: {},
						outputOptions: {},
						advancedOptions: {},
					};
					return params[paramName] || defaultValue;
				});

			const mockAnalyticsData = [
				{
					asin: 'B07ABC123XYZ',
					marketplaceId: 'ATVPDKIKX0DER',
					date: '2024-01-01',
					metrics: { sessions: 100, orderedProductSales: 50.00 },
				},
				{
					asin: 'B07DEF456ABC',
					marketplaceId: 'ATVPDKIKX0DER',
					date: '2024-01-01',
					metrics: { sessions: 200, orderedProductSales: 150.00 },
				},
				{
					asin: 'B07GHI789DEF',
					marketplaceId: 'ATVPDKIKX0DER',
					date: '2024-01-01',
					metrics: { sessions: 50, orderedProductSales: 25.00 },
				},
			];

			mockSpApiRequest.makeRequest.mockResolvedValueOnce({
				data: {
					results: mockAnalyticsData,
					nextToken: null,
					metadata: { totalResults: 3 },
				},
				headers: {},
				status: 200,
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			expect(result[0].json.data).toHaveLength(2); // Limited to top 2
			expect(result[0].json.data[0].asin).toBe('B07DEF456ABC'); // Highest sales first
			expect(result[0].json.data[1].asin).toBe('B07ABC123XYZ'); // Second highest
		});

		it('should handle date presets correctly', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					if (paramName === 'datePreset') {
						return 'yesterday';
					}
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							trafficMetrics: { metrics: ['sessions'] },
							salesMetrics: { metrics: [] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						},
						filters: {},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: {},
					};
					return params[paramName] || defaultValue;
				});

			mockSpApiRequest.makeRequest.mockResolvedValueOnce({
				data: {
					results: [],
					nextToken: null,
					metadata: { totalResults: 0 },
				},
				headers: {},
				status: 200,
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			
			// Verify the request was made with yesterday's date range
			expect(mockSpApiRequest.makeRequest).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					method: 'POST',
					endpoint: expect.stringContaining('/dataKiosk/2024-04-24/analytics/salesAndTraffic'),
					body: expect.objectContaining({
						startDate: expect.any(String),
						endDate: expect.any(String),
					}),
				})
			);
		});

		it('should handle filters correctly', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					if (paramName === 'filters') {
						return {
							asins: ['B07ABC123XYZ', 'B07DEF456ABC'],
							brands: ['My Brand'],
							minSessions: 10,
							includeZeroActivity: false,
						};
					}
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last30days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							trafficMetrics: { metrics: ['sessions'] },
							salesMetrics: { metrics: [] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: {},
					};
					return params[paramName] || defaultValue;
				});

			mockSpApiRequest.makeRequest.mockResolvedValueOnce({
				data: {
					results: [],
					nextToken: null,
					metadata: { totalResults: 0 },
				},
				headers: {},
				status: 200,
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.success).toBe(true);
			
			// Verify filters were applied to the request
			expect(mockSpApiRequest.makeRequest).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					body: expect.objectContaining({
						filters: expect.objectContaining({
							asin: ['B07ABC123XYZ', 'B07DEF456ABC'],
							brand: ['My Brand'],
							minSessions: 10,
						}),
					}),
				})
			);
		});
	});

	describe('error handling', () => {
		it('should throw error for unknown operation', async () => {
			await expect(executeAnalyticsOperation.call(mockExecuteFunctions, 'unknownOperation', 0))
				.rejects
				.toThrow('Unknown analytics operation: unknownOperation');
		});

		it('should handle API request failures gracefully', async () => {
			mockSpApiRequest.makeRequest.mockRejectedValueOnce(new Error('API request failed'));

			// Setup parameters for salesAndTrafficByAsin
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last30days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							trafficMetrics: { metrics: ['sessions'] },
							salesMetrics: { metrics: [] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						},
						filters: {},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: { analyticsMode: 'dataKiosk' }, // Force Data Kiosk mode to avoid fallback
					};
					return params[paramName] || defaultValue;
				});

			await expect(executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0))
				.rejects
				.toThrow('Analytics operation failed');
		});

		it('should handle report generation timeout', async () => {
			// Mock Data Kiosk failure to trigger Reports fallback
			mockSpApiRequest.makeRequest
				.mockRejectedValueOnce(new Error('Data Kiosk not available'))
				// Mock Reports API - create report success
				.mockResolvedValueOnce({
					data: { reportId: 'test-report-id' },
					headers: {},
					status: 200,
				});

			// Mock report status checks that never complete
			let statusCallCount = 0;
			mockSpApiRequest.makeRequest.mockImplementation((executeFunctions, options) => {
				if (options.endpoint?.includes('/reports/')) {
					if (statusCallCount === 0) {
						// First call - create report
						statusCallCount++;
						return Promise.resolve({
							data: { reportId: 'test-report-id' },
							headers: {},
							status: 200,
						});
					} else {
						// Subsequent calls - status check (simulate never completing)
						return Promise.resolve({
							data: {
								reportId: 'test-report-id',
								processingStatus: 'IN_PROGRESS',
								createdTime: '2024-01-01T00:00:00Z',
							},
							headers: {},
							status: 200,
						});
					}
				}
				return Promise.reject(new Error('Unexpected call'));
			});

			// Setup parameters
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last30days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							trafficMetrics: { metrics: ['sessions'] },
							salesMetrics: { metrics: [] },
							conversionMetrics: { metrics: [] },
							buyboxMetrics: { metrics: [] },
							computedMetrics: { metrics: [] },
						},
						filters: {},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: { analyticsMode: 'auto' },
					};
					return params[paramName] || defaultValue;
				});

			// This should timeout and throw an error
			await expect(executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0))
				.rejects
				.toThrow('Report generation timeout');
		}, 10000); // Increase timeout for this test
	});

	describe('Default metricsSelection behavior', () => {
		it('should handle empty metricsSelection with fallback defaults', async () => {
			// Mock the execute functions with empty metricsSelection
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last7Days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {}, // Empty object should trigger fallback
						filters: {},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: { analyticsMode: 'dataKiosk' },
					};
					return params[paramName] || defaultValue;
				});

			// Mock successful API response
			(SpApiRequest.makeRequest as jest.Mock).mockResolvedValue({
				data: {
					results: [
						{
							asin: 'B123456789',
							marketplaceId: 'ATVPDKIKX0DER',
							date: '2024-01-01',
							metrics: {
								sessions: 100,
								pageViews: 150,
								unitsOrdered: 5,
								orderedProductSales: 99.95,
								unitSessionPercentage: 5.0,
							},
						},
					],
				},
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('asin', 'B123456789');
			expect(result[0].json).toHaveProperty('sessions', 100);
			expect(result[0].json).toHaveProperty('pageViews', 150);
			expect(result[0].json).toHaveProperty('unitsOrdered', 5);
			expect(result[0].json).toHaveProperty('orderedProductSales', 99.95);
			expect(result[0].json).toHaveProperty('unitSessionPercentage', 5.0);
		});

		it('should handle legacy array format in metricsSelection', async () => {
			// Mock the execute functions with legacy array format
			mockExecuteFunctions.getNodeParameter
				.mockImplementation((paramName: string, index: number, defaultValue?: any) => {
					const params: Record<string, any> = {
						marketplaceIds: ['ATVPDKIKX0DER'],
						dateRangeType: 'relative',
						datePreset: 'last7Days',
						granularity: 'DAILY',
						timezone: 'UTC',
						metricsSelection: {
							// Legacy incorrect format (arrays directly)
							trafficMetrics: ['sessions'],
							salesMetrics: ['unitsOrdered'],
							conversionMetrics: ['unitSessionPercentage'],
						},
						filters: {},
						sortingLimiting: {},
						outputOptions: {},
						advancedOptions: { analyticsMode: 'dataKiosk' },
					};
					return params[paramName] || defaultValue;
				});

			// Mock successful API response
			(SpApiRequest.makeRequest as jest.Mock).mockResolvedValue({
				data: {
					results: [
						{
							asin: 'B123456789',
							marketplaceId: 'ATVPDKIKX0DER',
							date: '2024-01-01',
							metrics: {
								sessions: 100,
								unitsOrdered: 5,
								unitSessionPercentage: 5.0,
							},
						},
					],
				},
			});

			const result = await executeAnalyticsOperation.call(mockExecuteFunctions, 'salesAndTrafficByAsin', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('asin', 'B123456789');
			expect(result[0].json).toHaveProperty('sessions', 100);
			expect(result[0].json).toHaveProperty('unitsOrdered', 5);
			expect(result[0].json).toHaveProperty('unitSessionPercentage', 5.0);
		});
	});
});
