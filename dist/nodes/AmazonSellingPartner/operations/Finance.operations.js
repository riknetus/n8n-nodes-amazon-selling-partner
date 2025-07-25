"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeFinanceOperation = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
const SecurityValidator_1 = require("../core/SecurityValidator");
async function executeFinanceOperation(operation, itemIndex) {
    const returnData = [];
    const nodeId = this.getNode().id;
    if (operation === 'listFinancialEventGroups') {
        // Get parameters
        const financialEventGroupStartedAfter = this.getNodeParameter('financialEventGroupStartedAfter', itemIndex);
        const financialEventGroupStartedBefore = this.getNodeParameter('financialEventGroupStartedBefore', itemIndex);
        const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {});
        // Security Validation for date range
        if (financialEventGroupStartedAfter && financialEventGroupStartedBefore) {
            const dateValidation = SecurityValidator_1.securityValidator.validateDateRange(financialEventGroupStartedAfter, financialEventGroupStartedBefore, nodeId);
            if (!dateValidation.isValid) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), dateValidation.errors.join(', '));
            }
        }
        // Build query parameters
        const queryParams = {};
        if (financialEventGroupStartedAfter) {
            queryParams.FinancialEventGroupStartedAfter = financialEventGroupStartedAfter;
        }
        if (financialEventGroupStartedBefore) {
            queryParams.FinancialEventGroupStartedBefore = financialEventGroupStartedBefore;
        }
        if (additionalOptions.maxResultsPerPage) {
            const maxResults = additionalOptions.maxResultsPerPage;
            if (maxResults < 1 || maxResults > 100) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'MaxResultsPerPage must be between 1 and 100');
            }
            queryParams.MaxResultsPerPage = maxResults;
        }
        const returnAll = additionalOptions.returnAll !== false;
        let nextToken;
        let allEventGroups = [];
        // Handle pagination
        do {
            if (nextToken) {
                queryParams.NextToken = nextToken;
            }
            try {
                const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                    method: 'GET',
                    endpoint: '/finances/v0/financialEventGroups',
                    query: queryParams,
                });
                const eventGroups = response.data.payload.FinancialEventGroupList || [];
                allEventGroups = allEventGroups.concat(eventGroups);
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
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to retrieve financial event groups: ${errorMessage}`);
            }
        } while (nextToken && returnAll);
        // Convert event groups to n8n items
        for (const eventGroup of allEventGroups) {
            returnData.push({
                json: eventGroup,
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
        // If no event groups found, return empty result with metadata
        if (allEventGroups.length === 0) {
            returnData.push({
                json: {
                    message: 'No financial event groups found for the specified criteria',
                    searchCriteria: {
                        financialEventGroupStartedAfter,
                        financialEventGroupStartedBefore,
                        ...additionalOptions,
                    },
                },
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
    }
    if (operation === 'listFinancialEventsByGroupId') {
        // Get parameters
        const eventGroupId = this.getNodeParameter('eventGroupId', itemIndex);
        const postedAfter = this.getNodeParameter('postedAfter', itemIndex);
        const postedBefore = this.getNodeParameter('postedBefore', itemIndex);
        const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {});
        // Validate eventGroupId
        if (!eventGroupId) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Event Group ID is required');
        }
        // Security Validation for date range
        if (postedAfter && postedBefore) {
            const dateValidation = SecurityValidator_1.securityValidator.validateDateRange(postedAfter, postedBefore, nodeId);
            if (!dateValidation.isValid) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), dateValidation.errors.join(', '));
            }
        }
        // Build query parameters
        const queryParams = {};
        if (postedAfter) {
            queryParams.PostedAfter = postedAfter;
        }
        if (postedBefore) {
            queryParams.PostedBefore = postedBefore;
        }
        if (additionalOptions.maxResultsPerPage) {
            const maxResults = additionalOptions.maxResultsPerPage;
            if (maxResults < 1 || maxResults > 100) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'MaxResultsPerPage must be between 1 and 100');
            }
            queryParams.MaxResultsPerPage = maxResults;
        }
        const returnAll = additionalOptions.returnAll !== false;
        let nextToken;
        let allFinancialEvents = [];
        // Handle pagination
        do {
            if (nextToken) {
                queryParams.NextToken = nextToken;
            }
            try {
                const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                    method: 'GET',
                    endpoint: `/finances/v0/financialEventGroups/${eventGroupId}/financialEvents`,
                    query: queryParams,
                });
                // Extract all financial events from the response
                const financialEvents = response.data.payload.FinancialEvents || {};
                const events = extractFinancialEvents(financialEvents);
                allFinancialEvents = allFinancialEvents.concat(events);
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
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to retrieve financial events for group: ${errorMessage}`);
            }
        } while (nextToken && returnAll);
        // Convert events to n8n items
        for (const event of allFinancialEvents) {
            returnData.push({
                json: { ...event, eventGroupId },
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
        // If no events found, return empty result with metadata
        if (allFinancialEvents.length === 0) {
            returnData.push({
                json: {
                    message: 'No financial events found for the specified group',
                    eventGroupId,
                    searchCriteria: {
                        postedAfter,
                        postedBefore,
                        ...additionalOptions,
                    },
                },
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
    }
    if (operation === 'listFinancialEventsByOrderId') {
        // Get parameters
        const orderId = this.getNodeParameter('orderId', itemIndex);
        const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {});
        // Validate Order ID format
        if (!orderId || !/^\d{3}-\d{7}-\d{7}$/.test(orderId)) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid Order ID format. Expected format: 3-7-7');
        }
        // Build query parameters
        const queryParams = {};
        if (additionalOptions.maxResultsPerPage) {
            const maxResults = additionalOptions.maxResultsPerPage;
            if (maxResults < 1 || maxResults > 100) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'MaxResultsPerPage must be between 1 and 100');
            }
            queryParams.MaxResultsPerPage = maxResults;
        }
        const returnAll = additionalOptions.returnAll !== false;
        let nextToken;
        let allFinancialEvents = [];
        // Handle pagination
        do {
            if (nextToken) {
                queryParams.NextToken = nextToken;
            }
            try {
                const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                    method: 'GET',
                    endpoint: `/finances/v0/orders/${orderId}/financialEvents`,
                    query: queryParams,
                });
                // Extract all financial events from the response
                const financialEvents = response.data.payload.FinancialEvents || {};
                const events = extractFinancialEvents(financialEvents);
                allFinancialEvents = allFinancialEvents.concat(events);
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
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to retrieve financial events for order: ${errorMessage}`);
            }
        } while (nextToken && returnAll);
        // Convert events to n8n items
        for (const event of allFinancialEvents) {
            returnData.push({
                json: { ...event, orderId },
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
        // If no events found, return empty result with metadata
        if (allFinancialEvents.length === 0) {
            returnData.push({
                json: {
                    message: 'No financial events found for the specified order',
                    orderId,
                },
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
    }
    if (operation === 'listFinancialEvents') {
        // Get parameters
        const postedAfter = this.getNodeParameter('postedAfter', itemIndex);
        const postedBefore = this.getNodeParameter('postedBefore', itemIndex);
        const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {});
        // Security Validation for date range
        if (postedAfter && postedBefore) {
            const dateValidation = SecurityValidator_1.securityValidator.validateDateRange(postedAfter, postedBefore, nodeId);
            if (!dateValidation.isValid) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), dateValidation.errors.join(', '));
            }
        }
        // Build query parameters
        const queryParams = {};
        if (postedAfter) {
            queryParams.PostedAfter = postedAfter;
        }
        if (postedBefore) {
            queryParams.PostedBefore = postedBefore;
        }
        if (additionalOptions.maxResultsPerPage) {
            const maxResults = additionalOptions.maxResultsPerPage;
            if (maxResults < 1 || maxResults > 100) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'MaxResultsPerPage must be between 1 and 100');
            }
            queryParams.MaxResultsPerPage = maxResults;
        }
        const returnAll = additionalOptions.returnAll !== false;
        let nextToken;
        let allFinancialEvents = [];
        // Handle pagination
        do {
            if (nextToken) {
                queryParams.NextToken = nextToken;
            }
            try {
                const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                    method: 'GET',
                    endpoint: '/finances/v0/financialEvents',
                    query: queryParams,
                });
                // Extract all financial events from the response
                const financialEvents = response.data.payload.FinancialEvents || {};
                const events = extractFinancialEvents(financialEvents);
                allFinancialEvents = allFinancialEvents.concat(events);
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
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to retrieve financial events: ${errorMessage}`);
            }
        } while (nextToken && returnAll);
        // Convert events to n8n items
        for (const event of allFinancialEvents) {
            returnData.push({
                json: event,
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
        // If no events found, return empty result with metadata
        if (allFinancialEvents.length === 0) {
            returnData.push({
                json: {
                    message: 'No financial events found for the specified criteria',
                    searchCriteria: {
                        postedAfter,
                        postedBefore,
                        ...additionalOptions,
                    },
                },
                pairedItem: {
                    item: itemIndex,
                },
            });
        }
    }
    return returnData;
}
exports.executeFinanceOperation = executeFinanceOperation;
// Helper method to extract financial events from the complex response structure
function extractFinancialEvents(financialEvents) {
    const events = [];
    // Extract events from all possible event lists
    const eventLists = [
        'ShipmentEventList',
        'RefundEventList',
        'GuaranteeClaimEventList',
        'ChargebackEventList',
        'PayWithAmazonEventList',
        'ServiceProviderCreditEventList',
        'RetrochargeEventList',
        'RentalTransactionEventList',
        'ProductAdsPaymentEventList',
        'ServiceFeeEventList',
        'DebtRecoveryEventList',
        'LoanServicingEventList',
        'AdjustmentEventList',
        'SAFETReimbursementEventList',
        'SellerReviewEnrollmentPaymentEventList',
        'FBALiquidationEventList',
        'CouponPaymentEventList',
        'ImagingServicesFeeEventList',
        'NetworkComminglingTransactionEventList',
        'AffordabilityExpenseEventList',
        'AffordabilityExpenseReversalEventList',
        'TrialShipmentEventList',
        'ShipmentSettleEventList',
        'TaxWithholdingEventList',
        'RemovalShipmentEventList',
        'RemovalShipmentAdjustmentEventList',
    ];
    for (const eventListName of eventLists) {
        const eventList = financialEvents[eventListName];
        if (eventList && Array.isArray(eventList)) {
            for (const event of eventList) {
                events.push({
                    ...event,
                    eventType: eventListName.replace('EventList', ''),
                    eventListType: eventListName,
                });
            }
        }
    }
    return events;
}
