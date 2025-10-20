# SP-API Sandbox Integration Tests Runner
# This script sets up environment variables and runs the integration tests

Write-Host "Setting up SP-API Sandbox environment variables..." -ForegroundColor Green

# Set sandbox credentials (replace with your actual values)
$env:SP_API_LWA_CLIENT_ID = "YOUR_SANDBOX_CLIENT_ID"
$env:SP_API_LWA_CLIENT_SECRET = "YOUR_SANDBOX_CLIENT_SECRET"
$env:SP_API_LWA_REFRESH_TOKEN = "YOUR_SANDBOX_REFRESH_TOKEN"

# Set region and marketplace (India sandbox)
$env:SP_API_AWS_REGION = "eu-west-1"
$env:SP_API_MARKETPLACE_ID = "A21TJRUUN4KGV"

# Map legacy environment variables for compatibility
$env:SPAPI_SANDBOX_LWA_CLIENT_ID = $env:SP_API_LWA_CLIENT_ID
$env:SPAPI_SANDBOX_LWA_CLIENT_SECRET = $env:SP_API_LWA_CLIENT_SECRET
$env:SPAPI_SANDBOX_LWA_REFRESH_TOKEN = $env:SP_API_LWA_REFRESH_TOKEN

# Optional: Set test order ID if you have one
# $env:SPAPI_SANDBOX_TEST_ORDER_ID = "123-1234567-1234567"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  SP_API_LWA_CLIENT_ID: $($env:SP_API_LWA_CLIENT_ID)" -ForegroundColor Gray
Write-Host "  SP_API_AWS_REGION: $($env:SP_API_AWS_REGION)" -ForegroundColor Gray
Write-Host "  SP_API_MARKETPLACE_ID: $($env:SP_API_MARKETPLACE_ID)" -ForegroundColor Gray

Write-Host "`nRunning SP-API Sandbox Integration Tests..." -ForegroundColor Green
Write-Host "This may take several minutes as tests make real API calls to Amazon's sandbox." -ForegroundColor Yellow

# Run the integration tests
npm run test:integration

Write-Host "`nSandbox tests completed!" -ForegroundColor Green
Write-Host "Check the output above for any failures or issues." -ForegroundColor Yellow
