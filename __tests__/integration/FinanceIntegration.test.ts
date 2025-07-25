import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { AmazonSellingPartner } from '../../nodes/AmazonSellingPartner/AmazonSellingPartner.node';
import { DateTime } from 'luxon';

// Integration tests for Amazon SP-API Finance operations
// These tests run against the actual Amazon SP-API sandbox
// Requires valid test credentials to be set in environment variables

describe('Finance API Integration Tests', () => {
	let node: AmazonSellingPartner;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	
	const testCredentials = {
		lwaClientId: process.env.TEST_LWA_CLIENT_ID || 'test-client-id',
		lwaClientSecret: process.env.TEST_LWA_CLIENT_SECRET || 'test-client-secret',
		lwaRefreshToken: process.env.TEST_LWA_REFRESH_TOKEN || 'test-refresh-token',
		environment: 'sandbox' as const,
		awsRegion: 'us-east-1' as const,
	};

	beforeEach(() => {
		node = new AmazonSellingPartner();
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue(testCredentials),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			helpers: {
				returnJsonArray: jest.fn((data: any) => 
					data.map((item: any) => ({ json: item } as INodeExecutionData))
				),
			},
			getNode: jest.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Amazon Selling Partner Test',
				type: 'amazon-selling-partner',
			}),
		} as any;
	});

	// Skip integration tests if credentials are not provided
	const skipIfNoCredentials = () => {
		if (!process.env.TEST_LWA_CLIENT_ID || 
			!process.env.TEST_LWA_CLIENT_SECRET || 
			!process.env.TEST_LWA_REFRESH_TOKEN) {
			console.log('Skipping integration tests - credentials not provided');
			return true;
		}
		return false;
	};

	describe('List Financial Event Groups', () => {
		it('should retrieve financial event groups from sandbox', async () => {
			if (skipIfNoCredentials()) return;

			const startDate = DateTime.now().minus({ days: 30 }).toISO();
			const endDate = DateTime.now().toISO();

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEventGroups';
					case 'financialEventGroupStartedAfter':
						return startDate;
					case 'financialEventGroupStartedBefore':
						return endDate;
					case 'additionalOptions':
						return { maxResultsPerPage: 10, returnAll: false };
					default:
						return undefined;
				}
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);
			
			// Sandbox may not have data, but should return valid response structure
			if (result[0].length > 0) {
				const firstGroup = result[0][0].json;
				expect(firstGroup).toHaveProperty('FinancialEventGroupId');
				expect(firstGroup).toHaveProperty('ProcessingStatus');
				expect(firstGroup).toHaveProperty('FundTransferStatus');
			}
		}, 30000); // 30 second timeout for API calls

		it('should handle date range validation', async () => {
			if (skipIfNoCredentials()) return;

			// Test with invalid date range (too large)
			const startDate = DateTime.now().minus({ days: 400 }).toISO();
			const endDate = DateTime.now().toISO();

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEventGroups';
					case 'financialEventGroupStartedAfter':
						return startDate;
					case 'financialEventGroupStartedBefore':
						return endDate;
					case 'additionalOptions':
						return {};
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(mockExecuteFunctions))
				.rejects.toThrow(/Date range/);
		}, 30000);

		it('should handle pagination correctly', async () => {
			if (skipIfNoCredentials()) return;

			const startDate = DateTime.now().minus({ days: 30 }).toISO();

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEventGroups';
					case 'financialEventGroupStartedAfter':
						return startDate;
					case 'additionalOptions':
						return { maxResultsPerPage: 1, returnAll: true };
					default:
						return undefined;
				}
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);
			
			// Should handle pagination without errors
		}, 45000);
	});

	describe('List Financial Events', () => {
		it('should retrieve financial events from sandbox', async () => {
			if (skipIfNoCredentials()) return;

			const startDate = DateTime.now().minus({ days: 30 }).toISO();
			const endDate = DateTime.now().toISO();

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEvents';
					case 'postedAfter':
						return startDate;
					case 'postedBefore':
						return endDate;
					case 'additionalOptions':
						return { maxResultsPerPage: 50, returnAll: false };
					default:
						return undefined;
				}
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);
			
			// If no events found in sandbox, should return message
			if (result[0].length === 1 && result[0][0].json.message) {
				expect(result[0][0].json.message).toContain('No financial events found');
			} else if (result[0].length > 0) {
				// If events found, validate structure
				const firstEvent = result[0][0].json;
				expect(firstEvent).toHaveProperty('eventType');
				expect(firstEvent).toHaveProperty('eventData');
			}
		}, 30000);

		it('should validate maxResultsPerPage limits', async () => {
			if (skipIfNoCredentials()) return;

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEvents';
					case 'additionalOptions':
						return { maxResultsPerPage: 150 }; // Invalid - exceeds 100
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(mockExecuteFunctions))
				.rejects.toThrow(/MaxResultsPerPage must be between 1 and 100/);
		});
	});

	describe('List Financial Events by Group ID', () => {
		it('should handle non-existent group ID gracefully', async () => {
			if (skipIfNoCredentials()) return;

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEventsByGroupId';
					case 'eventGroupId':
						return 'non-existent-group-id';
					case 'additionalOptions':
						return { returnAll: false };
					default:
						return undefined;
				}
			});

			// Should handle gracefully - may return 404 or empty result
			try {
				const result = await node.execute.call(mockExecuteFunctions);
				expect(result).toBeDefined();
			} catch (error: any) {
				// 404 errors are expected for non-existent group IDs
				expect(error.message).toMatch(/404|not found|Group ID/i);
			}
		}, 30000);

		it('should validate required group ID parameter', async () => {
			if (skipIfNoCredentials()) return;

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEventsByGroupId';
					case 'eventGroupId':
						return '';
					case 'additionalOptions':
						return {};
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(mockExecuteFunctions))
				.rejects.toThrow(/Event Group ID is required/);
		});
	});

	describe('List Financial Events by Order ID', () => {
		it('should validate order ID format', async () => {
			if (skipIfNoCredentials()) return;

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEventsByOrderId';
					case 'orderId':
						return 'invalid-order-id-format';
					case 'additionalOptions':
						return {};
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(mockExecuteFunctions))
				.rejects.toThrow(/Invalid Order ID format/);
		});

		it('should handle non-existent order ID gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Valid format but non-existent order
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEventsByOrderId';
					case 'orderId':
						return '123-4567890-1234567';
					case 'additionalOptions':
						return { returnAll: false };
					default:
						return undefined;
				}
			});

			try {
				const result = await node.execute.call(mockExecuteFunctions);
				expect(result).toBeDefined();
				expect(Array.isArray(result[0])).toBe(true);
			} catch (error: any) {
				// 404 errors are expected for non-existent orders
				expect(error.message).toMatch(/404|not found|Order ID/i);
			}
		}, 30000);
	});

	describe('Error Handling and Rate Limiting', () => {
		it('should handle rate limiting errors properly', async () => {
			if (skipIfNoCredentials()) return;

			// Make multiple rapid requests to potentially trigger rate limiting
			const promises = Array(5).fill(null).map(async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					switch (paramName) {
						case 'resource':
							return 'finance';
						case 'operation':
							return 'listFinancialEvents';
						case 'postedAfter':
							return DateTime.now().minus({ days: 7 }).toISO();
						case 'additionalOptions':
							return { maxResultsPerPage: 1, returnAll: false };
						default:
							return undefined;
					}
				});

				return node.execute.call(mockExecuteFunctions);
			});

			// Should handle rate limiting gracefully
			try {
				await Promise.all(promises);
			} catch (error: any) {
				// Rate limiting errors should be properly handled
				if (error.message.includes('rate limit') || error.message.includes('429')) {
					expect(error.message).toMatch(/rate limit|429|throttl/i);
				} else {
					throw error; // Re-throw non-rate-limit errors
				}
			}
		}, 60000);

		it('should handle authentication errors', async () => {
			// Test with invalid credentials
			const invalidCredentials = {
				...testCredentials,
				lwaClientId: 'invalid-client-id',
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(invalidCredentials);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEvents';
					case 'additionalOptions':
						return {};
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(mockExecuteFunctions))
				.rejects.toThrow(/401|unauthorized|authentication/i);
		}, 30000);
	});

	describe('Regional Endpoint Testing', () => {
		it('should work with different AWS regions', async () => {
			if (skipIfNoCredentials()) return;

			// Test with EU region
			const euCredentials = {
				...testCredentials,
				awsRegion: 'eu-west-1' as const,
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(euCredentials);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEvents';
					case 'postedAfter':
						return DateTime.now().minus({ days: 7 }).toISO();
					case 'additionalOptions':
						return { maxResultsPerPage: 10, returnAll: false };
					default:
						return undefined;
				}
			});

			// Should work without region-specific errors
			const result = await node.execute.call(mockExecuteFunctions);
			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);
		}, 30000);
	});

	describe('Data Validation and Transformation', () => {
		it('should properly transform financial event data', async () => {
			if (skipIfNoCredentials()) return;

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listFinancialEvents';
					case 'postedAfter':
						return DateTime.now().minus({ days: 30 }).toISO();
					case 'additionalOptions':
						return { maxResultsPerPage: 50, returnAll: false };
					default:
						return undefined;
				}
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);

			// Validate transformation of event data
			if (result[0].length > 0 && !result[0][0].json.message) {
				result[0].forEach((item: INodeExecutionData) => {
					expect(item.json).toHaveProperty('eventType');
					expect(item.json).toHaveProperty('eventData');
					
					// Ensure event type is properly set
					expect(typeof item.json.eventType).toBe('string');
					expect((item.json.eventType as string).length).toBeGreaterThan(0);
					
					// Ensure event data is an object
					expect(typeof item.json.eventData).toBe('object');
				});
			}
		}, 30000);
	});

	describe('List Transactions (Finances v2024-06-19)', () => {
		it('should retrieve transactions from sandbox', async () => {
			if (skipIfNoCredentials()) return;

			const startDate = DateTime.now().minus({ days: 30 }).toISO();
			const endDate = DateTime.now().toISO();

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listTransactions';
					case 'postedAfter':
						return startDate;
					case 'postedBefore':
						return endDate;
					case 'marketplaceId':
						return 'ATVPDKIKX0DER'; // US marketplace
					case 'additionalOptions':
						return { maxResultsPerPage: 50, returnAll: false };
					default:
						return undefined;
				}
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);
			
			// If no transactions found in sandbox, should return message
			if (result[0].length === 1 && result[0][0].json.message) {
				expect(result[0][0].json.message).toContain('No transactions found');
			} else if (result[0].length > 0) {
				// If transactions found, validate structure
				const firstTransaction = result[0][0].json;
				expect(firstTransaction).toBeDefined();
				expect(typeof firstTransaction).toBe('object');
			}
		}, 30000);

		it('should validate required postedAfter parameter', async () => {
			if (skipIfNoCredentials()) return;

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listTransactions';
					case 'postedAfter':
						return ''; // Empty - should trigger validation error
					case 'additionalOptions':
						return {};
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(mockExecuteFunctions))
				.rejects.toThrow(/Posted After date is required/);
		});

		it('should handle maxResultsPerPage validation', async () => {
			if (skipIfNoCredentials()) return;

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'finance';
					case 'operation':
						return 'listTransactions';
					case 'postedAfter':
						return DateTime.now().minus({ days: 7 }).toISO();
					case 'additionalOptions':
						return { maxResultsPerPage: 150 }; // Invalid - exceeds 100
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(mockExecuteFunctions))
				.rejects.toThrow(/MaxResultsPerPage must be between 1 and 100/);
		});
	});
}); 