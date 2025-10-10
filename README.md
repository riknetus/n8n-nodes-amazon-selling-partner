# Amazon Selling Partner API Node for n8n

A production-grade n8n custom node for Amazon Selling Partner API with comprehensive error handling, rate limiting, monitoring, and security features.

## Features

### 🚀 Core Functionality
- **Orders Management**: Retrieve orders within date ranges with advanced filtering
- **Order Details**: Fetch detailed information for a specific order by Order ID
- **Order Items**: Retrieve all line items for a specific order, with automatic pagination
- **Finance API**: Complete financial events, transaction history, and financial event groups
- **Shipments Management**: Track and manage shipment operations and details
- **Product Listings**: Manage product catalog and inventory operations
- **Invoices & Reports**: Generate and retrieve invoices and financial reports
- **Reports (Sales & Returns)**: Pull Sales & Traffic business reports, FBA/MFN returns, refunds, and a consolidated sales vs returns view by ASIN/SKU
- **Simplified Authentication**: LWA (Login with Amazon) credentials only - AWS credentials optional
- **Multi-Marketplace Support**: Support for all Amazon marketplaces globally
- **Automatic Pagination**: Handle large result sets seamlessly

### 🛡️ Production-Ready Features
- **Advanced Rate Limiting**: Token bucket algorithm matching SP-API requirements
- **Intelligent Error Handling**: Comprehensive error categorization and recovery
- **Request Queuing**: Smooth traffic spikes and prevent throttling
- **Token Caching**: Efficient LWA token management with automatic refresh
- **Circuit Breaker Pattern**: Graceful degradation during API outages

### 🔒 Security & Compliance
- **Secure Credential Storage**: Encrypted credential management
- **Input Validation**: Comprehensive parameter validation
- **Audit Logging**: Security event tracking
- **Environment Isolation**: Separate sandbox and production configurations

## Installation

### Prerequisites
- n8n version 1.0.0 or higher
- Node.js 18.0.0 or higher
- Amazon Selling Partner API application credentials

### Install via npm
```bash
npm install n8n-nodes-amazon-selling-partner
```

### Install via n8n Community Nodes
1. Go to **Settings** > **Community Nodes** in your n8n instance
2. Search for `n8n-nodes-amazon-selling-partner`
3. Click **Install**

## Setup

