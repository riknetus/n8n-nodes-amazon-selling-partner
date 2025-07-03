"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENDPOINT_TO_GROUP = exports.RATE_LIMIT_GROUPS = void 0;
exports.getEndpointGroup = getEndpointGroup;
exports.getRateLimitConfig = getRateLimitConfig;
exports.validateRateLimitConfig = validateRateLimitConfig;
// Rate limit groups based on Amazon SP-API documentation
exports.RATE_LIMIT_GROUPS = {
    // Orders API - Detail operations (getOrder, getOrderItems, getOrderAddress, etc.)
    'orders-detail': {
        rate: 0.5,
        burst: 30,
        description: 'Order detail operations: getOrder, getOrderItems, getOrderAddress, getOrderBuyerInfo, etc.'
    },
    // Orders API - List operations (getOrders)
    'orders-list': {
        rate: 0.0167, // 1 request per 60 seconds
        burst: 20,
        description: 'Order list operations: getOrders'
    },
    // Orders API - Update operations
    'orders-update': {
        rate: 2.0,
        burst: 10,
        description: 'Order update operations: confirmShipment, updateShipmentStatus'
    },
    // Reports API - All operations
    'reports': {
        rate: 0.0167, // 1 request per 60 seconds
        burst: 15,
        description: 'Reports API operations: createReport, getReport, getReportDocument'
    },
    // Default fallback for unclassified endpoints
    'default': {
        rate: 0.5,
        burst: 10,
        description: 'Default rate limit for unclassified endpoints'
    }
};
// Endpoint pattern to group mapping
exports.ENDPOINT_TO_GROUP = [
    // Orders API patterns
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/orderItems/, group: 'orders-detail' },
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/orderAddress/, group: 'orders-detail' },
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/buyerInfo/, group: 'orders-detail' },
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/orderItemsBuyerInfo/, group: 'orders-detail' },
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/regulatedInfo/, group: 'orders-detail' },
    { pattern: /^\/orders\/v0\/orders\/[^\/]+$/, group: 'orders-detail' }, // getOrder
    { pattern: /^\/orders\/v0\/orders\/?(\?.*)?$/, group: 'orders-list' }, // getOrders
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/shipment/, group: 'orders-update' },
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/shipmentConfirmation$/, group: 'orders-update' },
    { pattern: /^\/orders\/v0\/orders\/[^\/]+\/shipmentStatus$/, group: 'orders-update' },
    // Reports API patterns
    { pattern: /^\/reports\/2021-06-30\/reports\/?(\?.*)?$/, group: 'reports' }, // createReport, getReports
    { pattern: /^\/reports\/2021-06-30\/reports\/[^\/]+$/, group: 'reports' }, // getReport
    { pattern: /^\/reports\/2021-06-30\/documents\/[^\/]+$/, group: 'reports' }, // getReportDocument
    // Add more patterns as needed for other APIs
];
/**
 * Get the rate limit group for a given endpoint
 */
function getEndpointGroup(endpoint) {
    for (const { pattern, group } of exports.ENDPOINT_TO_GROUP) {
        if (pattern.test(endpoint)) {
            return group;
        }
    }
    return 'default';
}
/**
 * Get rate limit configuration for a group, with environment variable overrides
 */
function getRateLimitConfig(group) {
    const baseConfig = exports.RATE_LIMIT_GROUPS[group] || exports.RATE_LIMIT_GROUPS['default'];
    // Allow environment variable overrides
    const envOverride = process.env.RATE_LIMIT_OVERRIDE_JSON;
    if (envOverride) {
        try {
            const overrides = JSON.parse(envOverride);
            if (overrides[group]) {
                return {
                    ...baseConfig,
                    ...overrides[group]
                };
            }
        }
        catch (error) {
            console.warn('Failed to parse RATE_LIMIT_OVERRIDE_JSON:', error);
        }
    }
    return baseConfig;
}
/**
 * Validate rate limit configuration
 */
function validateRateLimitConfig(config) {
    return (typeof config.rate === 'number' &&
        config.rate > 0 &&
        typeof config.burst === 'number' &&
        config.burst > 0 &&
        config.burst >= 1 // Must allow at least 1 request
    );
}
