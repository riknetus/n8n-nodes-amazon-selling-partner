# GST and VAT Invoice Reports Guide

This guide covers the new GST and VAT invoice reporting functionality added to the Amazon Selling Partner n8n node.

## Overview

The Amazon Selling Partner node now supports downloading GST (for India) and VAT (for EU/UK) invoice reports through the Amazon SP-API Reports API. This functionality allows sellers to:

- Download GST tax reports for Indian marketplace compliance
- Download VAT invoice data reports for EU/UK marketplace compliance
- Get VAT invoice PDF download links
- Handle encrypted and compressed report files automatically
- Parse report data to JSON or return as binary files

## Supported Operations

### 1. Get GST Report

Downloads GST tax reports for the Indian marketplace (Amazon.in).

**Available Report Types:**
- `GST_MTR_B2B` - Business-to-business GST tax report (scheduled only)
- `GST_MTR_B2C` - Business-to-consumer GST tax report (scheduled only)
- `GET_GST_MTR_B2B_CUSTOM` - On-demand B2B GST tax report with date range
- `GET_GST_MTR_B2C_CUSTOM` - On-demand B2C GST tax report with date range
- `GST_MTR_STOCK_TRANSFER_REPORT` - GST stock transfer report
- `GET_GST_STR_ADHOC` - On-demand stock transfer report with date range

**Requirements:**
- Valid Indian seller account with GST registration
- Marketplace ID must be `A21TJRUUN4KGV` (Amazon.in)
- Date range limited to 31 days for custom reports

### 2. Get VAT Invoice Report

Downloads VAT Invoice Data Reports (VIDR) for EU/UK marketplaces.

**Available Report Types:**
- `GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT` - Tab-delimited flat file
- `GET_XML_VAT_INVOICE_DATA_REPORT` - XML format

**Supported Marketplaces:**
- `A1F83G8C2ARO7P` - Amazon.co.uk (UK)
- `A1PA6795UKMFR9` - Amazon.de (Germany)
- `A13V1IB3VIYZZH` - Amazon.fr (France)
- `APJ6JRA9NG5V4` - Amazon.it (Italy)
- `A1RKKUPIHCS9HS` - Amazon.es (Spain)
- `A1805IZSGTT6HS` - Amazon.nl (Netherlands)
- `A2NODRKZP88ZB9` - Amazon.se (Sweden)
- `A1C3SOZRARQ6R3` - Amazon.pl (Poland)

**Requirements:**
- Valid EU/UK seller account
- Date range limited to 30 days when not using pending invoices only

### 3. Get VAT Invoice PDF Links

Downloads VAT calculation reports that contain PDF download links for invoices.

**Report Type:** `SC_VAT_TAX_REPORT`

## Configuration Options

### Date Range Settings

For custom reports, you can specify:
- **Start Date**: Beginning of the report period (ISO 8601 format)
- **End Date**: End of the report period (ISO 8601 format)

### Report Options (VAT Reports)

- **Pending Invoices Only**: Include only shipments with pending invoices
- **Include All Statuses**: Include shipments with all invoice statuses (requires date range)

### Output Options

- **Return Binary File**: Return the raw file as binary data (default: true)
- **Parse CSV to JSON**: Parse CSV/TSV content to JSON array (for flat file reports)
- **Binary Property Name**: Name of the binary property to store the file (default: "data")

### Advanced Options

- **Max Poll Time (minutes)**: Maximum time to wait for report generation (1-30 minutes, default: 10)
- **Poll Interval (seconds)**: How often to check report status (10-300 seconds, default: 30)

## Rate Limiting

The Reports API has strict rate limits:
- **Rate**: 0.0167 requests per second (1 request per 60 seconds)
- **Burst**: 15 requests

The node automatically handles rate limiting and will queue requests as needed.

## Example Workflows

### Example 1: Download GST B2B Report for Last Week

```json
{
  "resource": "invoices",
  "operation": "getGstReport",
  "reportType": "GET_GST_MTR_B2B_CUSTOM",
  "marketplaceId": "A21TJRUUN4KGV",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-07T23:59:59Z",
  "outputOptions": {
    "returnBinary": true,
    "parseToJson": false
  }
}
```

### Example 2: Get VAT Invoice Data as JSON