### 1. Amazon SP-API Application Setup
1. Register as a developer in the [Amazon Developer Console](https://developer.amazon.com/)
2. Create a new SP-API application
3. Obtain your LWA credentials (Client ID, Client Secret)
4. Generate a refresh token through the authorization workflow

### 2. n8n Credential Configuration

#### Basic Setup (Recommended)
For most use cases, you only need LWA credentials:

1. In n8n, create a new **Amazon Selling Partner API** credential
2. Fill in the required fields:
   - **Environment**: Choose Sandbox for testing, Production for live data
   - **AWS Region**: Select your application's region
   - **LWA Client ID**: From your SP-API application
   - **LWA Client Secret**: From your SP-API application  
   - **LWA Refresh Token**: Generated during authorization

#### Advanced Setup (AWS SigV4 – required for live SP-API)
Amazon expects *every* call to be authenticated with an LWA access token **and** signed with AWS Signature Version 4. Skip the AWS keys and Amazon responds with `401/403 Authentication failed`.

Follow these steps (full walkthrough in `CREDENTIALS_GUIDE.md`):

1. Create an IAM user in the AWS account that owns your SP-API application (`IAM → Users → Create user`).
2. Attach a policy that allows `execute-api:Invoke` on the SP-API execute-api ARNs (see the minimal/region-scoped JSON in the guide).
3. Generate Access Key ID and Secret Access Key (`IAM → Users → <user> → Security credentials → Create access key`, choose *Application running outside AWS*).
4. In n8n credentials, expand **Advanced Options** and paste the keys.
5. Enable **Use AWS SigV4 Signing**. Optional: fill **AWS Role ARN** if you require assume-role; the node can sign directly with the user keys.

Keep the keys secure and rotate them regularly. If you add a new SP-API role later, re-authorize the seller to issue a fresh refresh token.

### 3. Grant Required SP-API Roles

- **Reports API** – needed for the Sales & Traffic report fallback (`GET_SALES_AND_TRAFFIC_REPORT`).
- **Selling Partner Insights / Data Kiosk** – needed for the Data Kiosk analytics endpoints.

Ensure these roles are assigned to your app in Developer Central *and* authorized by the seller account. After adding roles, restart the authorization flow to obtain a refresh token that carries the new scopes.

### 4. Smoke test before complex operations

Create a workflow with the Amazon Selling Partner node:

1. Resource `sellers`, operation `getMarketplaceParticipations`.
2. Execute the node.
   - **200 OK** → credentials and signing are correct.
   - **401 Unauthorized** → AWS signing disabled/incorrect keys.
   - **403 Forbidden** → seller hasn’t authorized the required role or the app lacks it.

### 5. Running Analytics

- Set `Analytics → Advanced Options → analyticsMode = auto`. The node tries Data Kiosk first and falls back to Reports if necessary.
- If you know you lack Data Kiosk role, set `analyticsMode = reports` to skip the 403.
- Provide `marketplaceIds`, date range, and ASIN/SKU filters that match the target mode.

### 6. Refreshing LWA credentials

Still getting LWA errors after signing? Rotate the LWA client secret, re-authorize the seller, and paste the new refresh token into n8n.

## Usage

### Basic Orders Retrieval
```json
{
  "resource": "orders",
  "operation": "getOrders",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "createdAfter": "2024-01-01T00:00:00Z",
  "createdBefore": "2024-01-31T23:59:59Z"
}
```

### Get Order Details
```json
{
  "resource": "orders",
  "operation": "getOrder",
  "orderId": "123-1234567-1234567"
}
```

### Get Order Items
```json
{
  "resource": "orders",
  "operation": "getOrderItems",
  "orderId": "123-1234567-1234567",
  "returnAll": true
}
```

### Advanced Filtering
```json
{
  "resource": "orders",
  "operation": "getOrders",
  "marketplaceIds": ["ATVPDKIKX0DER", "A2EUQ1WTGCTBG2"],
  "createdAfter": "2024-01-01T00:00:00Z",
  "createdBefore": "2024-01-07T23:59:59Z",
  "additionalOptions": {
    "orderStatuses": ["Unshipped", "PartiallyShipped"],
    "fulfillmentChannels": ["AFN"],
    "maxResultsPerPage": 50,
    "returnAll": true
  }
}
```

### Finance API Operations

#### List Financial Event Groups
```json
{
  "resource": "finance",
  "operation": "listFinancialEventGroups",
  "financialEventGroupStartedAfter": "2024-01-01T00:00:00Z",
  "financialEventGroupStartedBefore": "2024-01-31T23:59:59Z",
  "additionalOptions": {
    "maxResultsPerPage": 100,
    "returnAll": true
  }
}
```

#### List Financial Events
```json
{
  "resource": "finance",
  "operation": "listFinancialEvents",
  "postedAfter": "2024-01-01T00:00:00Z",
  "postedBefore": "2024-01-31T23:59:59Z",
  "additionalOptions": {
    "maxResultsPerPage": 100,
    "returnAll": false
  }
}
```

#### List Financial Events by Group ID
```json
{
  "resource": "finance",
  "operation": "listFinancialEventsByGroupId",
  "eventGroupId": "12345678901234567890123456789012",
  "postedAfter": "2024-01-01T00:00:00Z",
  "additionalOptions": {
    "maxResultsPerPage": 50,
    "returnAll": true
  }
}
```

#### List Financial Events by Order ID
```json
{
  "resource": "finance",
  "operation": "listFinancialEventsByOrderId",
  "orderId": "123-1234567-1234567",
  "additionalOptions": {
    "returnAll": false
  }
}
```

#### List Transactions (Finances v2024-06-19)
```json
{
  "resource": "finance",
  "operation": "listTransactions",
  "postedAfter": "2024-01-01T00:00:00Z",
  "postedBefore": "2024-01-31T23:59:59Z",
  "marketplaceId": "ATVPDKIKX0DER",
  "additionalOptions": {
    "maxResultsPerPage": 100,
    "returnAll": true
  }
}
```

### Reports: Sales & Traffic by ASIN
```json
{
  "resource": "reports",
  "operation": "salesTrafficByAsin",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "dateFrom": "2024-08-01T00:00:00Z",
  "dateTo": "2024-08-07T23:59:59Z",
  "granularity": "DAILY",
  "aggregationLevel": "CHILD",
  "includeSessions": true
}
```

### Reports: Returns (FBA/MFN) by ASIN
```json
{
  "resource": "reports",
  "operation": "returnsByAsinFba",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "dateFrom": "2024-08-01T00:00:00Z",
  "dateTo": "2024-08-07T23:59:59Z",
  "granularity": "DAILY"
}
```

### Reports: Consolidated Sales & Returns
```json
{
  "resource": "reports",
  "operation": "consolidatedSalesAndReturnsByAsin",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "dateFrom": "2024-08-01T00:00:00Z",
  "dateTo": "2024-08-07T23:59:59Z",
  "granularity": "DAILY",
  "includeRefunds": false,
  "emitRawSubdatasets": false
}
```

### Reports: Refund Totals by Marketplace
```json
{
  "resource": "reports",
  "operation": "refundsByAsin",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "dateFrom": "2024-08-01T00:00:00Z",
  "dateTo": "2024-08-07T23:59:59Z"
}
```

## Supported Marketplaces

### North America
- 🇺🇸 Amazon.com (US) - `ATVPDKIKX0DER`
- 🇨🇦 Amazon.ca (Canada) - `A2EUQ1WTGCTBG2`
- 🇲🇽 Amazon.com.mx (Mexico) - `A1AM78C64UM0Y8`
- 🇧🇷 Amazon.com.br (Brazil) - `A2Q3Y263D00KWC`

### Europe
- 🇬🇧 Amazon.co.uk (UK) - `A1F83G8C2ARO7P`
- 🇩🇪 Amazon.de (Germany) - `A1PA6795UKMFR9`
- 🇫🇷 Amazon.fr (France) - `A13V1IB3VIYZZH`
- 🇮🇹 Amazon.it (Italy) - `APJ6JRA9NG5V4`
- 🇪🇸 Amazon.es (Spain) - `A1RKKUPIHCS9HS`
- 🇳🇱 Amazon.nl (Netherlands) - `A1805IZSGTT6HS`
- 🇸🇪 Amazon.se (Sweden) - `A2NODRKZP88ZB9`
- 🇵🇱 Amazon.pl (Poland) - `A1C3SOZRARQ6R3`

### Asia Pacific
- 🇯🇵 Amazon.co.jp (Japan) - `A1VC38T7YXB528`
- 🇦🇺 Amazon.com.au (Australia) - `A39IBJ37TRP1C6`
- 🇸🇬 Amazon.sg (Singapore) - `A19VAU5U5O7RUS`
- 🇦🇪 Amazon.ae (UAE) - `A2VIGQ35RCS4UG`
- 🇸🇦 Amazon.sa (Saudi Arabia) - `A17E79C6D8DWNP`
- 🇮🇳 Amazon.in (India) - `A21TJRUUN4KGV`

## Rate Limiting

This node implements Amazon's token bucket algorithm for rate limiting:

- **Automatic Rate Detection**: Reads rate limits from API response headers
- **Intelligent Queuing**: Queues requests when rate limits are exceeded
- **Exponential Backoff**: Implements backoff strategies for optimal throughput
- **Per-Endpoint Limits**: Different rate limits for different API operations

## Error Handling

### Automatic Retry Logic
- **Network Errors**: Automatic retry with exponential backoff
- **Rate Limiting (429)**: Intelligent waiting and retry
- **Temporary Server Errors (5xx)**: Configurable retry attempts

### Error Categories
- **Authentication Errors (401/403)**: Clear guidance on credential issues
- **Not Found Errors (404)**: Helpful context for missing resources
- **Validation Errors (400)**: Detailed parameter validation feedback
- **Rate Limit Errors (429)**: Actionable rate limiting guidance

## Development

### Building from Source
```bash
git clone https://github.com/your-org/n8n-nodes-amazon-selling-partner.git
cd n8n-nodes-amazon-selling-partner
npm install
npm run build
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in Docker (as per project convention)
npm run test:docker

# Run with coverage
npm test -- --coverage
```

### Linting and Formatting
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lintfix

# Format code
npm run format
```

## Troubleshooting

### Common Issues

#### "LWA authentication failed"
- Verify your LWA Client ID and Client Secret
- Ensure your refresh token is valid and not expired
- Check that your application has the correct roles assigned

#### "Request throttled by Amazon SP-API"
- Reduce request frequency
- Implement delays between requests
- Check your rate limits in the Amazon Developer Console

#### "Authentication failed (403)"
- Verify AWS credentials are correct
- Ensure IAM user has SP-API permissions
- Check that your application is approved for production (if using production)

#### "Date range cannot exceed 30 days"
- Amazon SP-API limits order queries to 30 days maximum
- Split larger date ranges into smaller chunks

### Debug Mode
Enable debug logging by setting the environment variable:
```bash
export DEBUG=n8n-amazon-sp-api:*
```

## Security Considerations

### Credential Security
- Never commit credentials to version control
- Use environment variables for sensitive data
- Regularly rotate AWS access keys
- Monitor credential usage in AWS CloudTrail

### Network Security
- Use HTTPS endpoints only
- Implement proper firewall rules
- Monitor for suspicious API activity
- Use AWS IAM roles when possible

## Performance Optimization

### Best Practices
- Use appropriate date ranges (avoid very large ranges)
- Implement pagination for large result sets
- Cache frequently accessed data
- Monitor rate limit usage

### Monitoring
- Track API response times
- Monitor error rates
- Set up alerts for rate limit breaches
- Monitor credential expiration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Follow the existing code style
- Ensure all tests pass

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/your-org/n8n-nodes-amazon-selling-partner/wiki)
- 🐛 [Issue Tracker](https://github.com/your-org/n8n-nodes-amazon-selling-partner/issues)
- 💬 [Discussions](https://github.com/your-org/n8n-nodes-amazon-selling-partner/discussions)
- 📧 [Email Support](mailto:support@yourorg.com)

## Acknowledgments

- Amazon Selling Partner API team for comprehensive documentation
- n8n community for the excellent node development framework
- All contributors who help improve this project

---

**Note**: This is an unofficial community-maintained node. It is not affiliated with or endorsed by Amazon or n8n. 