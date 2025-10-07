import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { SpApiRequest } from '../../helpers/SpApiRequest';
import { executeShipmentsOperation } from '../Shipments.operations';
import { securityValidator } from '../../core/SecurityValidator';

jest.mock('../../helpers/SpApiRequest');
jest.mock('../../core/SecurityValidator');

const mockedSpApiRequest = SpApiRequest as jest.Mocked<typeof SpApiRequest>;
const mockedSecurityValidator = securityValidator as jest.Mocked<typeof securityValidator>;

describe('Shipments.operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getExecutionId: jest.fn().mockReturnValue('test-exec-id'),
			getNode: jest.fn().mockReturnValue({ id: 'test-node-id' }),
			helpers: {
				returnJsonArray: jest.fn((data) => [{ json: data } as INodeExecutionData]),
			},
		} as any;

		mockedSecurityValidator.validateMarketplaceIds.mockReturnValue({
			isValid: true,
			errors: [],
		});
	});

	describe('confirmShipment', () => {
		it('should build correct payload and call the correct endpoint', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('111-2222222-3333333') // orderId
				.mockReturnValueOnce('ATVPDKIKX0DER') // marketplaceId
				.mockReturnValueOnce('UPS') // carrierCode
				.mockReturnValueOnce('1Z9999W99999999999') // trackingNumber
				.mockReturnValueOnce('2024-07-30T12:00:00Z') // shipDate
				.mockReturnValueOnce([
					{ orderItemId: 'item1', quantity: 1 },
					{ orderItemId: 'item2', quantity: 2 },
				]); // items

			mockedSpApiRequest.makeRequest.mockResolvedValue({
				data: { status: 'Success' },
				headers: {},
				status: 200,
			});

			await executeShipmentsOperation.call(mockExecuteFunctions, 'confirmShipment', 0);

			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.objectContaining({
					method: 'POST',
					endpoint: '/orders/v0/orders/111-2222222-3333333/shipmentConfirmation',
					body: {
						marketplaceId: 'ATVPDKIKX0DER',
						packageDetail: {
							packageReferenceId: 'n8n-test-exec-id-0',
							carrierCode: 'UPS',
							trackingNumber: '1Z9999W99999999999',
							shipDate: '2024-07-30T12:00:00Z',
							items: [
								{ orderItemId: 'item1', quantity: 1 },
								{ orderItemId: 'item2', quantity: 2 },
							],
						},
					},
				}),
			);
		});

		it('should throw NodeOperationError for invalid Order ID format', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('INVALID-ORDER-ID');

			await expect(
				executeShipmentsOperation.call(mockExecuteFunctions, 'confirmShipment', 0),
			).rejects.toThrow(NodeOperationError);

			await expect(
				executeShipmentsOperation.call(mockExecuteFunctions, 'confirmShipment', 0),
			).rejects.toThrow('Invalid Order ID format. Must be in 3-7-7 format.');
		});
	});

	describe('updateShipmentStatus', () => {
		it('should build correct payload and call the correct endpoint', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('111-2222222-3333333') // orderId
				.mockReturnValueOnce('A1F83G8C2ARO7P') // marketplaceId
				.mockReturnValueOnce('Delivered'); // status

			mockedSpApiRequest.makeRequest.mockResolvedValue({
				data: { status: 'Success' },
				headers: {},
				status: 200,
			});

			await executeShipmentsOperation.call(mockExecuteFunctions, 'updateShipmentStatus', 0);

			expect(mockedSpApiRequest.makeRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.objectContaining({
					method: 'POST',
					endpoint: '/orders/v0/orders/111-2222222-3333333/shipmentStatus',
					body: {
						marketplaceId: 'A1F83G8C2ARO7P',
						shipmentStatus: 'Delivered',
					},
				}),
			);
		});

		it('should throw an error for an unknown operation', async () => {
			await expect(
				executeShipmentsOperation.call(mockExecuteFunctions, 'unknownOperation', 0),
			).rejects.toThrow('Unknown shipments operation: unknownOperation');
		});
	});
}); 