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
            // Extract detailed error information
            let errorDetails = '';
            let errorCode = '';
            if (data && data.errors && Array.isArray(data.errors)) {
                const errors = data.errors;
                errorCode = errors[0]?.code || 'Unauthorized';
                errorDetails = errors.map(err => `${err.code}: ${err.message}`).join('\n');
            }
            // Log full error for debugging
            console.error('SP-API Auth Error:', JSON.stringify({
                status,
                errorCode,
                errors: data?.errors,
                headers: {
                    'x-amzn-requestid': headers['x-amzn-requestid'],
                    'x-amzn-errortype': headers['x-amzn-errortype'],
                }
            }, null, 2));
            return new n8n_workflow_1.NodeOperationError({}, `Authentication failed (${status}): ${errorCode}`, {
                description: `${errorDetails || 'Access to requested resource is denied.'}\n\n` +
                    `Troubleshooting:\n` +
                    `• Verify your Primary Marketplace matches your app authorization (e.g., India = eu-west-1)\n` +
                    `• Check AWS Region matches your marketplace\n` +
                    `• Ensure LWA credentials are correct and refresh token is valid\n` +
                    `• Verify your app has required SP-API roles in Developer Console\n\n` +
                    `Request ID: ${headers['x-amzn-requestid'] || 'N/A'}`,
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
