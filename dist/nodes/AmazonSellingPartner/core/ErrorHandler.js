"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const n8n_workflow_1 = require("n8n-workflow");
// Removed unused interface
class ErrorHandler {
    static async handleApiError(response) {
        const { status, data, headers } = response;
        // Handle throttling (429)
        if (status === 429) {
            const retryAfter = headers['retry-after'] || headers['x-amzn-rate-limit-wait'] || '60';
            return new n8n_workflow_1.NodeOperationError({}, 'Request throttled by Amazon SP-API', {
                description: `Rate limit exceeded. Retry after ${retryAfter} seconds. Consider reducing request frequency.`,
            });
        }
        // Handle authentication errors (401, 403)
        if (status === 401 || status === 403) {
            return new n8n_workflow_1.NodeOperationError({}, 'Authentication failed', {
                description: 'Check your SP-API credentials, LWA tokens, and AWS permissions. Ensure your application has the required roles.',
            });
        }
        // Handle not found (404)
        if (status === 404) {
            return new n8n_workflow_1.NodeOperationError({}, 'Resource not found', {
                description: 'The requested resource was not found. Check your marketplace IDs and endpoint configuration.',
            });
        }
        // Handle SP-API specific errors
        if (data && data.errors && Array.isArray(data.errors)) {
            const errors = data.errors;
            const primaryError = errors[0];
            const errorMessages = errors.map(err => `${err.code}: ${err.message}`).join('; ');
            return new n8n_workflow_1.NodeOperationError({}, `SP-API Error: ${primaryError.message}`, {
                description: `Error Code: ${primaryError.code}\nDetails: ${errorMessages}`,
            });
        }
        // Generic client error (4xx)
        if (status >= 400 && status < 500) {
            return new n8n_workflow_1.NodeOperationError({}, `Client error (${status}): ${data?.message || 'Bad request'}`, {
                description: 'Check your request parameters and credentials.',
            });
        }
        // Server error (5xx)
        return new n8n_workflow_1.NodeOperationError({}, `Server error (${status}): Amazon SP-API is temporarily unavailable`, {
            description: 'This is likely a temporary issue with Amazon\'s servers. Please try again later.',
        });
    }
    static async handleNetworkError(error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return new n8n_workflow_1.NodeOperationError({}, 'Request timeout', {
                description: 'The request to Amazon SP-API timed out. This may be due to network issues or high server load.',
            });
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new n8n_workflow_1.NodeOperationError({}, 'Network connection failed', {
                description: 'Could not connect to Amazon SP-API. Check your internet connection and firewall settings.',
            });
        }
        const errorMessage = error.message || 'Unknown network error';
        return new n8n_workflow_1.NodeOperationError({}, `Network error: ${errorMessage}`, {
            description: 'An unexpected network error occurred while connecting to Amazon SP-API.',
        });
    }
}
exports.ErrorHandler = ErrorHandler;
