// Load environment variables from .env file
import 'dotenv/config';

// Set UTC timezone for consistent test behavior
process.env.TZ = 'UTC';

// Set longer timeout for integration tests
jest.setTimeout(Number(process.env.JEST_TIMEOUT ?? 60000));

// Integration tests can use real network connections
// No nock restrictions here

// Map environment variables for consistency across test files
process.env.SP_API_AWS_REGION ??= 'eu-west-1';
process.env.SP_API_MARKETPLACE_ID ??= 'A21TJRUUN4KGV';
process.env.SPAPI_SANDBOX_LWA_CLIENT_ID ??= process.env.SP_API_LWA_CLIENT_ID;
process.env.SPAPI_SANDBOX_LWA_CLIENT_SECRET ??= process.env.SP_API_LWA_CLIENT_SECRET;
process.env.SPAPI_SANDBOX_LWA_REFRESH_TOKEN ??= process.env.SP_API_LWA_REFRESH_TOKEN;

