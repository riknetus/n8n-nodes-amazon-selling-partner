"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceFields = exports.priceOperations = void 0;
exports.priceOperations = [
    {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['prices'],
            },
        },
        options: [
            {
                name: "Get Prices",
                value: "getPrices",
                description: "Get product pricing information by ASIN",
                action: "Get prices",
            },
        ],
        default: "getPrices",
    },
];
exports.priceFields = [
    {
        displayName: 'Marketplace IDs',
        name: 'marketplaceIds',
        type: 'options',
        required: true,
        displayOptions: {
            show: {
                resource: ['prices'],
                operation: ['getPrices'],
            },
        },
        options: [
            // North America
            { name: 'Amazon.com (US)', value: 'ATVPDKIKX0DER', marketplace_name: "us-east-1" },
            { name: 'Amazon.ca (Canada)', value: 'A2EUQ1WTGCTBG2', marketplace_name: "us-east-1" },
            { name: 'Amazon.com.mx (Mexico)', value: 'A1AM78C64UM0Y8', marketplace_name: "us-east-1" },
            { name: 'Amazon.com.br (Brazil)', value: 'A2Q3Y263D00KWC', marketplace_name: "us-east-1" },
            // Europe
            { name: 'Amazon.co.uk (UK)', value: 'A1F83G8C2ARO7P', marketplace_name: "eu-west-1" },
            { name: 'Amazon.de (Germany)', value: 'A1PA6795UKMFR9', marketplace_name: "eu-west-1" },
            { name: 'Amazon.fr (France)', value: 'A13V1IB3VIYZZH', marketplace_name: "eu-west-1" },
            { name: 'Amazon.it (Italy)', value: 'APJ6JRA9NG5V4', marketplace_name: "eu-west-1" },
            { name: 'Amazon.es (Spain)', value: 'A1RKKUPIHCS9HS', marketplace_name: "eu-west-1" },
            { name: 'Amazon.nl (Netherlands)', value: 'A1805IZSGTT6HS', marketplace_name: "eu-west-1" },
            { name: 'Amazon.se (Sweden)', value: 'A2NODRKZP88ZB9', marketplace_name: "eu-west-1" },
            { name: 'Amazon.pl (Poland)', value: 'A1C3SOZRARQ6R3', marketplace_name: "eu-west-1" },
            // Asia Pacific
            { name: 'Amazon.co.jp (Japan)', value: 'A1VC38T7YXB528', marketplace_name: "us-west-2" },
            { name: 'Amazon.com.au (Australia)', value: 'A39IBJ37TRP1C6', marketplace_name: "us-west-2" },
            { name: 'Amazon.sg (Singapore)', value: 'A19VAU5U5O7RUS', marketplace_name: "us-west-2" },
            { name: 'Amazon.ae (UAE)', value: 'A2VIGQ35RCS4UG', marketplace_name: "us-west-2" },
            { name: 'Amazon.sa (Saudi Arabia)', value: 'A17E79C6D8DWNP', marketplace_name: "us-west-2" },
            { name: 'Amazon.in (India)', value: 'A21TJRUUN4KGV', marketplace_name: "us-west-2" },
        ],
        default: ['ATVPDKIKX0DER'],
        description: 'Select the marketplaces to retrieve orders from',
    },
    {
        displayName: "ASIN",
        name: "asin",
        type: "string",
        required: true,
        description: "Amazon Standard Identification Number (comma-separated for multiple)",
        displayOptions: {
            show: {
                resource: ['prices'],
                operation: ['getPrices'],
            }
        },
        default: ""
    },
];
