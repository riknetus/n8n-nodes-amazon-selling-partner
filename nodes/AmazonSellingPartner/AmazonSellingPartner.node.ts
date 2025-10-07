import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import { ordersOperations, ordersFields } from './descriptions/Orders.description';
import { executeOrdersOperation } from './operations/Orders.operations';
import { invoicesOperations, invoicesFields } from './descriptions/Invoices.description';
import { getGstReport, getVatInvoiceReport, getVatInvoicePdfLinks } from './operations/Invoices.operations';
import { shipmentsOperations, shipmentsFields } from './descriptions/Shipments.description';
import { executeShipmentsOperation } from './operations/Shipments.operations';
import { listingsOperations, listingsFields } from './descriptions/Listings.description';
import { executeListingsOperation } from './operations/Listings.operations';
import { financeOperations, financeFields } from './descriptions/Finance.description';
import { executeFinanceOperation } from './operations/Finance.operations';
import { analyticsOperations, analyticsFields } from './descriptions/Analytics.description';
import { executeAnalyticsOperation } from './operations/Analytics.operations';
import { priceFields, priceOperations } from './descriptions/Prices.description';
import { executePricesOperation } from './operations/Prices.operations';

export class AmazonSellingPartner implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Amazon Selling Partner',
		name: 'amazonSellingPartner',
		icon: 'file:amazonSpApi.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Amazon Selling Partner API',
		defaults: {
			name: 'Amazon Selling Partner',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'amazonSpApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.spApiEndpoint || $self["getSpApiEndpoint"]($credentials.awsRegion, $credentials.environment)}}',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'User-Agent': 'n8n-amazon-sp-api/1.0.0',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Orders',
						value: 'orders',
						description: 'Manage and retrieve order information',
					},
					{
						name: 'Invoices',
						value: 'invoices',
						description: 'Download GST and VAT invoice reports',
					},
					{
						name: 'Shipments',
						value: 'shipments',
						description: 'Confirm or update shipment information',
					},
					{
						name: 'Listings',
						value: 'listings',
						description: 'List and manage product listings (ASINs/SKUs)',
					},
					{
						name: 'Finance',
						value: 'finance',
						description: 'Retrieve financial events, wallet transactions, and payment data',
					},
					{
						name: 'Analytics',
						value: 'analytics',
						description: 'Get sales and traffic analytics data by ASIN using Data Kiosk or Reports API',
					},
					{
						name: "Prices",
						value: "prices",
						description: "Get all prices TEST NODE"
					}
				],
				default: 'orders',
			},
			...ordersOperations,
			...ordersFields,
			...invoicesOperations,
			...invoicesFields,
			...shipmentsOperations,
			...shipmentsFields,
			...listingsOperations,
			...listingsFields,
			...financeOperations,
			...financeFields,
			...analyticsOperations,
			...analyticsFields,
			...priceOperations,
			...priceFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		try {
			for (let i = 0; i < items.length; i++) {
				switch (resource) {
					case 'orders':
						const orderResults = await executeOrdersOperation.call(this, operation, i);
						returnData.push(...orderResults);
						break;
					case 'invoices':
						let invoiceResults: INodeExecutionData[] = [];
						switch (operation) {
							case 'getGstReport':
								invoiceResults = await getGstReport.call(this, i);
								break;
							case 'getVatInvoiceReport':
								invoiceResults = await getVatInvoiceReport.call(this, i);
								break;
							case 'getVatInvoicePdfLinks':
								invoiceResults = await getVatInvoicePdfLinks.call(this, i);
								break;
							default:
								throw new NodeOperationError(this.getNode(), `Unknown invoices operation: ${operation}`);
						}
						returnData.push(...invoiceResults);
						break;
					case 'shipments':
						const shipmentResults = await executeShipmentsOperation.call(this, operation, i);
						returnData.push(...shipmentResults);
						break;
					case 'listings':
						const listingResults = await executeListingsOperation.call(this, operation, i);
						returnData.push(...listingResults);
						break;
					case 'finance':
						const financeResults = await executeFinanceOperation.call(this, operation, i);
						returnData.push(...financeResults);
						break;
					case 'analytics':
						const analyticsResults = await executeAnalyticsOperation.call(this, operation, i);
						returnData.push(...analyticsResults);
						break;
					case "prices":
						const pricesResults = await executePricesOperation.call(this, operation, i);
						returnData.push(...pricesResults);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}
			}

			return [this.helpers.returnJsonArray(returnData)];
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			throw new NodeOperationError(this.getNode(), `Amazon SP-API error: ${errorMessage}`);
		}
	}

}