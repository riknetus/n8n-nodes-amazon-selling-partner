# Amazon SP-API Finance API Guide

This guide provides comprehensive documentation for using the Finance API features of the Amazon Selling Partner n8n node.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Operations](#operations)
4. [Data Structures](#data-structures)
5. [Common Use Cases](#common-use-cases)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Rate Limiting](#rate-limiting)
9. [Examples](#examples)

## Overview

The Amazon SP-API Finance API provides access to your financial data, including:

- **Financial Event Groups**: Collections of financial events grouped by settlement period
- **Financial Events**: Individual transactions, fees, refunds, and adjustments
- **Transaction History**: Complete financial activity for your seller account
- **Settlement Data**: Information about fund transfers and settlements

### What You Can Do

- ✅ Retrieve financial events within specific date ranges
- ✅ Get detailed transaction information for orders
- ✅ Track settlements and fund transfers
- ✅ Monitor fees, refunds, and adjustments
- ✅ Generate financial reports and analytics
- ✅ Reconcile payments and transactions

### Important Limitations

- 📅 **Date Range Limit**: Maximum 180 days per request
- 🔄 **Data Freshness**: Financial events may have up to 48-hour delay
- 📊 **Rate Limits**: 0.5 requests per second for most operations
- 🏦 **Settlement Cycle**: Data availability depends on Amazon's settlement schedule

## Prerequisites

### Required Permissions

Your SP-API application must have the following roles:
- `Finance API` - Access to financial data

### Marketplace Support

The Finance API is available in all marketplaces where you have selling privileges. However, financial data is segmented by marketplace and region.

### Authentication

Finance API operations require standard SP-API authentication:
- LWA (Login with Amazon) credentials
- Valid refresh token
- Appropriate application permissions

## Operations

### 1. List Financial Event Groups

Retrieves financial event groups within a specified date range.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `financialEventGroupStartedAfter` | ISO 8601 DateTime | Yes | Start date for event groups |
| `financialEventGroupStartedBefore` | ISO 8601 DateTime | No | End date for event groups |
| `maxResultsPerPage` | Integer (1-100) | No | Page size (default: 100) |
| `returnAll` | Boolean | No | Return all pages (default: false) |

#### Use Cases
- Find all settlements in a time period
- Identify settlement patterns
- Prepare for detailed financial analysis

### 2. List Financial Events

Retrieves all financial events within a specified date range.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postedAfter` | ISO 8601 DateTime | Yes | Start date for events |
| `postedBefore` | ISO 8601 DateTime | No | End date for events |
| `maxResultsPerPage` | Integer (1-100) | No | Page size (default: 100) |
| `returnAll` | Boolean | No | Return all pages (default: false) |

#### Use Cases
- Generate comprehensive financial reports
- Analyze transaction trends
- Export data for accounting systems

### 3. List Financial Events by Group ID

Retrieves all financial events for a specific financial event group.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `eventGroupId` | String | Yes | Financial event group identifier |
| `postedAfter` | ISO 8601 DateTime | No | Filter events after this date |
| `postedBefore` | ISO 8601 DateTime | No | Filter events before this date |
| `returnAll` | Boolean | No | Return all pages (default: false) |

#### Use Cases
- Analyze specific settlement periods
- Drill down into settlement details
- Reconcile settlement reports

### 4. List Financial Events by Order ID

Retrieves financial events related to a specific order.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | String | Yes | Amazon order identifier (format: XXX-XXXXXXX-XXXXXXX) |
| `returnAll` | Boolean | No | Return all pages (default: false) |

#### Use Cases
- Track order-specific financial impact
- Investigate order discrepancies
- Customer service inquiries

## Data Structures

### Financial Event Group

```json
{
  "FinancialEventGroupId": "12345678901234567890123456789012",
  "ProcessingStatus": "Closed",
  "FundTransferStatus": "Successful",
  "OriginalTotal": {
    "CurrencyCode": "USD",
    "CurrencyAmount": 1250.75
  },
  "ConvertedTotal": {
    "CurrencyCode": "USD", 
    "CurrencyAmount": 1250.75
  },
  "FundTransferDate": "2024-01-15T10:30:00Z",
  "TraceId": "TRACE123456789",
  "AccountTail": "1234",
  "BeginningBalance": {
    "CurrencyCode": "USD",
    "CurrencyAmount": 500.00
  },
  "FinancialEventGroupStart": "2024-01-01T00:00:00Z",
  "FinancialEventGroupEnd": "2024-01-14T23:59:59Z"
}
```

### Financial Event Types

The API returns various types of financial events, each with specific data structures:

#### Shipment Events
- Order fulfillment and shipping charges
- Principal, shipping, and tax amounts
- Promotional discounts and fees

#### Refund Events  
- Customer refunds and returns
- Refund amounts by category
- Associated fees and adjustments

#### Guarantee Claim Events
- A-to-Z guarantee claims
- Chargeback events
- Protection claim settlements

#### Fee Events
- FBA fees and charges
- Monthly storage fees
- Long-term storage fees
- Removal order fees

#### Adjustment Events
- Manual adjustments
- Inventory reimbursements
- Correction entries

#### Product Ads Payment Events
- Advertising costs and charges
- Campaign-related transactions

## Common Use Cases

### 1. Monthly Financial Report

```javascript
// Get all financial events for the current month
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

{
  "resource": "finance",
  "operation": "listFinancialEvents",
  "postedAfter": startOfMonth,
  "postedBefore": endOfMonth,
  "additionalOptions": {
    "returnAll": true
  }
}
```

### 2. Settlement Analysis

```javascript
// Analyze a specific settlement period
{
  "resource": "finance", 
  "operation": "listFinancialEventsByGroupId",
  "eventGroupId": "your-settlement-group-id",
  "additionalOptions": {
    "returnAll": true
  }
}
```

### 3. Order Financial Investigation

```javascript
// Investigate financial events for a specific order
{
  "resource": "finance",
  "operation": "listFinancialEventsByOrderId", 
  "orderId": "123-1234567-1234567"
}
```

### 4. Fee Analysis

```javascript
// Get recent financial events to analyze fees
{
  "resource": "finance",
  "operation": "listFinancialEvents",
  "postedAfter": "2024-01-01T00:00:00Z",
  "postedBefore": "2024-01-31T23:59:59Z",
  "additionalOptions": {
    "maxResultsPerPage": 100,
    "returnAll": true
  }
}
```

## Best Practices

### 1. Date Range Management

```javascript
// ✅ Good: Use appropriate date ranges
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const now = new Date().toISOString();

// ❌ Bad: Overly large date ranges
const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
```

### 2. Pagination Strategy

```javascript
// ✅ Good: Use pagination for large datasets
{
  "additionalOptions": {
    "maxResultsPerPage": 100,
    "returnAll": true  // Let the node handle pagination
  }
}

// ❌ Bad: Trying to get too much data at once
{
  "additionalOptions": {
    "maxResultsPerPage": 1000  // Invalid - exceeds limit
  }
}
```

### 3. Error Handling

```javascript
// Implement proper error handling in your workflows
try {
  const financialEvents = await getFinancialEvents();
  // Process events
} catch (error) {
  if (error.message.includes('429')) {
    // Rate limit - wait and retry
    await wait(60000); // Wait 1 minute
    return retry();
  } else if (error.message.includes('400')) {
    // Invalid parameters - check your date format
    throw new Error('Invalid date format or parameters');
  }
  // Handle other errors appropriately
}
```

### 4. Data Processing

```javascript
// Process financial events by type
function processFinancialEvents(events) {
  const summary = {
    shipments: [],
    refunds: [],
    fees: [],
    adjustments: []
  };
  
  events.forEach(event => {
    switch (event.eventType) {
      case 'Shipment':
        summary.shipments.push(event.eventData);
        break;
      case 'Refund':
        summary.refunds.push(event.eventData);
        break;
      case 'ServiceFee':
        summary.fees.push(event.eventData);
        break;
      case 'Adjustment':
        summary.adjustments.push(event.eventData);
        break;
    }
  });
  
  return summary;
}
```

## Rate Limiting

### Finance API Rate Limits

- **List Financial Event Groups**: 0.5 requests per second
- **List Financial Events**: 0.5 requests per second  
- **List Financial Events by Group ID**: 0.5 requests per second
- **List Financial Events by Order ID**: 0.5 requests per second

### Rate Limit Best Practices

1. **Implement Delays**: Space requests appropriately
2. **Handle 429 Errors**: Implement exponential backoff
3. **Monitor Usage**: Track your rate limit consumption
4. **Batch Processing**: Group related operations

```javascript
// Example: Controlled request rate
async function getRateLimitedFinancialData(dateRanges) {
  const results = [];
  
  for (const range of dateRanges) {
    try {
      const data = await getFinancialEvents(range);
      results.push(data);
      
      // Wait 2.1 seconds between requests (0.5 req/sec limit)
      await new Promise(resolve => setTimeout(resolve, 2100));
    } catch (error) {
      if (error.message.includes('429')) {
        // Wait longer if rate limited
        await new Promise(resolve => setTimeout(resolve, 60000));
        // Retry the request
        const data = await getFinancialEvents(range);
        results.push(data);
      } else {
        throw error;
      }
    }
  }
  
  return results;
}
```

## Troubleshooting

### Common Issues

#### "Date range cannot exceed 180 days"

**Problem**: The date range between `postedAfter` and `postedBefore` is too large.

**Solution**:
```javascript
// Split large date ranges
function splitDateRange(startDate, endDate, maxDays = 180) {
  const ranges = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current < end) {
    const rangeEnd = new Date(current.getTime() + (maxDays * 24 * 60 * 60 * 1000));
    ranges.push({
      start: current.toISOString(),
      end: (rangeEnd > end ? end : rangeEnd).toISOString()
    });
    current = rangeEnd;
  }
  
  return ranges;
}
```

#### "Financial Event Group ID not found"

**Problem**: The specified group ID doesn't exist or is invalid.

**Solution**:
1. Verify the group ID format (32-character string)
2. Check that the group exists in your account
3. Ensure you have access to that marketplace's data

#### "No financial events found"

**Problem**: No events exist for the specified criteria.

**Possible Reasons**:
- Date range contains no activity
- Marketplace has no transactions
- Data not yet available (up to 48-hour delay)

#### "Invalid Order ID format"

**Problem**: Order ID doesn't match the expected format.

**Solution**:
```javascript
// Validate Order ID format: XXX-XXXXXXX-XXXXXXX
function validateOrderId(orderId) {
  const pattern = /^\d{3}-\d{7}-\d{7}$/;
  if (!pattern.test(orderId)) {
    throw new Error('Invalid Order ID format. Expected: XXX-XXXXXXX-XXXXXXX');
  }
  return true;
}
```

### Rate Limiting Issues

#### "Request was throttled by Amazon SP-API"

**Problem**: Exceeded the rate limit (0.5 requests per second).

**Solution**:
```javascript
// Implement exponential backoff
async function makeRequestWithBackoff(requestFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.message.includes('429') && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${delay}ms before retry ${attempt}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

## Examples

### Complete Workflow Examples

#### 1. Monthly Financial Report Generation

```json
{
  "nodes": [
    {
      "name": "Get Financial Event Groups",
      "type": "amazon-selling-partner",
      "parameters": {
        "resource": "finance",
        "operation": "listFinancialEventGroups",
        "financialEventGroupStartedAfter": "={{$now.minus({month: 1}).startOf('month').toISO()}}",
        "financialEventGroupStartedBefore": "={{$now.minus({month: 1}).endOf('month').toISO()}}",
        "additionalOptions": {
          "returnAll": true
        }
      }
    },
    {
      "name": "Get Financial Events",
      "type": "amazon-selling-partner", 
      "parameters": {
        "resource": "finance",
        "operation": "listFinancialEvents",
        "postedAfter": "={{$now.minus({month: 1}).startOf('month').toISO()}}",
        "postedBefore": "={{$now.minus({month: 1}).endOf('month').toISO()}}",
        "additionalOptions": {
          "returnAll": true
        }
      }
    },
    {
      "name": "Process Financial Data",
      "type": "code",
      "parameters": {
        "jsCode": "// Process and categorize financial events\nconst events = $input.all();\nconst summary = {\n  totalRevenue: 0,\n  totalFees: 0,\n  totalRefunds: 0,\n  eventsByType: {}\n};\n\nevents.forEach(item => {\n  const event = item.json;\n  const eventType = event.eventType;\n  \n  if (!summary.eventsByType[eventType]) {\n    summary.eventsByType[eventType] = 0;\n  }\n  summary.eventsByType[eventType]++;\n  \n  // Add your business logic here to calculate totals\n});\n\nreturn { json: summary };"
      }
    }
  ]
}
```

#### 2. Settlement Reconciliation

```json
{
  "nodes": [
    {
      "name": "Get Recent Settlements",
      "type": "amazon-selling-partner",
      "parameters": {
        "resource": "finance",
        "operation": "listFinancialEventGroups",
        "financialEventGroupStartedAfter": "={{$now.minus({days: 30}).toISO()}}",
        "additionalOptions": {
          "returnAll": true
        }
      }
    },
    {
      "name": "Process Each Settlement",
      "type": "splitInBatches",
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "name": "Get Settlement Details",
      "type": "amazon-selling-partner",
      "parameters": {
        "resource": "finance", 
        "operation": "listFinancialEventsByGroupId",
        "eventGroupId": "={{$json.FinancialEventGroupId}}",
        "additionalOptions": {
          "returnAll": true
        }
      }
    },
    {
      "name": "Generate Settlement Report",
      "type": "code",
      "parameters": {
        "jsCode": "// Generate detailed settlement report\nconst events = $input.all();\nconst settlement = {\n  groupId: events[0].json.eventGroupId,\n  totalEvents: events.length,\n  eventTypes: {},\n  netAmount: 0\n};\n\nevents.forEach(item => {\n  const event = item.json;\n  if (!settlement.eventTypes[event.eventType]) {\n    settlement.eventTypes[event.eventType] = 0;\n  }\n  settlement.eventTypes[event.eventType]++;\n});\n\nreturn { json: settlement };"
      }
    }
  ]
}
```

#### 3. Order Financial Analysis

```json
{
  "nodes": [
    {
      "name": "Get Order IDs", 
      "type": "manual",
      "parameters": {
        "data": [
          {"orderId": "123-1234567-1234567"},
          {"orderId": "456-4567890-4567890"}
        ]
      }
    },
    {
      "name": "Get Order Financial Events",
      "type": "amazon-selling-partner",
      "parameters": {
        "resource": "finance",
        "operation": "listFinancialEventsByOrderId",
        "orderId": "={{$json.orderId}}",
        "additionalOptions": {
          "returnAll": true
        }
      }
    },
    {
      "name": "Analyze Order Profitability",
      "type": "code", 
      "parameters": {
        "jsCode": "// Calculate order profitability\nconst events = $input.all();\nconst analysis = {\n  orderId: events[0]?.json?.orderId,\n  revenue: 0,\n  fees: 0,\n  netProfit: 0,\n  eventBreakdown: {}\n};\n\nevents.forEach(item => {\n  const event = item.json;\n  const eventType = event.eventType;\n  \n  if (!analysis.eventBreakdown[eventType]) {\n    analysis.eventBreakdown[eventType] = {\n      count: 0,\n      totalAmount: 0\n    };\n  }\n  \n  analysis.eventBreakdown[eventType].count++;\n  \n  // Add your financial calculation logic here\n});\n\nanalysis.netProfit = analysis.revenue - analysis.fees;\nreturn { json: analysis };"
      }
    }
  ]
}
```

### Integration with External Systems

#### Export to Google Sheets

```json
{
  "nodes": [
    {
      "name": "Get Financial Events",
      "type": "amazon-selling-partner",
      "parameters": {
        "resource": "finance",
        "operation": "listFinancialEvents",
        "postedAfter": "={{$now.minus({days: 7}).toISO()}}",
        "additionalOptions": {
          "returnAll": true
        }
      }
    },
    {
      "name": "Transform for Sheets",
      "type": "code",
      "parameters": {
        "jsCode": "// Transform data for Google Sheets\nconst events = $input.all();\nconst transformed = events.map(item => {\n  const event = item.json;\n  return {\n    Date: event.eventData.PostedDate || '',\n    EventType: event.eventType,\n    OrderId: event.eventData.AmazonOrderId || '',\n    Amount: event.eventData.TotalAmount?.CurrencyAmount || 0,\n    Currency: event.eventData.TotalAmount?.CurrencyCode || 'USD'\n  };\n});\n\nreturn transformed.map(row => ({ json: row }));"
      }
    },
    {
      "name": "Update Google Sheet",
      "type": "googleSheets",
      "parameters": {
        "operation": "appendOrUpdate",
        "documentId": "your-sheet-id",
        "sheetName": "Financial Events",
        "dataMode": "autoMapInputData"
      }
    }
  ]
}
```

## Advanced Topics

### Custom Financial Metrics

```javascript
// Calculate custom metrics from financial events
function calculateMetrics(events) {
  const metrics = {
    grossRevenue: 0,
    netRevenue: 0,
    totalFees: 0,
    averageOrderValue: 0,
    refundRate: 0,
    feePercentage: 0
  };
  
  let orderCount = 0;
  let refundCount = 0;
  
  events.forEach(event => {
    switch (event.eventType) {
      case 'Shipment':
        metrics.grossRevenue += extractShipmentRevenue(event.eventData);
        orderCount++;
        break;
      case 'Refund':
        metrics.netRevenue -= extractRefundAmount(event.eventData);
        refundCount++;
        break;
      case 'ServiceFee':
        metrics.totalFees += extractFeeAmount(event.eventData);
        break;
    }
  });
  
  metrics.netRevenue = metrics.grossRevenue - metrics.totalFees;
  metrics.averageOrderValue = orderCount > 0 ? metrics.grossRevenue / orderCount : 0;
  metrics.refundRate = orderCount > 0 ? (refundCount / orderCount) * 100 : 0;
  metrics.feePercentage = metrics.grossRevenue > 0 ? (metrics.totalFees / metrics.grossRevenue) * 100 : 0;
  
  return metrics;
}
```

### Data Validation and Quality Checks

```javascript
// Validate financial event data quality
function validateFinancialData(events) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  events.forEach((event, index) => {
    // Check required fields
    if (!event.eventType) {
      validation.errors.push(`Event ${index}: Missing eventType`);
      validation.isValid = false;
    }
    
    if (!event.eventData) {
      validation.errors.push(`Event ${index}: Missing eventData`);
      validation.isValid = false;
    }
    
    // Check date consistency
    if (event.eventData?.PostedDate) {
      const postedDate = new Date(event.eventData.PostedDate);
      const now = new Date();
      
      if (postedDate > now) {
        validation.warnings.push(`Event ${index}: Future posted date`);
      }
    }
    
    // Check currency consistency
    if (event.eventData?.TotalAmount?.CurrencyCode) {
      const currency = event.eventData.TotalAmount.CurrencyCode;
      if (!['USD', 'EUR', 'GBP', 'CAD', 'JPY'].includes(currency)) {
        validation.warnings.push(`Event ${index}: Unusual currency ${currency}`);
      }
    }
  });
  
  return validation;
}
```

---

## Support

For questions about the Finance API integration:

- 📖 [Amazon SP-API Finance Documentation](https://developer-docs.amazon.com/sp-api/docs/finances-api-v0-reference)
- 🐛 [Issue Tracker](https://github.com/your-org/n8n-nodes-amazon-selling-partner/issues)
- 💬 [Community Discussions](https://github.com/your-org/n8n-nodes-amazon-selling-partner/discussions)

---

**Important**: Financial data from Amazon may have up to 48-hour delays. Always account for this delay when building time-sensitive financial workflows. 