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
const Finance_description_1 = require("./descriptions/Finance.description");
const Finance_operations_1 = require("./operations/Finance.operations");
const Analytics_description_1 = require("./descriptions/Analytics.description");
const Analytics_operations_1 = require("./operations/Analytics.operations");
const DataKiosk_description_1 = require("./descriptions/DataKiosk.description");
const DataKiosk_operations_1 = require("./operations/DataKiosk.operations");
const Reports_description_1 = require("./descriptions/Reports.description");
const Reports_operations_1 = require("./operations/Reports.operations");
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
                    {
                        name: 'Finance',
                        value: 'finance',
                        description: 'Retrieve financial events, wallet transactions, and payment data',
                    },
                    {
                        name: 'Data Kiosk',
                        value: 'dataKiosk',
                        description: 'Submit GraphQL queries and download results via Data Kiosk',
                    },
                    {
                        name: 'Reports',
                        value: 'reports',
                        description: 'Generate and download SP-API business and returns reports',
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
            ...Finance_description_1.financeOperations,
            ...Finance_description_1.financeFields,
            ...Analytics_description_1.analyticsOperations,
            ...Analytics_description_1.analyticsFields,
            ...DataKiosk_description_1.dataKioskOperations,
            ...DataKiosk_description_1.dataKioskFields,
            ...Reports_description_1.reportsOperations,
            ...Reports_description_1.reportsFields,
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
                    case 'finance':
                        const financeResults = await Finance_operations_1.executeFinanceOperation.call(this, operation, i);
                        returnData.push(...financeResults);
                        break;
                    case 'analytics':
                        // Analytics now only supports validateAccess operation
                        const analyticsResults = await Analytics_operations_1.executeAnalyticsOperation.call(this, operation, i);
                        returnData.push(...analyticsResults);
                        break;
                    case 'dataKiosk':
                        const dataKioskResults = await DataKiosk_operations_1.executeDataKioskOperation.call(this, operation, i);
                        returnData.push(...dataKioskResults);
                        break;
                    case 'reports':
                        const reportsResults = await Reports_operations_1.executeReportsOperation.call(this, operation, i);
                        returnData.push(...reportsResults);
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