```json
{
  "resource": "invoices",
  "operation": "getVatInvoiceReport",
  "reportType": "GET_FLAT_FILE_VAT_INVOICE_DATA_REPORT",
  "marketplaceId": "A1F83G8C2ARO7P",
  "reportOptions": {
    "pendingInvoices": true
  },
  "outputOptions": {
    "returnBinary": false,
    "parseToJson": true
  }
}
```

### Example 3: Download VAT PDF Links

```json
{
  "resource": "invoices",
  "operation": "getVatInvoicePdfLinks",
  "marketplaceId": "A1PA6795UKMFR9",
  "outputOptions": {
    "returnBinary": true
  }
}
```

## Response Format

### Binary Response

When `returnBinary` is true:

```json
{
  "json": {
    "reportId": "12345678901234567890",
    "reportType": "GET_GST_MTR_B2B_CUSTOM",
    "processingTime": 45000,
    "fileSize": 1024,
    "success": true
  },
  "binary": {
    "data": {
      "data": "base64-encoded-file-content",
      "mimeType": "text/plain",
      "fileName": "GET_GST_MTR_B2B_CUSTOM_2024-01-15.txt"
    }
  }
}
```

### JSON Response

When `parseToJson` is true:

```json
{
  "json": {
    "reportId": "12345678901234567890",
    "reportType": "GET_GST_MTR_B2B_CUSTOM",
    "processingTime": 45000,
    "recordCount": 150,
    "data": [
      {
        "Order ID": "123-1234567-1234567",
        "GSTIN": "12ABCDE3456F7GH",
        "Tax Amount": "100.00",
        "Invoice Date": "2024-01-15"
      }
    ],
    "success": true
  }
}
```

## Error Handling

The node provides detailed error messages for common issues:

- **Invalid marketplace**: Specific validation for GST (India only) and VAT (EU/UK only) reports
- **Date range validation**: Automatic validation of maximum date ranges
- **Rate limiting**: Automatic queuing and retry with exponential backoff
- **Report generation timeout**: Configurable timeout with helpful error messages
- **Decryption errors**: Detailed error messages for encrypted report issues

## Security Features

- **Automatic decryption**: Handles AES-256-CBC encrypted reports transparently
- **Secure credential handling**: Uses existing SP-API credential management
- **Rate limit compliance**: Prevents API quota exhaustion
- **Input validation**: Validates all parameters before API calls

## Testing

The implementation includes comprehensive tests:

### Unit Tests
- `ReportDownloader.test.ts` - Tests for report downloading and decryption
- `Invoices.test.ts` - Tests for invoice operations logic

### Integration Tests
- `InvoicesIntegration.test.ts` - End-to-end tests with SP-API sandbox

### Running Tests

```bash
# Run all tests (requires Docker)
npm test

# Run specific test files
npx jest nodes/AmazonSellingPartner/helpers/__tests__/ReportDownloader.test.ts
```

## Troubleshooting

### Common Issues

1. **"GST reports are only available for Amazon.in marketplace"**
   - Ensure you're using marketplace ID `A21TJRUUN4KGV` for GST reports
   - Verify your seller account is registered in India

2. **"VAT invoice reports are only available for EU/UK marketplaces"**
   - Use a valid EU/UK marketplace ID
   - Verify your seller account is registered in the target country

3. **"Date range cannot exceed X days"**
   - GST reports: Maximum 31 days
   - VAT reports: Maximum 30 days
   - Adjust your date range accordingly

4. **"Report generation timed out"**
   - Increase the `maxPollTimeMinutes` setting
   - Some reports may take longer to generate during peak times

5. **Rate limiting errors**
   - The node automatically handles rate limiting
   - If you see persistent rate limit errors, reduce the frequency of requests

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=amazon-sp-api:*
```

## Compliance Notes

- **GST Reports**: Required for GST compliance in India. Ensure regular downloads for tax filing.
- **VAT Reports**: Required for VAT compliance in EU/UK. Different countries may have different requirements.
- **Data Retention**: Consider your local data retention requirements when storing downloaded reports.
- **Encryption**: All report downloads support automatic decryption of encrypted files.

## API Limits and Quotas

- **Reports API**: 1 request per 60 seconds per seller account
- **Report Document Downloads**: No specific limits, but use reasonable intervals
- **Report Retention**: Amazon typically retains reports for 90 days

## Support

For issues specific to this implementation:
1. Check the error messages and this guide
2. Review the test files for usage examples
3. Verify your SP-API credentials and permissions
4. Check Amazon's SP-API documentation for any API changes 