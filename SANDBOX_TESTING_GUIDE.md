# SP-API Sandbox Testing Guide

This guide explains how to run comprehensive sandbox tests for all implemented SP-API functionality.

## Prerequisites

1. **Sandbox Credentials**: You need valid Amazon SP-API sandbox credentials
2. **Node.js**: Version 16+ with npm
3. **PowerShell**: For running the test script (Windows)

## Setup

### 1. Environment Variables

Create a `.env` file in the project root with your sandbox credentials:

```env
# Required: LWA (Login with Amazon) credentials for sandbox
SP_API_LWA_CLIENT_ID=your_sandbox_client_id_here
SP_API_LWA_CLIENT_SECRET=your_sandbox_client_secret_here
SP_API_LWA_REFRESH_TOKEN=your_sandbox_refresh_token_here

# Required: AWS region and marketplace for sandbox
SP_API_AWS_REGION=eu-west-1
SP_API_MARKETPLACE_ID=A21TJRUUN4KGV

# Optional: Test order ID for order detail tests (if you have one)
# SPAPI_SANDBOX_TEST_ORDER_ID=123-1234567-1234567
```

### 2. Getting Sandbox Credentials

1. Go to [Amazon Developer Console](https://developer.amazon.com/)
2. Create a new application or use existing one
3. Enable "Sandbox" environment
4. Generate LWA credentials (Client ID, Client Secret)
5. Use the refresh token from your OAuth flow
6. Ensure your application has the required SP-API roles

## Running Tests

### Option 1: PowerShell Script (Recommended)

```powershell
# Edit the script with your credentials first
.\run-sandbox-tests.ps1
```

### Option 2: Manual Environment Setup

```powershell
# Set environment variables
$env:SP_API_LWA_CLIENT_ID="your_client_id"
$env:SP_API_LWA_CLIENT_SECRET="your_client_secret"
$env:SP_API_LWA_REFRESH_TOKEN="your_refresh_token"
$env:SP_API_AWS_REGION="eu-west-1"
$env:SP_API_MARKETPLACE_ID="A21TJRUUN4KGV"

# Run tests
npm run test:integration
```

### Option 3: Using .env file

```bash
# Create .env file with credentials
# Then run tests
npm run test:integration
```

## Test Coverage

The sandbox tests cover all implemented SP-API resources:

### ✅ Preflight Smoke Tests
- LWA token exchange
- Base URL resolution
- Sellers endpoint connectivity

### ✅ Orders API
- Get orders with date range validation
- Get order details
- Get order items
- Rate limiting handling
- Invalid marketplace ID handling

### ✅ Shipments Operations
- Confirm shipment
- Update shipment status
- Error handling for missing permissions

### ✅ Listings Operations
- List ASINs with pagination
- Get listing details by SKU
- Error handling for missing data

### ✅ Finance Operations
- List financial event groups
- List financial events
- List transactions (2024-06-19 endpoint)
- Error handling for missing roles

### ✅ Reports Operations
- Create sales traffic report
- Get report types
- Error handling for missing permissions

### ✅ Invoices Operations
- GST report (India marketplace)
- VAT invoice report (EU/UK marketplace)
- Error handling for missing roles

### ✅ Data Kiosk Operations
- Create GraphQL query
- Get queries list
- Error handling for missing Brand Analytics role

### ✅ Analytics Operations
- Validate access
- Error handling for missing permissions

## Expected Behavior

### Success Cases
- **200 OK**: Valid responses with proper data structure
- **202 Accepted**: Report/query creation successful
- **Empty Results**: Valid empty arrays (sandbox may have no data)

### Expected Error Cases (Treated as Pass)
- **403 Forbidden**: Missing required roles/permissions
- **404 Not Found**: No data available in sandbox
- **422 Unprocessable Entity**: Validation errors with proper error structure

### Unexpected Cases (Test Failures)
- **401 Unauthorized**: Invalid credentials
- **500 Internal Server Error**: Amazon server issues
- **Malformed Responses**: Invalid JSON or missing required fields

## Test Results Interpretation

### ✅ Passing Tests
- Tests that receive expected 200/202 responses
- Tests that receive expected 403/404/422 errors with proper error structure
- Tests that validate error handling correctly

### ❌ Failing Tests
- Tests that receive unexpected status codes
- Tests that receive malformed error responses
- Tests that timeout or fail to connect

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check your LWA credentials
   - Verify refresh token is valid
   - Ensure application is in sandbox mode

2. **403 Forbidden**
   - This is expected for many endpoints without proper roles
   - Tests should pass if error structure is correct

3. **Rate Limiting**
   - Tests include rate limiting handling
   - Reduce concurrent requests if needed

4. **Timeout Issues**
   - Increase Jest timeout in `jest.integration.config.js`
   - Check network connectivity

### Debug Mode

Run tests with verbose output:

```bash
npm run test:integration -- --verbose
```

## Security Notes

- **Never commit real credentials** to version control
- **Use sandbox credentials only** for testing
- **Rotate credentials** regularly
- **Monitor API usage** in Amazon Developer Console

## Next Steps

After successful sandbox testing:

1. **Review test results** for any unexpected failures
2. **Document any missing roles** needed for production
3. **Update error handling** based on sandbox responses
4. **Prepare for production testing** with real credentials

## Support

For issues with:
- **Amazon SP-API**: Check [Amazon Developer Documentation](https://developer-docs.amazon.com/sp-api/)
- **n8n Node**: Check [n8n Documentation](https://docs.n8n.io/)
- **Test Implementation**: Review test files in `__tests__/integration/`
