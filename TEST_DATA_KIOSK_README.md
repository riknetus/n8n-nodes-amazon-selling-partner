# Testing the Correct Data Kiosk API

This test script verifies that the **correct** Data Kiosk API (version 2023-11-15) works with your credentials.

## 🚨 What Was Wrong

The current implementation uses:
```
POST /dataKiosk/2024-04-24/analytics/salesAndTraffic  ❌ WRONG - This endpoint doesn't exist!
```

The correct API uses:
```
POST /dataKiosk/2023-11-15/queries  ✅ CORRECT - Official API endpoint
```

## 🧪 How to Test

### Option 1: Using Environment Variables (Safer)

```bash
# Set credentials as environment variables
export AMZN_REFRESH_TOKEN="your-refresh-token-here"
export AMZN_CLIENT_ID="your-client-id-here"
export AMZN_CLIENT_SECRET="your-client-secret-here"

# Run the test
node test-data-kiosk-correct.js
```

### Option 2: Edit the Script (Quick Test)

1. Open `test-data-kiosk-correct.js`
2. Replace the placeholders on lines 5-7 with your actual credentials
3. Run: `node test-data-kiosk-correct.js`

## 📋 What the Test Does

The script follows the correct Data Kiosk API flow:

1. **Get LWA Access Token** - Authenticates with Amazon
2. **Create GraphQL Query** - Submits a query for sales & traffic data (last 30 days)
3. **Poll Query Status** - Waits for query to complete (checks every 3 seconds)
4. **Get Document URL** - Retrieves the presigned URL for results
5. **Download Data** - Downloads and displays the data

## ✅ Expected Results

### If You Have Brand Analytics Role:
```
✅ ALL TESTS PASSED!
The correct Data Kiosk API (2023-11-15) works!
```

### If You DON'T Have Brand Analytics Role:
```
❌ Query Creation Failed!
Status: 403
⚠️  The Data Kiosk API requires "Brand Analytics" role
```

## 🎯 What This Proves

- ✅ The **correct** endpoint exists: `/dataKiosk/2023-11-15/queries`
- ❌ The **current** implementation uses wrong endpoint: `/dataKiosk/2024-04-24/analytics/salesAndTraffic`
- 🔧 The implementation needs to be fixed regardless of the role issue

## 📝 After Testing

Once tested, we'll implement the correct API in the node:

1. Update `buildDataKioskEndpoint()` function
2. Implement GraphQL query builder
3. Add query polling logic
4. Add document download functionality
5. Update operation flow to match official API

## 🔐 Security Note

**Remember to:**
- ✅ Use environment variables for credentials
- ❌ Never commit credentials to git
- 🔄 Rotate credentials after testing (since they were posted publicly)

