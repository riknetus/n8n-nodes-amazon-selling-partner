"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsFields = exports.analyticsOperations = void 0;
const constants_1 = require("../operations/analytics/constants");
exports.analyticsOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['analytics'],
            },
        },
        options: [
            {
                name: 'Sales & Traffic by ASIN',
                value: 'salesAndTrafficByAsin',
                description: 'Get sales and traffic analytics data by ASIN',
                action: 'Get sales & traffic by ASIN',
            },
            {
                name: 'Validate Access',
                value: 'validateAccess',
                description: 'Test access to Analytics/Data Kiosk APIs',
                action: 'Validate analytics access',
            },
        ],
        default: 'salesAndTrafficByAsin',
    },
];
exports.analyticsFields = [
    // === REQUIRED FIELDS ===
    {
        displayName: 'Marketplace IDs',
        name: 'marketplaceIds',
        type: 'multiOptions',
        required: true,
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        options: [
            // North America
            { name: 'Amazon.com (US)', value: 'ATVPDKIKX0DER' },
            { name: 'Amazon.ca (Canada)', value: 'A2EUQ1WTGCTBG2' },
            { name: 'Amazon.com.mx (Mexico)', value: 'A1AM78C64UM0Y8' },
            { name: 'Amazon.com.br (Brazil)', value: 'A2Q3Y263D00KWC' },
            // Europe
            { name: 'Amazon.co.uk (UK)', value: 'A1F83G8C2ARO7P' },
            { name: 'Amazon.de (Germany)', value: 'A1PA6795UKMFR9' },
            { name: 'Amazon.fr (France)', value: 'A13V1IB3VIYZZH' },
            { name: 'Amazon.it (Italy)', value: 'APJ6JRA9NG5V4' },
            { name: 'Amazon.es (Spain)', value: 'A1RKKUPIHCS9HS' },
            { name: 'Amazon.nl (Netherlands)', value: 'A1805IZSGTT6HS' },
            { name: 'Amazon.se (Sweden)', value: 'A2NODRKZP88ZB9' },
            { name: 'Amazon.pl (Poland)', value: 'A1C3SOZRARQ6R3' },
            // Asia Pacific
            { name: 'Amazon.co.jp (Japan)', value: 'A1VC38T7YXB528' },
            { name: 'Amazon.com.au (Australia)', value: 'A39IBJ37TRP1C6' },
            { name: 'Amazon.sg (Singapore)', value: 'A19VAU5U5O7RUS' },
            { name: 'Amazon.ae (UAE)', value: 'A2VIGQ35RCS4UG' },
            { name: 'Amazon.sa (Saudi Arabia)', value: 'A17E79C6D8DWNP' },
            { name: 'Amazon.in (India)', value: 'A21TJRUUN4KGV' },
        ],
        default: ['ATVPDKIKX0DER'],
        description: 'Select the marketplaces to retrieve analytics data from',
    },
    // Date Range Selection
    {
        displayName: 'Date Range Type',
        name: 'dateRangeType',
        type: 'options',
        required: true,
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        options: [
            { name: 'Absolute (Specific Dates)', value: 'absolute' },
            { name: 'Relative (Preset or Custom)', value: 'relative' },
        ],
        default: 'relative',
        description: 'Choose how to specify the date range',
    },
    // Absolute Date Range
    {
        displayName: 'Start Date',
        name: 'startDate',
        type: 'dateTime',
        required: true,
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
                dateRangeType: ['absolute'],
            },
        },
        default: '',
        description: 'Start date for the analytics data (inclusive)',
    },
    {
        displayName: 'End Date',
        name: 'endDate',
        type: 'dateTime',
        required: true,
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
                dateRangeType: ['absolute'],
            },
        },
        default: '',
        description: 'End date for the analytics data (inclusive)',
    },
    // Relative Date Range
    {
        displayName: 'Date Preset',
        name: 'datePreset',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
                dateRangeType: ['relative'],
            },
        },
        options: [
            { name: 'Today', value: 'today' },
            { name: 'Yesterday', value: 'yesterday' },
            { name: 'Last 7 Days', value: 'last7days' },
            { name: 'Last 30 Days', value: 'last30days' },
            { name: 'Last 90 Days', value: 'last90days' },
            { name: 'Month to Date', value: 'mtd' },
            { name: 'Quarter to Date', value: 'qtd' },
            { name: 'Year to Date', value: 'ytd' },
            { name: 'Custom Range', value: 'custom' },
        ],
        default: 'last30days',
        description: 'Select a preset date range or choose custom',
    },
    {
        displayName: 'Custom Days',
        name: 'customDays',
        type: 'number',
        typeOptions: {
            minValue: 1,
            maxValue: 90,
        },
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
                dateRangeType: ['relative'],
                datePreset: ['custom'],
            },
        },
        default: 30,
        description: 'Number of days to look back from today',
    },
    // Granularity
    {
        displayName: 'Granularity',
        name: 'granularity',
        type: 'options',
        required: true,
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        options: [
            { name: 'Daily', value: 'DAILY' },
            { name: 'Weekly', value: 'WEEKLY' },
            { name: 'Monthly', value: 'MONTHLY' },
        ],
        default: 'DAILY',
        description: 'Time granularity for the analytics data',
    },
    // Timezone
    {
        displayName: 'Timezone',
        name: 'timezone',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        options: [
            { name: 'UTC', value: 'UTC' },
            { name: 'US/Eastern', value: 'America/New_York' },
            { name: 'US/Central', value: 'America/Chicago' },
            { name: 'US/Mountain', value: 'America/Denver' },
            { name: 'US/Pacific', value: 'America/Los_Angeles' },
            { name: 'Europe/London', value: 'Europe/London' },
            { name: 'Europe/Berlin', value: 'Europe/Berlin' },
            { name: 'Europe/Paris', value: 'Europe/Paris' },
            { name: 'Asia/Tokyo', value: 'Asia/Tokyo' },
            { name: 'Australia/Sydney', value: 'Australia/Sydney' },
        ],
        default: 'UTC',
        description: 'Timezone for date boundaries and output',
    },
    // === FILTERS ===
    {
        displayName: 'Filters',
        name: 'filters',
        type: 'collection',
        placeholder: 'Add Filter',
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'ASINs',
                name: 'asins',
                type: 'string',
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: 'Add ASIN',
                },
                default: [],
                description: 'Filter by specific ASINs (leave empty for all ASINs)',
                placeholder: 'B07ABC123XYZ',
            },
            {
                displayName: 'Parent ASIN',
                name: 'parentAsin',
                type: 'string',
                default: '',
                description: 'Filter by parent ASIN (for variation products)',
                placeholder: 'B07ABC123XYZ',
            },
            {
                displayName: 'Include Child ASINs',
                name: 'includeChildAsins',
                type: 'boolean',
                displayOptions: {
                    show: {
                        '/filters.parentAsin': [{ _cnd: { exists: true } }],
                    },
                },
                default: true,
                description: 'Include child ASINs when filtering by parent ASIN',
            },
            {
                displayName: 'SKUs',
                name: 'skus',
                type: 'string',
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: 'Add SKU',
                },
                default: [],
                description: 'Filter by SKUs (will be resolved to ASINs)',
                placeholder: 'MY-SKU-123',
            },
            {
                displayName: 'Resolve SKUs to ASINs',
                name: 'resolveSKUs',
                type: 'boolean',
                displayOptions: {
                    show: {
                        '/filters.skus': [{ _cnd: { exists: true } }],
                    },
                },
                default: true,
                description: 'Automatically resolve SKUs to ASINs using Listings API',
            },
            {
                displayName: 'Brands',
                name: 'brands',
                type: 'string',
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: 'Add Brand',
                },
                default: [],
                description: 'Filter by brand names',
                placeholder: 'My Brand',
            },
            {
                displayName: 'Fulfillment Channel',
                name: 'fulfillmentChannel',
                type: 'multiOptions',
                options: [
                    { name: 'Fulfilled by Amazon (AFN)', value: 'AFN' },
                    { name: 'Fulfilled by Merchant (MFN)', value: 'MFN' },
                ],
                default: [],
                description: 'Filter by fulfillment channel',
            },
            {
                displayName: 'Include Zero Activity',
                name: 'includeZeroActivity',
                type: 'boolean',
                default: false,
                description: 'Include ASINs with no sessions or sales in the results',
            },
            {
                displayName: 'Minimum Sessions',
                name: 'minSessions',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                },
                default: 0,
                description: 'Minimum number of sessions required',
            },
            {
                displayName: 'Minimum Sales',
                name: 'minSales',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                },
                default: 0,
                description: 'Minimum sales amount required',
            },
        ],
    },
    // === METRICS SELECTION ===
    {
        displayName: 'Metrics Selection',
        name: 'metricsSelection',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        default: {
            trafficMetrics: [{ metrics: ['sessions', 'pageViews'] }],
            salesMetrics: [{ metrics: ['unitsOrdered', 'orderedProductSales'] }],
            conversionMetrics: [{ metrics: ['unitSessionPercentage'] }],
        },
        options: [
            {
                displayName: 'Traffic Metrics',
                name: 'trafficMetrics',
                values: [
                    {
                        displayName: 'Traffic Metrics',
                        name: 'metrics',
                        type: 'multiOptions',
                        options: [
                            { name: 'Sessions', value: 'sessions' },
                            { name: 'Page Views', value: 'pageViews' },
                            { name: 'Page Views per Session', value: 'pageViewsPerSession' },
                            { name: 'Sessions %', value: 'sessionsPercent' },
                            { name: 'Page Views %', value: 'pageViewsPercent' },
                        ],
                        default: ['sessions', 'pageViews'],
                        description: 'Select traffic-related metrics',
                    },
                ],
            },
            {
                displayName: 'Sales Metrics',
                name: 'salesMetrics',
                values: [
                    {
                        displayName: 'Sales Metrics',
                        name: 'metrics',
                        type: 'multiOptions',
                        options: [
                            { name: 'Units Ordered', value: 'unitsOrdered' },
                            { name: 'Units Ordered (B2B)', value: 'unitsOrderedB2B' },
                            { name: 'Ordered Product Sales', value: 'orderedProductSales' },
                            { name: 'Ordered Product Sales (B2B)', value: 'orderedProductSalesB2B' },
                        ],
                        default: ['unitsOrdered', 'orderedProductSales'],
                        description: 'Select sales-related metrics',
                    },
                ],
            },
            {
                displayName: 'Conversion Metrics',
                name: 'conversionMetrics',
                values: [
                    {
                        displayName: 'Conversion Metrics',
                        name: 'metrics',
                        type: 'multiOptions',
                        options: [
                            { name: 'Unit Session Percentage', value: 'unitSessionPercentage' },
                            { name: 'Unit Session Percentage (B2B)', value: 'unitSessionPercentageB2B' },
                        ],
                        default: ['unitSessionPercentage'],
                        description: 'Select conversion-related metrics',
                    },
                ],
            },
            {
                displayName: 'Buy Box Metrics',
                name: 'buyboxMetrics',
                values: [
                    {
                        displayName: 'Buy Box Metrics',
                        name: 'metrics',
                        type: 'multiOptions',
                        options: [
                            { name: 'Buy Box Percentage', value: 'buyBoxPercentage' },
                        ],
                        default: [],
                        description: 'Select Buy Box-related metrics',
                    },
                ],
            },
            {
                displayName: 'Computed Metrics',
                name: 'computedMetrics',
                values: [
                    {
                        displayName: 'Computed Metrics',
                        name: 'metrics',
                        type: 'multiOptions',
                        options: [
                            { name: 'Average Order Value', value: 'aov' },
                            { name: 'Units per Session', value: 'unitsPerSession' },
                            { name: 'Sales per Session', value: 'salesPerSession' },
                        ],
                        default: [],
                        description: 'Select computed metrics (calculated client-side)',
                    },
                ],
            },
        ],
    },
    // === SORTING & LIMITING ===
    {
        displayName: 'Sorting & Limiting',
        name: 'sortingLimiting',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Sort By',
                name: 'sortBy',
                type: 'string',
                default: 'orderedProductSales',
                description: 'Metric to sort by (use metric ID)',
                placeholder: 'orderedProductSales',
            },
            {
                displayName: 'Sort Direction',
                name: 'sortDirection',
                type: 'options',
                options: [
                    { name: 'Descending (High to Low)', value: 'desc' },
                    { name: 'Ascending (Low to High)', value: 'asc' },
                ],
                default: 'desc',
                description: 'Sort direction',
            },
            {
                displayName: 'Top N Results',
                name: 'topN',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 10000,
                },
                default: 100,
                description: 'Limit to top N results after sorting',
            },
            {
                displayName: 'Secondary Sort',
                name: 'secondarySort',
                type: 'string',
                default: '',
                description: 'Secondary sort metric (optional)',
                placeholder: 'sessions',
            },
        ],
    },
    // === OUTPUT OPTIONS ===
    {
        displayName: 'Output Options',
        name: 'outputOptions',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Output Format',
                name: 'format',
                type: 'options',
                options: [
                    { name: 'JSON (Raw)', value: 'json' },
                    { name: 'JSON (Flattened Rows)', value: 'jsonFlat' },
                    { name: 'CSV Binary', value: 'csv' },
                ],
                default: 'jsonFlat',
                description: 'Output format for the analytics data',
            },
            {
                displayName: 'CSV Delimiter',
                name: 'csvDelimiter',
                type: 'options',
                displayOptions: {
                    show: {
                        '/outputOptions.format': ['csv'],
                    },
                },
                options: [
                    { name: 'Comma (,)', value: ',' },
                    { name: 'Semicolon (;)', value: ';' },
                    { name: 'Tab', value: '\t' },
                    { name: 'Pipe (|)', value: '|' },
                ],
                default: ',',
                description: 'CSV field delimiter',
            },
            {
                displayName: 'CSV Decimal Separator',
                name: 'csvDecimalSeparator',
                type: 'options',
                displayOptions: {
                    show: {
                        '/outputOptions.format': ['csv'],
                    },
                },
                options: [
                    { name: 'Dot (.)', value: '.' },
                    { name: 'Comma (,)', value: ',' },
                ],
                default: '.',
                description: 'Decimal separator for numbers in CSV',
            },
            {
                displayName: 'CSV Filename Pattern',
                name: 'csvFilename',
                type: 'string',
                displayOptions: {
                    show: {
                        '/outputOptions.format': ['csv'],
                    },
                },
                default: 'analytics_sales_traffic_{marketplace}_{start}_{end}.csv',
                description: 'Filename pattern for CSV output. Variables: {marketplace}, {start}, {end}, {timestamp}',
            },
            {
                displayName: 'Include Headers',
                name: 'includeHeaders',
                type: 'boolean',
                displayOptions: {
                    show: {
                        '/outputOptions.format': ['csv'],
                    },
                },
                default: true,
                description: 'Include column headers in CSV output',
            },
            {
                displayName: 'Pivot Data',
                name: 'pivot',
                type: 'options',
                options: [
                    { name: 'None', value: 'none' },
                    { name: 'By Marketplace', value: 'marketplace' },
                    { name: 'By Time Period', value: 'time' },
                ],
                default: 'none',
                description: 'Pivot the data for easier analysis',
            },
            {
                displayName: 'Currency Normalization',
                name: 'currencyNormalization',
                type: 'options',
                options: [
                    { name: 'Keep Native Currency', value: 'native' },
                    { name: 'Normalize to Base Currency', value: 'normalize' },
                ],
                default: 'native',
                description: 'How to handle multiple currencies',
            },
            {
                displayName: 'Base Currency',
                name: 'baseCurrency',
                type: 'options',
                displayOptions: {
                    show: {
                        '/outputOptions.currencyNormalization': ['normalize'],
                    },
                },
                options: constants_1.SUPPORTED_CURRENCIES.map(currency => ({ name: currency, value: currency })),
                default: 'USD',
                description: 'Base currency for normalization',
            },
            {
                displayName: 'Exchange Rates',
                name: 'exchangeRates',
                type: 'json',
                displayOptions: {
                    show: {
                        '/outputOptions.currencyNormalization': ['normalize'],
                    },
                },
                default: '{"EUR": 1.1, "GBP": 1.3, "JPY": 0.009}',
                description: 'Exchange rates to base currency (JSON format)',
            },
            {
                displayName: 'Join Listing Data',
                name: 'joinListingData',
                type: 'boolean',
                default: false,
                description: 'Append product title, brand, and category from Listings API',
            },
            {
                displayName: 'Output Property Name',
                name: 'outputProperty',
                type: 'string',
                default: 'data',
                description: 'Property name for the output data in JSON format',
            },
        ],
    },
    // === ADVANCED OPTIONS ===
    {
        displayName: 'Advanced Options',
        name: 'advancedOptions',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
            show: {
                resource: ['analytics'],
                operation: ['salesAndTrafficByAsin'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Analytics Mode',
                name: 'analyticsMode',
                type: 'options',
                options: [
                    { name: 'Auto (Try Data Kiosk, fallback to Reports)', value: 'auto' },
                    { name: 'Data Kiosk Only', value: 'dataKiosk' },
                    { name: 'Reports API Only', value: 'reports' },
                ],
                default: 'auto',
                description: 'Which analytics API to use',
            },
            {
                displayName: 'Schema Version',
                name: 'schemaVersion',
                type: 'options',
                options: Object.values(constants_1.SCHEMA_VERSIONS).map(version => ({
                    name: version.displayName,
                    value: version.version,
                    description: version.description,
                })),
                default: '2024-04-24',
                description: 'Data Kiosk schema version to use',
            },
            {
                displayName: 'Raw Query Override',
                name: 'rawQueryOverride',
                type: 'json',
                default: '',
                description: 'Expert mode: Override request payload with raw JSON (merged with UI params)',
            },
            {
                displayName: 'Return All Results',
                name: 'returnAll',
                type: 'boolean',
                default: true,
                description: 'Automatically handle pagination to return all results',
            },
            {
                displayName: 'Page Size',
                name: 'pageSize',
                type: 'number',
                displayOptions: {
                    show: {
                        '/advancedOptions.returnAll': [false],
                    },
                },
                typeOptions: {
                    minValue: 1,
                    maxValue: 1000,
                },
                default: 100,
                description: 'Number of results per page',
            },
            {
                displayName: 'Max Results Limit',
                name: 'maxResults',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 100000,
                },
                default: 10000,
                description: 'Safety limit for total number of results',
            },
            {
                displayName: 'Enable Chunking',
                name: 'enableChunking',
                type: 'boolean',
                default: true,
                description: 'Automatically chunk large date ranges to avoid API limits',
            },
            {
                displayName: 'Chunk Size (Days)',
                name: 'chunkSizeDays',
                type: 'number',
                displayOptions: {
                    show: {
                        '/advancedOptions.enableChunking': [true],
                    },
                },
                typeOptions: {
                    minValue: 1,
                    maxValue: 90,
                },
                default: 30,
                description: 'Maximum days per API request when chunking',
            },
            {
                displayName: 'Max Retries',
                name: 'maxRetries',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                    maxValue: 10,
                },
                default: 3,
                description: 'Maximum number of retries for failed requests',
            },
            {
                displayName: 'Retry Backoff (ms)',
                name: 'retryBackoff',
                type: 'number',
                typeOptions: {
                    minValue: 100,
                    maxValue: 30000,
                },
                default: 1000,
                description: 'Base backoff time between retries in milliseconds',
            },
            {
                displayName: 'Include Diagnostics',
                name: 'includeDiagnostics',
                type: 'boolean',
                default: false,
                description: 'Include response headers and metadata in output',
            },
            {
                displayName: 'Strict Validation',
                name: 'strictValidation',
                type: 'boolean',
                default: false,
                description: 'Fail if any requested metrics are missing (vs permissive mode)',
            },
        ],
    },
];
