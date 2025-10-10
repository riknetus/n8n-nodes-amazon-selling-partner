"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonSpApi = void 0;
class AmazonSpApi {
    name = 'amazonSpApi';
    displayName = 'Amazon Selling Partner API';
    documentationUrl = 'https://developer-docs.amazon.com/sp-api/docs/what-is-the-selling-partner-api';
    properties = [
        {
            displayName: 'Environment',
            name: 'environment',
            type: 'options',
            options: [
                {
                    name: 'Production',
                    value: 'production',
                },
                {
                    name: 'Sandbox',
                    value: 'sandbox',
                },
            ],
            default: 'production',
            description: 'The environment to use for API calls. Use Production for live seller data.',
        },
        {
            displayName: 'Primary Marketplace',
            name: 'primaryMarketplace',
            type: 'options',
            options: [
                {
                    name: '🇺🇸 United States (amazon.com)',
                    value: 'ATVPDKIKX0DER',
                },
                {
                    name: '🇨🇦 Canada (amazon.ca)',
                    value: 'A2EUQ1WTGCTBG2',
                },
                {
                    name: '🇲🇽 Mexico (amazon.com.mx)',
                    value: 'A1AM78C64UM0Y8',
                },
                {
                    name: '🇧🇷 Brazil (amazon.com.br)',
                    value: 'A2Q3Y263D00KWC',
                },
                {
                    name: '🇬🇧 United Kingdom (amazon.co.uk)',
                    value: 'A1F83G8C2ARO7P',
                },
                {
                    name: '🇩🇪 Germany (amazon.de)',
                    value: 'A1PA6795UKMFR9',
                },
                {
                    name: '🇫🇷 France (amazon.fr)',
                    value: 'A13V1IB3VIYZZH',
                },
                {
                    name: '🇮🇹 Italy (amazon.it)',
                    value: 'APJ6JRA9NG5V4',
                },
                {
                    name: '🇪🇸 Spain (amazon.es)',
                    value: 'A1RKKUPIHCS9HS',
                },
                {
                    name: '🇳🇱 Netherlands (amazon.nl)',
                    value: 'A1805IZSGTT6HS',
                },
                {
                    name: '🇵🇱 Poland (amazon.pl)',
                    value: 'A1C3SOZRARQ6R3',
                },
                {
                    name: '🇸🇪 Sweden (amazon.se)',
                    value: 'A2NODRKZP88ZB9',
                },
                {
                    name: '🇧🇪 Belgium (amazon.com.be)',
                    value: 'AMEN7PMS3EDWL',
                },
                {
                    name: '🇮🇳 India (amazon.in)',
                    value: 'A21TJRUUN4KGV',
                },
                {
                    name: '🇹🇷 Turkey (amazon.com.tr)',
                    value: 'A33AVAJ2PDY3EV',
                },
                {
                    name: '🇦🇪 United Arab Emirates (amazon.ae)',
                    value: 'A2VIGQ35RCS4UG',
                },
                {
                    name: '🇸🇦 Saudi Arabia (amazon.sa)',
                    value: 'A17E79C6D8DWNP',
                },
                {
                    name: '🇪🇬 Egypt (amazon.eg)',
                    value: 'ARBP9OOSHTCHU',
                },
                {
                    name: '🇯🇵 Japan (amazon.co.jp)',
                    value: 'A1VC38T7YXB528',
                },
                {
                    name: '🇦🇺 Australia (amazon.com.au)',
                    value: 'A39IBJ37TRP1C6',
                },
                {
                    name: '🇸🇬 Singapore (amazon.sg)',
                    value: 'A19VAU5U5O7RUS',
                },
            ],
            default: 'A21TJRUUN4KGV',
            required: true,
            description: 'Select the primary marketplace where your SP-API app is authorized. This MUST match the marketplace you selected during app authorization in Seller Central. Selecting the wrong marketplace will cause 403 Unauthorized errors.',
        },
        {
            displayName: 'AWS Region',
            name: 'awsRegion',
            type: 'options',
            options: [
                {
                    name: 'North America (US, CA, MX, BR)',
                    value: 'us-east-1',
                },
                {
                    name: 'Europe (UK, DE, FR, IT, ES, NL, PL, SE, BE, IN, TR, AE, SA, EG)',
                    value: 'eu-west-1',
                },
                {
                    name: 'Far East (JP, AU, SG)',
                    value: 'us-west-2',
                },
            ],
            default: 'eu-west-1',
            description: 'AWS region must match your primary marketplace. North America: US/CA/MX/BR. Europe: UK/DE/FR/IT/ES/NL/PL/SE/BE/IN/TR/AE/SA/EG. Far East: JP/AU/SG.',
            hint: 'This should auto-match your Primary Marketplace selection above',
        },
        {
            displayName: 'Important: Marketplace & Region Mapping',
            name: 'marketplaceNotice',
            type: 'notice',
            default: '',
            description: '⚠️ The AWS Region MUST match your Primary Marketplace:\n• North America (us-east-1): US, Canada, Mexico, Brazil\n• Europe (eu-west-1): UK, Germany, France, Italy, Spain, Netherlands, Poland, Sweden, Belgium, India, Turkey, UAE, Saudi Arabia, Egypt\n• Far East (us-west-2): Japan, Australia, Singapore\n\nSelecting the wrong region will cause 403 Unauthorized errors!',
        },
        {
            displayName: 'Authentication Notice',
            name: 'authNotice',
            type: 'notice',
            default: '',
            description: 'LWA-only authentication is the default and recommended approach. AWS credentials are optional and only needed if you explicitly enable AWS SigV4 signing in Advanced Options.',
        },
        {
            displayName: 'LWA Client ID',
            name: 'lwaClientId',
            type: 'string',
            default: '',
            required: true,
            description: 'Login with Amazon (LWA) Client ID from your SP-API application',
        },
        {
            displayName: 'LWA Client Secret',
            name: 'lwaClientSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'Login with Amazon (LWA) Client Secret from your SP-API application',
        },
        {
            displayName: 'LWA Refresh Token',
            name: 'lwaRefreshToken',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'Login with Amazon (LWA) Refresh Token obtained during authorization',
        },
        {
            displayName: 'Advanced Options',
            name: 'advancedOptions',
            type: 'collection',
            placeholder: 'Add Advanced Option',
            default: {},
            options: [
                {
                    displayName: 'AWS Access Key ID',
                    name: 'awsAccessKeyId',
                    type: 'string',
                    default: '',
                    description: 'AWS Access Key ID for your IAM user with SP-API permissions (only required if AWS SigV4 signing is explicitly enabled)',
                },
                {
                    displayName: 'AWS Secret Access Key',
                    name: 'awsSecretAccessKey',
                    type: 'string',
                    typeOptions: {
                        password: true,
                    },
                    default: '',
                    description: 'AWS Secret Access Key for your IAM user (only required if AWS SigV4 signing is explicitly enabled)',
                },
                {
                    displayName: 'AWS Role ARN',
                    name: 'awsRoleArn',
                    type: 'string',
                    default: '',
                    description: 'AWS Role ARN to assume for SP-API calls (for enhanced security)',
                },
                {
                    displayName: 'SP-API Endpoint Override',
                    name: 'spApiEndpoint',
                    type: 'string',
                    default: '',
                    description: 'Override the default SP-API endpoint URL',
                },
                {
                    displayName: 'Use AWS SigV4 Signing',
                    name: 'useAwsSigning',
                    type: 'boolean',
                    default: false,
                    description: 'Enable AWS SigV4 request signing (requires AWS credentials above). Most operations work with LWA-only authentication.',
                },
            ],
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {},
    };
    test = {
        request: {
            baseURL: '={{$credentials.spApiEndpoint || $self["getSpApiEndpoint"]($credentials.awsRegion, $credentials.environment)}}',
            url: '/sellers/v1/marketplaceParticipations',
            method: 'GET',
        },
    };
}
exports.AmazonSpApi = AmazonSpApi;
