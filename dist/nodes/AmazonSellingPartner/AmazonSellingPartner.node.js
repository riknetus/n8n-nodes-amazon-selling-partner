"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonSellingPartner = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const Orders_description_1 = require("./descriptions/Orders.description");
const Orders_operations_1 = require("./operations/Orders.operations");
const Invoices_description_1 = require("./descriptions/Invoices.description");
const Invoices_operations_1 = require("./operations/Invoices.operations");
const Shipments_description_1 = require("./descriptions/Shipments.description");
const Shipments_operations_1 = require("./operations/Shipments.operations");
const Listings_description_1 = require("./descriptions/Listings.description");
const Listings_operations_1 = require("./operations/Listings.operations");
class AmazonSellingPartner {
    description = {
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
        inputs: ["main" /* NodeConnectionType.Main */],
        outputs: ["main" /* NodeConnectionType.Main */],
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
                ],
                default: 'orders',
            },
            ...Orders_description_1.ordersOperations,
            ...Orders_description_1.ordersFields,
            ...Invoices_description_1.invoicesOperations,
            ...Invoices_description_1.invoicesFields,
            ...Shipments_description_1.shipmentsOperations,
            ...Shipments_description_1.shipmentsFields,
            ...Listings_description_1.listingsOperations,
            ...Listings_description_1.listingsFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        try {
            for (let i = 0; i < items.length; i++) {
                switch (resource) {
                    case 'orders':
                        const orderResults = await Orders_operations_1.executeOrdersOperation.call(this, operation, i);
                        returnData.push(...orderResults);
                        break;
                    case 'invoices':
                        let invoiceResults = [];
                        switch (operation) {
                            case 'getGstReport':
                                invoiceResults = await Invoices_operations_1.getGstReport.call(this, i);
                                break;
                            case 'getVatInvoiceReport':
                                invoiceResults = await Invoices_operations_1.getVatInvoiceReport.call(this, i);
                                break;
                            case 'getVatInvoicePdfLinks':
                                invoiceResults = await Invoices_operations_1.getVatInvoicePdfLinks.call(this, i);
                                break;
                            default:
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown invoices operation: ${operation}`);
                        }
                        returnData.push(...invoiceResults);
                        break;
                    case 'shipments':
                        const shipmentResults = await Shipments_operations_1.executeShipmentsOperation.call(this, operation, i);
                        returnData.push(...shipmentResults);
                        break;
                    case 'listings':
                        const listingResults = await Listings_operations_1.executeListingsOperation.call(this, operation, i);
                        returnData.push(...listingResults);
                        break;
                    default:
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
                }
            }
            return [this.helpers.returnJsonArray(returnData)];
        }
        catch (error) {
            if (error instanceof n8n_workflow_1.NodeOperationError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Amazon SP-API error: ${errorMessage}`);
        }
    }
}
exports.AmazonSellingPartner = AmazonSellingPartner;
