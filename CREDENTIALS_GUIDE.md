# Amazon SP-API Credentials Guide

## Overview

This guide explains the simplified credential structure for the Amazon Selling Partner API node. You now have two options for authentication:

1. **LWA-Only Authentication** (Recommended) - Simple setup with just Login with Amazon credentials
2. **LWA + AWS SigV4 Authentication** - Advanced setup for specific use cases

## Option 1: LWA-Only Authentication (Recommended)

### When to Use
- Most SP-API operations including Orders, Products, Inventory
- Simpler setup and maintenance
- Recommended for new implementations

### Required Credentials
```json
{
  "environment": "sandbox",
  "awsRegion": "us-east-1",
  "lwaClientId": "amzn1.application-oa2-client.your-client-id",
  "lwaClientSecret": "amzn1.application-oa2-client.secret.your-client-secret",
  "lwaRefreshToken": "Atzr|IwEBIH...your-refresh-token"
}
```

### Setup Steps
1. Go to Amazon Developer Console
2. Create SP-API application
3. Note your LWA Client ID and Client Secret
4. Complete the authorization flow to get a refresh token
5. In n8n, create credentials with just these LWA fields

## Option 2: LWA + AWS SigV4 Authentication

### When to Use
- Your application specifically requires AWS SigV4 signing
- Certain advanced SP-API operations that mandate AWS signing
- Enhanced security requirements

### Required Credentials
```json
{
  "environment": "sandbox",
  "awsRegion": "us-east-1",
  "lwaClientId": "amzn1.application-oa2-client.your-client-id",
  "lwaClientSecret": "amzn1.application-oa2-client.secret.your-client-secret",
  "lwaRefreshToken": "Atzr|IwEBIH...your-refresh-token",
  "advancedOptions": {
    "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "useAwsSigning": true
  }
}
```

### Setup Steps
1. Complete all LWA setup steps from Option 1
2. Create AWS IAM user with SP-API permissions
3. Generate AWS Access Key and Secret
4. In n8n credentials, expand "Advanced Options"
5. Add AWS credentials and enable "Use AWS SigV4 Signing"

## Migration from Previous Version

If you're upgrading from a previous version where AWS credentials were required:

### Automatic Migration
The node automatically detects old credential structures and continues to work. If you have AWS credentials in the root level, they will still be used.

### Recommended Migration
1. Test your workflows with LWA-only authentication
2. If they work correctly, remove AWS credentials
3. Keep AWS credentials only if you encounter authentication errors

## Troubleshooting

### "AWS credentials are required" Error
This means AWS signing is enabled but credentials are missing:
- Check if "Use AWS SigV4 Signing" is enabled in Advanced Options
- If not needed, disable AWS signing
- If needed, add valid AWS credentials

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
  "awsRegion": "us-east-1",
  "lwaClientId": "your-sandbox-client-id",
  "lwaClientSecret": "your-sandbox-client-secret",
  "lwaRefreshToken": "your-sandbox-refresh-token"
}
```

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

## Supported Operations

- All Orders operations, including **getOrders**, **getOrder** (order details), and **getOrderItems** (order line items), work with LWA-only authentication. No additional scopes or AWS credentials are required for these endpoints.

This simplified approach makes the Amazon SP-API node much easier to set up and use while maintaining full compatibility with existing implementations. 