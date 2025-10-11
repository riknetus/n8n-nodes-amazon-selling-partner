# DataKiosk API Guide

## Overview

The DataKiosk API provides access to Amazon's analytics data through GraphQL queries. This guide explains how to construct correct queries using the versioned schema structure.

## Important: Versioned Domain Fields

DataKiosk queries **must** use versioned domain fields. The most common error is:
```
"Query did not have a versioned domain field"
```

### Correct Structure

```graphql
query {
  analytics_salesAndTraffic_2024_04_24 {  // ← Versioned domain field
    salesAndTrafficTrends(              // ← Query field
      // parameters here
    ) {
      // fields to retrieve
    }
  }
}
```

## Available Schemas

Use the [Amazon DataKiosk Schema Explorer](https://sellercentral.amazon.com/datakiosk-schema-explorer) to discover available schemas:

- `analytics_salesAndTraffic_2024_04_24` - Sales and traffic analytics
- `analytics_vendorSalesAndTraffic_2024_04_24` - Vendor analytics
- And more...

## Sales and Traffic Query Structure

### Basic Query Template

```graphql
query {
  analytics_salesAndTraffic_2024_04_24 {
    salesAndTrafficTrends(
      asinAggregation: CHILD           # Required: CHILD or PARENT
      dateAggregation: DAY             # Required: DAY, WEEK, or MONTH
      startDate: "YYYY-MM-DD"          # Required: Start date
      endDate: "YYYY-MM-DD"            # Required: End date
      filters: {                       # Required object
        asins: []                      # Required: Empty array for all ASINs
        marketplaceId: "ATVPDKIKX0DER" # Required: Your marketplace ID
      }
    ) {
      # Fields to retrieve
      marketplaceId
      startDate
      endDate
      traffic {
        pageViews
        sessions
        unitSessionPercentage
      }
      sales {
        totalOrderItems
        unitsOrdered
        orderedProductSales {
          amount
          currencyCode
        }
      }
    }
  }
}
```

### Parameters Explained

#### asinAggregation
- **CHILD**: Aggregate by child ASIN
- **PARENT**: Aggregate by parent ASIN

#### dateAggregation
- **DAY**: Daily data points
- **WEEK**: Weekly aggregation
- **MONTH**: Monthly aggregation

#### filters.asins
- Empty array `[]`: Get data for all ASINs
- Specific ASINs `["B001234567", "B007654321"]`: Filter by specific ASINs

#### filters.marketplaceId
Your target marketplace:
- **ATVPDKIKX0DER**: US (amazon.com)
- **A2EUQ1WTGCTBG2**: Canada (amazon.ca)
- **A1AM78C64UM0Y8**: Mexico (amazon.com.mx)
- **A2Q3Y263D00KWC**: Brazil (amazon.com.br)
- **A1F83G8C2ARO7P**: UK (amazon.co.uk)
- **A13V1IB3VIYZZH**: France (amazon.fr)
- **A1PA6795UKMFR9**: Germany (amazon.de)
- **APJ6JRA9NG5V4**: Italy (amazon.it)
- **A1RKKUPIHCS9HS**: Spain (amazon.es)
- **A21TJRUUN4KGV**: India (amazon.in)
- **A1805IZSGTT6HS**: Netherlands (amazon.nl)

### Available Traffic Fields

```graphql
traffic {
  pageViews                      # Total page views
  pageViewsB2B                   # B2B page views
  pageViewsPercentage            # % of total page views
  pageViewsPercentageB2B         # B2B % of total page views
  
  sessions                       # Total sessions
  sessionsB2B                    # B2B sessions
  sessionPercentage              # % of total sessions
  sessionPercentageB2B           # B2B % of total sessions
  
  browserPageViews               # Desktop/browser page views
  browserPageViewsB2B            # B2B browser page views
  browserPageViewsPercentage
  browserPageViewsPercentageB2B
  browserSessions
  browserSessionsB2B
  browserSessionPercentage
  browserSessionPercentageB2B
  
  mobileAppPageViews             # Mobile app page views
  mobileAppPageViewsB2B
  mobileAppPageViewsPercentage
  mobileAppPageViewsPercentageB2B
  mobileAppSessions
  mobileAppSessionsB2B
  mobileAppSessionPercentage
  mobileAppSessionPercentageB2B
  
  unitSessionPercentage          # Conversion rate
  unitSessionPercentageB2B
  
  buyBoxPercentage               # Buy Box win rate
  buyBoxPercentageB2B
}
```

### Available Sales Fields

```graphql
sales {
  totalOrderItems                # Total number of items ordered
  totalOrderItemsB2B             # B2B items ordered
  
  unitsOrdered                   # Total units ordered
  unitsOrderedB2B                # B2B units ordered
  
  orderedProductSales {          # Total sales revenue
    amount                       # Numeric amount
    currencyCode                 # Currency (USD, EUR, etc.)
  }
  
  orderedProductSalesB2B {       # B2B sales revenue
    amount
    currencyCode
  }
}
```

## Common Query Examples

### Example 1: Last 7 Days - All ASINs

```graphql
query {
  analytics_salesAndTraffic_2024_04_24 {
    salesAndTrafficTrends(
      asinAggregation: CHILD
      dateAggregation: DAY
      startDate: "2024-10-04"
      endDate: "2024-10-11"
      filters: { asins: [], marketplaceId: "ATVPDKIKX0DER" }
    ) {
      marketplaceId
      startDate
      endDate
      traffic {
        pageViews
        sessions
        unitSessionPercentage
      }
      sales {
        unitsOrdered
        orderedProductSales { amount currencyCode }
      }
    }
  }
}
```

### Example 2: Specific ASINs - Monthly Aggregation

```graphql
query {
  analytics_salesAndTraffic_2024_04_24 {
    salesAndTrafficTrends(
      asinAggregation: PARENT
      dateAggregation: MONTH
      startDate: "2024-01-01"
      endDate: "2024-12-31"
      filters: {
        asins: ["B001234567", "B007654321"]
        marketplaceId: "A21TJRUUN4KGV"
      }
    ) {
      parentAsin
      childAsin
      sku
      marketplaceId
      startDate
      endDate
      traffic {
        pageViews
        sessions
        buyBoxPercentage
      }
      sales {
        totalOrderItems
        unitsOrdered
        orderedProductSales { amount currencyCode }
      }
    }
  }
}
```

### Example 3: B2B-Focused Query

```graphql
query {
  analytics_salesAndTraffic_2024_04_24 {
    salesAndTrafficTrends(
      asinAggregation: CHILD
      dateAggregation: WEEK
      startDate: "2024-09-01"
      endDate: "2024-10-11"
      filters: { asins: [], marketplaceId: "ATVPDKIKX0DER" }
    ) {
      marketplaceId
      startDate
      endDate
      traffic {
        sessionsB2B
        pageViewsB2B
        unitSessionPercentageB2B
      }
      sales {
        totalOrderItemsB2B
        unitsOrderedB2B
        orderedProductSalesB2B { amount currencyCode }
      }
    }
  }
}
```

## Using the n8n Node

### Operation: "Create Query"

1. **Select Resource:** DataKiosk
2. **Select Operation:** Create Query
3. **Enter GraphQL Query:** Paste your query (use examples above)
4. **Minify GraphQL:** Keep enabled (default)
5. **Execute:** You'll get a `queryId`

### Operation: "Get Query"

1. **Query ID:** Use the ID from "Create Query"
2. **Execute:** Check `processingStatus`
   - `IN_QUEUE`: Query is queued
   - `IN_PROGRESS`: Query is processing
   - `DONE`: Query completed, get `dataDocumentId`
   - `FATAL`: Query failed, check `errorDocumentId`

### Operation: "Get Document"

1. **Document ID:** Use `dataDocumentId` from completed query
2. **Output:** Choose "Binary" or "Text"
3. **Execute:** Downloads the query results

### Operation: "Run Query and Download" (Recommended)

This operation automates the entire flow:
1. Creates the query
2. Polls for completion (default: every 2 seconds)
3. Downloads the document automatically
4. Returns the data

**Parameters:**
- **Query:** Your GraphQL query
- **Poll Interval (Ms):** How often to check status (default: 2000ms)
- **Timeout (Ms):** Maximum wait time (default: 300000ms = 5 minutes)
- **Output:** Binary or Text
- **Multi-Page Handling:** For paginated results

## Common Errors and Solutions

### Error: "Query did not have a versioned domain field"

**Cause:** Not using a versioned field name.

**Solution:** Use `analytics_salesAndTraffic_2024_04_24` instead of `salesAndTraffic`.

### Error: "Versioned domain cannot select multiple query fields"

**Cause:** Trying to select top-level fields like `startDate`, `endDate` alongside nested fields.

**Solution:** Only select fields within the query field (e.g., `salesAndTrafficTrends`).

### Error: "Missing required fields '[asins]'"

**Cause:** The `filters` object requires both `asins` and `marketplaceId`.

**Solution:** Always include both: `filters: { asins: [], marketplaceId: "..." }`

### Error: "Unknown field argument aggregateBy"

**Cause:** Using wrong parameter name.

**Solution:** Use `dateAggregation: DAY` instead of `aggregateBy: DATE`.

### Error: "429 QuotaExceeded"

**Cause:** Too many concurrent or recent queries.

**Solution:** Wait for existing queries to complete before creating new ones.

## Rate Limiting

DataKiosk has strict rate limits:
- Limited number of concurrent queries
- Queries take time to process (minutes, not seconds)
- Use "Run Query and Download" operation to handle this automatically

## Processing Time

DataKiosk queries are **asynchronous** and can take several minutes:
- Simple queries (7 days, few ASINs): 1-3 minutes
- Complex queries (90 days, many ASINs): 5-10 minutes
- First-time queries: Longer (no cached data)

**Be patient!** The polling mechanism will wait automatically.

## Data Format

Results are returned as JSON:

```json
{
  "analytics_salesAndTraffic_2024_04_24": {
    "salesAndTrafficTrends": [
      {
        "marketplaceId": "ATVPDKIKX0DER",
        "startDate": "2024-10-04",
        "endDate": "2024-10-04",
        "traffic": {
          "pageViews": 1250,
          "sessions": 450,
          "unitSessionPercentage": 8.5
        },
        "sales": {
          "unitsOrdered": 38,
          "orderedProductSales": {
            "amount": 1234.56,
            "currencyCode": "USD"
          }
        }
      }
      // ... more data points
    ]
  }
}
```

## Best Practices

1. **Use Specific Date Ranges**: Don't query more data than needed
2. **Filter by ASIN**: Query specific ASINs when possible
3. **Choose Appropriate Aggregation**: Use MONTH for long periods
4. **Cache Results**: DataKiosk data doesn't change frequently
5. **Handle Pagination**: Some queries return multiple pages
6. **Monitor Rate Limits**: Wait for queries to complete
7. **Use Schema Explorer**: Discover available fields for your use case

## Resources

- 📖 [Amazon DataKiosk Schema Explorer](https://sellercentral.amazon.com/datakiosk-schema-explorer)
- 📚 [SP-API DataKiosk Documentation](https://developer-docs.amazon.com/sp-api/docs/datakiosk-api-v2023-11-15-reference)
- 🧪 Test Scripts: `test-datakiosk-final.js` and `check-query-status.js`

## Support

For questions or issues:
1. Check this guide
2. Review the Schema Explorer
3. Test with the provided test scripts
4. Check Amazon's SP-API documentation

---

**Last Updated:** October 11, 2025
**Schema Version:** 2024-04-24
**API Version:** 2023-11-15

