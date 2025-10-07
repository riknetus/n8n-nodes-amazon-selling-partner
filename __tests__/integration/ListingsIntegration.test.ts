import { IExecuteFunctions } from 'n8n-workflow';
import { executeListingsOperation } from '../../nodes/AmazonSellingPartner/operations/Listings.operations';

// These tests will run against the Amazon SP-API sandbox environment
// Make sure to set up proper credentials in your environment before running
// (e.g., in a .env file)

describe('Listings Integration Tests', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const mockNode = {
		id: 'test-node-id',
		name: 'Test Listings Node',
		type: 'amazonSellingPartner',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	// Use environment variables for credentials
	const sandboxCredentials = {
		sellerId: process.env.AMAZON_SELLER_ID,
		clientId: process.env.AMAZON_CLIENT_ID,
		clientSecret: process.env.AMAZON_CLIENT_SECRET,
		refreshToken: process.env.AMAZON_REFRESH_TOKEN,
		awsRegion: process.env.AMAZON_AWS_REGION || 'us-east-1',
		environment: 'sandbox',
	};

	// Skip tests if credentials are not provided
	const itif = (condition: any) => (condition ? it : it.skip);

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue(sandboxCredentials),
			getNode: jest.fn().mockReturnValue(mockNode),
		} as any;
	});

	describe('listAsins', () => {
		itif(process.env.AMAZON_SELLER_ID)(
			'should retrieve a list of listings from the sandbox',
			async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(paramName: string) => {
						switch (paramName) {
							case 'marketplaceIds':
								return ['ATVPDKIKX0DER']; // US marketplace
							case 'additionalOptions':
								return {
									pageSize: 5,
									returnAll: false,
								};
							default:
								return undefined;
						}
					},
				);

				const result = await executeListingsOperation.call(
					mockExecuteFunctions,
					'listAsins',
					0,
				);

				expect(Array.isArray(result)).toBe(true);

				if (result.length > 0) {
					console.log(`Successfully retrieved ${result.length} listings.`);
					const firstListing = result[0].json;
					expect(firstListing).toHaveProperty('asin');
					expect(firstListing).toHaveProperty('sku');
					expect(firstListing).toHaveProperty('marketplaceId', 'ATVPDKIKX0DER');
				} else {
					console.log(
						'Integration test passed, but no listings were returned. This may be expected if the sandbox catalog is empty.',
					);
				}
			},
			30000, // 30-second timeout for API call
		);
	});

	describe('getListingDetails', () => {
		itif(process.env.AMAZON_SELLER_ID)(
			'should retrieve details for a specific listing using its SKU',
			async () => {
				// Step 1: Get a listing to find a valid SKU
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(paramName: string) => {
						if (paramName === 'marketplaceIds') return ['ATVPDKIKX0DER'];
						if (paramName === 'additionalOptions')
							return { pageSize: 1, returnAll: false };
						return undefined;
					},
				);

				const listings = await executeListingsOperation.call(
					mockExecuteFunctions,
					'listAsins',
					0,
				);

				if (listings.length === 0) {
					console.log(
						'Skipping getListingDetails test because no listings were found to test with.',
					);
					return;
				}

				const testSku = listings[0].json.sku;
				console.log(`Found SKU to test: ${testSku}`);

				// Step 2: Get details for the found SKU
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(paramName: string) => {
						switch (paramName) {
							case 'identifierType':
								return 'sku';
							case 'sku':
								return testSku;
							case 'marketplaceIds':
								return ['ATVPDKIKX0DER'];
							case 'detailOptions':
								return { includedData: ['summaries'] };
							default:
								return undefined;
						}
					},
				);

				const result = await executeListingsOperation.call(
					mockExecuteFunctions,
					'getListingDetails',
					0,
				);

				expect(Array.isArray(result)).toBe(true);
				expect(result.length).toBeGreaterThan(0);

				const details = result[0].json;
				expect(details).toHaveProperty('sku', testSku);
				expect(details).toHaveProperty('asin');
				console.log(`Successfully retrieved details for SKU: ${details.sku}`);
			},
			45000, // 45-second timeout for two API calls
		);
	});
}); 