# Amazon SP-API Credentials Guide

## Overview

This guide explains the simplified credential structure for the Amazon Selling Partner API node. Authentication is via **LWA-Only**.

## 🚨 Critical: Marketplace Selection

**The #1 cause of 403 Unauthorized errors is selecting the wrong marketplace or AWS region!**

### Marketplace-to-Region Mapping

When configuring credentials, you **MUST** select:
1. **Primary Marketplace** - The marketplace where you authorized your SP-API app in Seller Central
2. **AWS Region** - The region that corresponds to your marketplace

| AWS Region | Region Name | Marketplaces |
|------------|-------------|--------------|
| **us-east-1** | North America | 🇺🇸 US, 🇨🇦 Canada, 🇲🇽 Mexico, 🇧🇷 Brazil |
| **eu-west-1** | Europe | 🇬🇧 UK, 🇩🇪 Germany, 🇫🇷 France, 🇮🇹 Italy, 🇪🇸 Spain, 🇳🇱 Netherlands, 🇵🇱 Poland, 🇸🇪 Sweden, 🇧🇪 Belgium, 🇮🇳 India, 🇹🇷 Turkey, 🇦🇪 UAE, 🇸🇦 Saudi Arabia, 🇪🇬 Egypt |
| **us-west-2** | Far East | 🇯🇵 Japan, 🇦🇺 Australia, 🇸🇬 Singapore |

### Example: India Marketplace

If you're selling on Amazon India (amazon.in):
- **Primary Marketplace**: 🇮🇳 India (amazon.in) - `A21TJRUUN4KGV`
- **AWS Region**: Europe (eu-west-1)
- **Endpoint**: `https://sellingpartnerapi-eu.amazon.com`

### Common Mistakes

❌ **Wrong**: Selecting US marketplace when authorized for India → 403 Unauthorized  
✅ **Correct**: Selecting India marketplace with EU region → Success

❌ **Wrong**: Using `us-east-1` for India  
✅ **Correct**: Using `eu-west-1` for India

## LWA-Only Authentication (Required)

### When to Use
- Most SP-API operations including Orders, Products, Inventory
- Simpler setup and maintenance
- Recommended for new implementations

### Required Credentials
```json
{
  "environment": "production",
  "primaryMarketplace": "A21TJRUUN4KGV",
  "awsRegion": "eu-west-1",
  "lwaClientId": "amzn1.application-oa2-client.your-client-id",
  "lwaClientSecret": "amzn1.application-oa2-client.secret.your-client-secret",
  "lwaRefreshToken": "Atzr|IwEBIH...your-refresh-token"
}
```

### Setup Steps
1. Go to Amazon Developer Console
2. Create SP-API application
3. Authorize your app in Seller Central and note which marketplace you selected
4. Note your LWA Client ID and Client Secret
5. Complete the authorization flow to get a refresh token
6. In n8n, create credentials:
   - **Primary Marketplace**: Select the marketplace you authorized (e.g., India for amazon.in)
   - **AWS Region**: Select the matching region (e.g., Europe for India)
   - Add your LWA credentials


## Migration from Previous Version

If you're upgrading from a previous version where AWS credentials were required:

### Automatic Migration
The node automatically detects old credential structures and continues to work. If you have AWS credentials in the root level, they will still be used.

### Recommended Migration
1. Test your workflows with LWA-only authentication
2. If they work correctly, remove AWS credentials
3. Keep AWS credentials only if you encounter authentication errors

## Troubleshooting

### ❌ "403 Unauthorized" or "Access to requested resource is denied"

**This is the #1 most common error!** It happens when your marketplace and AWS region don't match.

**Symptoms:**
- Your LWA token exchange succeeds (you get an access token)
- ALL SP-API calls fail with 403 Unauthorized

**Solution:**
1. Check which marketplace you authorized in Seller Central
2. Update your n8n credentials:
   - Set **Primary Marketplace** to match your authorized marketplace
   - Set **AWS Region** to match (see table above)
3. For India sellers: Use `eu-west-1`, NOT `us-east-1`!

**Example Fix:**
```
Wrong Configuration:
✗ Primary Marketplace: US (ATVPDKIKX0DER)
✗ AWS Region: us-east-1
✗ Your actual marketplace: India

Correct Configuration:
✓ Primary Marketplace: India (A21TJRUUN4KGV)
✓ AWS Region: eu-west-1
✓ Your actual marketplace: India
```

### "AWS credentials are required" Error
Not applicable. AWS IAM signing is not used in this node.

### "LWA authentication failed" Error
This is related to Login with Amazon credentials:
- Verify Client ID and Client Secret are correct
- Check that refresh token is valid and not expired
- Ensure your SP-API application is properly configured

### Testing Your Setup
Use the sandbox environment first:
```json
{
  "environment": "sandbox",
  "primaryMarketplace": "ATVPDKIKX0DER",
  "awsRegion": "us-east-1",
  "lwaClientId": "your-sandbox-client-id",
  "lwaClientSecret": "your-sandbox-client-secret",
  "lwaRefreshToken": "your-sandbox-refresh-token"
}
```

**Note**: Sandbox typically uses US marketplace (`ATVPDKIKX0DER`) regardless of your production marketplace.

## Best Practices

1. **Start Simple**: Begin with LWA-only authentication
2. **Use Sandbox**: Always test in sandbox environment first
3. **Secure Storage**: Use n8n's encrypted credential storage
4. **Token Refresh**: Refresh tokens can expire - monitor for authentication errors
5. **Environment Separation**: Use different credentials for sandbox vs production

## Example Workflows

### Basic Order Retrieval (LWA-Only)
```json
{
  "nodes": [
    {
      "name": "Get Recent Orders",
      "type": "n8n-nodes-amazon-selling-partner.amazonSellingPartner",
      "parameters": {
        "resource": "orders",
        "operation": "getOrders",
        "marketplaceIds": ["ATVPDKIKX0DER"],
        "createdAfter": "2024-01-01T00:00:00Z",
        "createdBefore": "2024-01-07T23:59:59Z"
      },
      "credentials": {
        "amazonSpApi": "your-lwa-only-credential"
      }
    }
  ]
}
```

## Restricted Data Tokens (RDT) for PII Endpoints

For endpoints that return personally identifiable information (PII), you need to use Restricted Data Tokens instead of regular LWA tokens. This includes:

- Buyer information in orders
- Customer addresses
- Payment information
- Other sensitive data

### Using RDT in Your Workflows

When calling PII endpoints, specify the restricted resources in your request:

```typescript
// Example: Get order with buyer information
const response = await SpApiRequest.makeRequest(this, {
  method: 'GET',
  endpoint: '/orders/v0/orders/123-4567890-1234567',
  restrictedResources: [
    {
      method: 'GET',
      path: '/orders/v0/orders/123-4567890-1234567',
      dataElements: ['buyerInfo']
    }
  ]
});
```

### RDT Resource Configuration

Each restricted resource specifies:
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
- `path`: The API endpoint path
- `dataElements`: Optional array of specific data elements to restrict

The node automatically handles RDT token generation and uses it as the `x-amz-access-token` header for these requests.

## Supported Operations

- All Orders operations, including **getOrders**, **getOrder** (order details), and **getOrderItems** (order line items), work with LWA-only authentication. No additional scopes or AWS credentials are required for these endpoints.
- PII endpoints require Restricted Data Tokens as shown above.

This simplified approach makes the Amazon SP-API node much easier to set up and use while maintaining full compatibility with existing implementations. 