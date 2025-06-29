"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeOrdersOperation = executeOrdersOperation;
const n8n_workflow_1 = require("n8n-workflow");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
async function executeOrdersOperation(operation, itemIndex) {
    const returnData = [];
    if (operation === 'getOrders') {
        // Get parameters
        const marketplaceIds = this.getNodeParameter('marketplaceIds', itemIndex);
        const createdAfter = this.getNodeParameter('createdAfter', itemIndex);
        const createdBefore = this.getNodeParameter('createdBefore', itemIndex);
        const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {});
        // Validate date range
        const afterDate = new Date(createdAfter);
        const beforeDate = new Date(createdBefore);
        const daysDiff = Math.ceil((beforeDate.getTime() - afterDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Date range cannot exceed 30 days', {
                description: 'Amazon SP-API limits order queries to a maximum of 30 days',
            });
        }
        if (afterDate >= beforeDate) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Created After date must be before Created Before date');
        }
        // Build query parameters
        const queryParams = {
            MarketplaceIds: marketplaceIds,
            CreatedAfter: createdAfter,
            CreatedBefore: createdBefore,
        };
        // Add optional parameters
        if (additionalOptions.orderStatuses && additionalOptions.orderStatuses.length > 0) {
            queryParams.OrderStatuses = additionalOptions.orderStatuses;
        }
        if (additionalOptions.fulfillmentChannels && additionalOptions.fulfillmentChannels.length > 0) {
            queryParams.FulfillmentChannels = additionalOptions.fulfillmentChannels;
        }
        if (additionalOptions.paymentMethods && additionalOptions.paymentMethods.length > 0) {
            queryParams.PaymentMethods = additionalOptions.paymentMethods;
        }
        if (additionalOptions.maxResultsPerPage) {
            if (additionalOptions.maxResultsPerPage < 1 || additionalOptions.maxResultsPerPage > 100) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'MaxResultsPerPage must be between 1 and 100');
            }
            queryParams.MaxResultsPerPage = additionalOptions.maxResultsPerPage;
        }
        const returnAll = additionalOptions.returnAll !== false;
        let nextToken;
        let allOrders = [];
        // Handle pagination
        do {
            if (nextToken) {
                queryParams.NextToken = nextToken;
            }
            try {
                const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                    method: 'GET',
                    endpoint: '/orders/v0/orders',
                    query: queryParams,
                });
                const orders = response.data.payload.Orders || [];
                allOrders = allOrders.concat(orders);
                nextToken = response.data.payload.NextToken;
                // If not returning all results, break after first page
                if (!returnAll) {
                    break;
                }
            }
            catch (error) {
                if (error instanceof n8n_workflow_1.NodeOperationError) {
                    throw error;
                }
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to retrieve orders: ${errorMessage}`);
            }
        } while (nextToken && returnAll);
        // Convert orders to n8n items
        for (const order of allOrders) {
            returnData.push({
                json: order, // Cast to any to satisfy IDataObject requirement
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
        // If no orders found, return empty result with metadata
        if (allOrders.length === 0) {
            returnData.push({
                json: {
                    message: 'No orders found for the specified criteria',
                    searchCriteria: {
                        marketplaceIds,
                        createdAfter,
                        createdBefore,
                        ...additionalOptions,
                    },
                },
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
    }
    // --- Get Order Details ---
    if (operation === 'getOrder') {
        const orderId = this.getNodeParameter('orderId', itemIndex);
        // Security validation (reuse SecurityValidator if available)
        // Simple regex: 3-7-7 format (e.g., 123-1234567-1234567)
        if (!/^\d{3}-\d{7}-\d{7}$/.test(orderId)) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid Order ID format. Must be 3-7-7 (e.g., 123-1234567-1234567)');
        }
        try {
            const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                method: 'GET',
                endpoint: `/orders/v0/orders/${orderId}`,
            });
            returnData.push({
                json: response.data.payload,
                pairedItem: { item: itemIndex },
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to retrieve order details: ${errorMessage}`);
        }
    }
    // --- Get Order Items ---
    if (operation === 'getOrderItems') {
        const orderId = this.getNodeParameter('orderId', itemIndex);
        const returnAll = this.getNodeParameter('returnAll', itemIndex, true);
        if (!/^\d{3}-\d{7}-\d{7}$/.test(orderId)) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid Order ID format. Must be 3-7-7 (e.g., 123-1234567-1234567)');
        }
        let nextToken;
        let allItems = [];
        let pageCount = 0;
        const maxPages = 30; // Safety guard for runaway pagination
        do {
            const query = {};
            if (nextToken)
                query.NextToken = nextToken;
            try {
                const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                    method: 'GET',
                    endpoint: `/orders/v0/orders/${orderId}/orderItems`,
                    query,
                });
                const items = response.data.payload.OrderItems || [];
                allItems = allItems.concat(items);
                nextToken = response.data.payload.NextToken;
                pageCount++;
                if (!returnAll || !nextToken || pageCount >= maxPages) {
                    break;
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to retrieve order items: ${errorMessage}`);
            }
        } while (nextToken);
        for (const item of allItems) {
            returnData.push({
                json: item,
                pairedItem: { item: itemIndex },
            });
        }
        if (allItems.length === 0) {
            returnData.push({
                json: {
                    message: 'No order items found for the specified order',
                    orderId,
                },
                pairedItem: { item: itemIndex },
            });
        }
    }
    return returnData;
}
