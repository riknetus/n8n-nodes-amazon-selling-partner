"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeShipmentsOperation = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
const SecurityValidator_1 = require("../core/SecurityValidator");
async function executeShipmentsOperation(operation, itemIndex) {
    switch (operation) {
        case 'confirmShipment':
            return await confirmShipment.call(this, itemIndex);
        case 'updateShipmentStatus':
            return await updateShipmentStatus.call(this, itemIndex);
        default:
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown shipments operation: ${operation}`);
    }
}
exports.executeShipmentsOperation = executeShipmentsOperation;
async function confirmShipment(index) {
    const orderId = this.getNodeParameter('orderId', index);
    const marketplaceId = this.getNodeParameter('marketplaceId', index);
    const carrierCode = this.getNodeParameter('carrierCode', index);
    const trackingNumber = this.getNodeParameter('trackingNumber', index);
    const shipDate = this.getNodeParameter('shipDate', index, new Date().toISOString());
    const items = this.getNodeParameter('itemsUi.orderItems', index);
    // Validation
    const validationResult = SecurityValidator_1.securityValidator.validateMarketplaceIds([marketplaceId], this.getNode().id);
    if (!validationResult.isValid) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Invalid Marketplace ID: ${validationResult.errors[0]}`);
    }
    if (!/^\d{3}-\d{7}-\d{7}$/.test(orderId)) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid Order ID format. Must be in 3-7-7 format.');
    }
    const body = {
        marketplaceId,
        packageDetail: {
            packageReferenceId: `n8n-${this.getExecutionId()}-${index}`,
            carrierCode,
            trackingNumber,
            shipDate,
            items: items.map((it) => ({ orderItemId: it.orderItemId, quantity: it.quantity })),
        },
    };
    const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'POST',
        endpoint: `/orders/v0/orders/${orderId}/shipmentConfirmation`,
        body,
    });
    return this.helpers.returnJsonArray({
        orderId,
        marketplaceId,
        payload: response.data,
    });
}
async function updateShipmentStatus(index) {
    const orderId = this.getNodeParameter('orderId', index);
    const marketplaceId = this.getNodeParameter('marketplaceId', index);
    const status = this.getNodeParameter('status', index);
    // Validation
    const validationResult = SecurityValidator_1.securityValidator.validateMarketplaceIds([marketplaceId], this.getNode().id);
    if (!validationResult.isValid) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Invalid Marketplace ID: ${validationResult.errors[0]}`);
    }
    if (!/^\d{3}-\d{7}-\d{7}$/.test(orderId)) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid Order ID format. Must be in 3-7-7 format.');
    }
    const body = {
        marketplaceId,
        shipmentStatus: status,
    };
    const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'POST',
        endpoint: `/orders/v0/orders/${orderId}/shipmentStatus`,
        body,
    });
    return this.helpers.returnJsonArray({
        orderId,
        marketplaceId,
        payload: response.data,
    });
}
