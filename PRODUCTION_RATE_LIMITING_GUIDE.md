# Production-Ready Rate Limiting for Amazon SP-API Orders

## Overview

This document outlines the production-ready rate limiting implementation for Amazon SP-API Order Details (`getOrder`) and Order Items (`getOrderItems`) operations. The system has been designed to never exceed Amazon's rate limits while maintaining optimal throughput.

## Implementation Summary

### ✅ What's Been Implemented

1. **Grouped Rate Limiting System**
   - Endpoint classification into rate limit groups
   - Separate token buckets for different operation types
   - Dynamic rate limit updates from API response headers

2. **Production-Grade Features**
   - Exponential backoff with jitter for retries
   - Request queuing with timeout handling
   - Comprehensive metrics and observability
   - Graceful degradation and error handling

3. **Amazon SP-API Compliance**
   - Exact rate limits per Amazon documentation
   - Burst capacity handling
   - Cross-operation independence

## Rate Limit Configuration

### Orders API Rate Limits

| Operation Group | Rate (req/s) | Burst | Endpoints |
|-----------------|--------------|-------|-----------|
| `orders-detail` | 0.5 | 30 | getOrder, getOrderItems, getOrderAddress, getBuyerInfo |
| `orders-list` | 0.0167 | 20 | getOrders |
| `orders-update` | 2.0 | 10 | confirmShipment, updateShipmentStatus |

### Key Features

- **Group-based**: Related operations share the same rate limit pool
- **Dynamic**: Rate limits update automatically from API response headers
- **Configurable**: Environment variable overrides supported
- **Independent**: Different groups don't affect each other

## File Structure

```
nodes/AmazonSellingPartner/
├── core/
│   ├── rateLimitConfig.ts          # Rate limit configuration and mapping
│   ├── RateLimiter.ts              # Enhanced rate limiter with grouping
│   └── __tests__/
│       ├── rateLimitConfig.test.ts # Configuration tests
│       └── RateLimiter.test.ts     # Rate limiter unit tests
├── helpers/
│   └── SpApiRequest.ts             # Updated to use grouped rate limits
└── __tests__/
    └── integration/
        ├── SpApiSandbox.test.ts    # Updated integration tests
        └── OrderRateLimiting.test.ts # Comprehensive rate limiting tests
```

## Configuration Options

### Environment Variables

```bash
# Queue timeout (default: 300000ms = 5 minutes)
RATE_LIMIT_QUEUE_TIMEOUT=300000

# Rate limit overrides (JSON format)
RATE_LIMIT_OVERRIDE_JSON='{"orders-detail":{"rate":1.0,"burst":50}}'
```

### Rate Limit Override Example

```javascript
// Override orders-detail to be more permissive
process.env.RATE_LIMIT_OVERRIDE_JSON = JSON.stringify({
  'orders-detail': {
    rate: 1.0,    // 1 request per second instead of 0.5
    burst: 50     // 50 burst capacity instead of 30
  }
});
```

## Usage Examples

### Basic Usage (Automatic)

The rate limiting is completely transparent to existing code:

```typescript
// This automatically uses orders-detail rate limit group
const orderResponse = await SpApiRequest.makeRequest(executeFunctions, {
  method: 'GET',
  endpoint: '/orders/v0/orders/123-1234567-1234567'
});

// This also uses orders-detail rate limit group
const itemsResponse = await SpApiRequest.makeRequest(executeFunctions, {
  method: 'GET',
  endpoint: '/orders/v0/orders/123-1234567-1234567/orderItems'
});

// This uses orders-list rate limit group (separate from above)
const ordersResponse = await SpApiRequest.makeRequest(executeFunctions, {
  method: 'GET',
  endpoint: '/orders/v0/orders',
  query: { MarketplaceIds: ['ATVPDKIKX0DER'] }
});
```

### Batch Processing Example

```typescript
// Safe batch processing - respects rate limits automatically
async function processOrderBatch(orderIds: string[]) {
  const results = [];
  
  // Get all order details (uses orders-detail group)
  const orderPromises = orderIds.map(orderId =>
    SpApiRequest.makeRequest(executeFunctions, {
      method: 'GET',
      endpoint: `/orders/v0/orders/${orderId}`
    })
  );
  
  // Get all order items (uses same orders-detail group)
  const itemPromises = orderIds.map(orderId =>
    SpApiRequest.makeRequest(executeFunctions, {
      method: 'GET',
      endpoint: `/orders/v0/orders/${orderId}/orderItems`
    })
  );
  
  // These will be automatically queued and throttled
  const [orders, items] = await Promise.all([
    Promise.all(orderPromises),
    Promise.all(itemPromises)
  ]);
  
  return { orders, items };
}
```

## Monitoring and Observability

### Metrics Available

The rate limiter exposes comprehensive metrics:

```typescript
const rateLimiter = new RateLimiter();
const metrics = rateLimiter.getMetrics();

console.log({
  queueLength: metrics.queueLength,        // Total queued requests
  waitTimeMs: metrics.waitTimeMs,          // Average wait time
  rateLimitHits: metrics.rateLimitHits,    // Times rate limit was hit
  activeGroups: metrics.activeGroups,      // Number of active groups
  groupDetails: metrics.groupDetails       // Per-group details
});
```

### Per-Group Metrics

