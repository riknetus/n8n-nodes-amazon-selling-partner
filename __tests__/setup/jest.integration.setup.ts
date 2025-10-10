// Set UTC timezone for consistent test behavior
process.env.TZ = 'UTC';

// Set longer timeout for integration tests
jest.setTimeout(Number(process.env.JEST_TIMEOUT ?? 60000));

// Integration tests can use real network connections
// No nock restrictions here

