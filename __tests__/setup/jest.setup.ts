import nock from 'nock';

// Set UTC timezone for consistent test behavior
process.env.TZ = 'UTC';

// Set reasonable timeout for unit tests
jest.setTimeout(Number(process.env.JEST_TIMEOUT ?? 10000));

// Disable all network connections except localhost
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

// Clean up nock after each test
afterEach(() => {
  nock.cleanAll();
});

