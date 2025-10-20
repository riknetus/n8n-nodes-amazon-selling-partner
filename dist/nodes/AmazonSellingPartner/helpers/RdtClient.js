"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RdtClient = void 0;
const axios_1 = __importDefault(require("axios"));
const n8n_workflow_1 = require("n8n-workflow");
const LwaClient_1 = require("./LwaClient");
class RdtClient {
    static RDT_ENDPOINT = '/tokens/2021-03-01/restrictedDataToken';
    static async getRestrictedAccessToken(credentials, restrictedResources) {
        try {
            // Get LWA access token first
            const lwaToken = await LwaClient_1.LwaClient.getAccessToken(credentials);
            // Build the base URL for the RDT request
            const baseUrl = this.getBaseUrl(credentials);
            const rdtUrl = new URL(this.RDT_ENDPOINT, baseUrl);
            // Prepare the request body
            const requestBody = {
                restrictedResources,
            };
            // Make the RDT request
            const response = await axios_1.default.post(rdtUrl.toString(), requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'n8n-amazon-sp-api/1.0.0',
                    'x-amz-access-token': lwaToken,
                },
                timeout: 30000,
            });
            return response.data.restrictedDataToken;
        }
        catch (error) {
            const isAxiosErr = axios_1.default.isAxiosError?.(error) || error?.isAxiosError;
            if (isAxiosErr && error.response) {
                const { status, data } = error.response;
                throw new n8n_workflow_1.NodeOperationError({}, `RDT authentication failed (${status}): ${data.error_description || data.error || 'Unknown error'}`, {
                    description: 'Check your LWA credentials and restricted resource configuration',
                });
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new n8n_workflow_1.NodeOperationError({}, `RDT request failed: ${errorMessage}`);
        }
    }
    static getBaseUrl(credentials) {
        const advancedOptions = credentials.advancedOptions;
        const customEndpoint = credentials.spApiEndpoint || advancedOptions?.spApiEndpoint;
        if (customEndpoint) {
            return customEndpoint;
        }
        const region = credentials.awsRegion;
        const environment = credentials.environment;
        const endpoints = {
            'us-east-1': environment === 'sandbox'
                ? 'https://sandbox.sellingpartnerapi-na.amazon.com'
                : 'https://sellingpartnerapi-na.amazon.com',
            'eu-west-1': environment === 'sandbox'
                ? 'https://sandbox.sellingpartnerapi-eu.amazon.com'
                : 'https://sellingpartnerapi-eu.amazon.com',
            'us-west-2': environment === 'sandbox'
                ? 'https://sandbox.sellingpartnerapi-fe.amazon.com'
                : 'https://sellingpartnerapi-fe.amazon.com',
        };
        return endpoints[region] || endpoints['us-east-1'];
    }
}
exports.RdtClient = RdtClient;