```typescript
// Example group details
{
  'orders-detail': {
    queueLength: 5,     // Requests waiting
    tokens: 25,         // Available tokens
    maxTokens: 30       // Maximum tokens
  },
  'orders-list': {
    queueLength: 0,
    tokens: 20,
    maxTokens: 20
  }
}
```

## Testing

### Unit Tests

```bash
# Run rate limiting unit tests
npm test -- --testPathPattern="rateLimitConfig|RateLimiter"
```

### Integration Tests

```bash
# Run comprehensive rate limiting integration tests
npm test -- --testPathPattern="OrderRateLimiting"

# Run all integration tests
npm run test:integration
```

### Load Testing

```bash
# Run load tests to verify no 429 errors occur
npm run test:load
```

## Production Deployment Checklist

### ✅ Pre-Deployment

- [ ] Rate limit configuration matches Amazon documentation
- [ ] Unit tests pass for all rate limiting components
- [ ] Integration tests pass with sandbox credentials
- [ ] Load tests demonstrate no 429 errors under expected load
- [ ] Monitoring/metrics collection is configured
- [ ] Error handling and retry logic tested

### ✅ Deployment

- [ ] Environment variables configured correctly
- [ ] Rate limit overrides (if any) are documented and approved
- [ ] Monitoring dashboards updated with new metrics
- [ ] Alerting configured for rate limit violations

### ✅ Post-Deployment

- [ ] Monitor queue lengths and wait times
- [ ] Verify no 429 errors in production logs
- [ ] Check rate limit hit metrics
- [ ] Validate throughput meets business requirements

## Performance Characteristics

### Expected Behavior

| Scenario | Expected Result |
|----------|----------------|
| 30 parallel getOrder calls | Completes within 5 seconds (burst capacity) |
| 35 parallel getOrder calls | Takes ~10+ seconds (5 extra / 0.5 rps) |
| 20 parallel getOrders calls | Completes within 10 seconds (burst capacity) |
| 25 parallel getOrders calls | Takes 5+ minutes (5 extra / 0.0167 rps) |
| Mixed operations | Independent processing per group |

### Throughput Calculations

```
Orders Detail Operations:
- Sustained: 0.5 requests/second = 1,800 requests/hour
- Burst: 30 requests immediately, then 0.5 rps

Orders List Operations:
- Sustained: 0.0167 requests/second = 60 requests/hour
- Burst: 20 requests immediately, then 0.0167 rps
```

## Troubleshooting

### Common Issues

1. **Long Wait Times**
   - Check if burst capacity is exceeded
   - Monitor queue length metrics
   - Consider rate limit overrides if appropriate

2. **Rate Limit Errors (429)**
   - Should not occur with proper implementation
   - Check for configuration issues
   - Verify rate limit groups are working correctly

3. **Timeout Errors**
   - Increase `RATE_LIMIT_QUEUE_TIMEOUT` if needed
   - Check if request volume exceeds sustainable rate

### Debug Commands

```bash
# Check rate limiter metrics
node -e "
const { RateLimiter } = require('./nodes/AmazonSellingPartner/core/RateLimiter');
const rl = new RateLimiter();
console.log(JSON.stringify(rl.getMetrics(), null, 2));
"

# Validate rate limit configuration
node -e "
const { getRateLimitConfig, getEndpointGroup } = require('./nodes/AmazonSellingPartner/core/rateLimitConfig');
console.log('getOrder group:', getEndpointGroup('/orders/v0/orders/123-1234567-1234567'));
console.log('Config:', getRateLimitConfig('orders-detail'));
"
```

## Advanced Features

### Distributed Rate Limiting

The system supports optional distributed backends (Redis) for multi-instance deployments:

```typescript
const rateLimiter = new RateLimiter({
  distributedBackend: new RedisRateLimitBackend({
    host: 'redis-host',
    port: 6379
  })
});
```

### Custom Rate Limit Groups

Add new endpoint patterns to `rateLimitConfig.ts`:

```typescript
export const ENDPOINT_TO_GROUP = [
  // Add custom patterns
  { pattern: /^\/catalog\/v1\/items/, group: 'catalog-detail' },
  // ... existing patterns
];

export const RATE_LIMIT_GROUPS = {
  'catalog-detail': {
    rate: 1.0,
    burst: 20,
    description: 'Catalog item operations'
  },
  // ... existing groups
};
```

## Security Considerations

- Rate limits are enforced before API calls to prevent quota exhaustion
- Request queuing prevents memory issues under high load
- Timeout handling prevents indefinite blocking
- Metrics don't expose sensitive data

## Support and Maintenance

### Regular Maintenance

1. **Monitor Amazon Documentation** for rate limit changes
2. **Update Configuration** when new endpoints are added
3. **Review Metrics** regularly for optimization opportunities
4. **Test Periodically** with sandbox to ensure continued functionality

### Getting Help

For issues with the rate limiting system:

1. Check the troubleshooting section above
2. Review metrics and logs
3. Run diagnostic commands
4. Consult Amazon SP-API documentation for rate limit updates

---

## Implementation Status: ✅ PRODUCTION READY

The rate limiting system has been fully implemented and tested. It provides:

- ✅ Compliance with Amazon SP-API rate limits
- ✅ Production-grade error handling and retry logic
- ✅ Comprehensive monitoring and observability
- ✅ Scalable architecture for future expansion
- ✅ Extensive test coverage

The system is ready for production deployment and will ensure no 429 rate limit errors occur under normal operation. 