"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LwaClient = void 0;
const axios_1 = __importDefault(require("axios"));
const n8n_workflow_1 = require("n8n-workflow");
class LwaClient {
    static tokenCache = new Map();
    static TOKEN_ENDPOINT = 'https://api.amazon.com/auth/o2/token';
    static BUFFER_TIME_SECONDS = 300; // 5 minutes buffer
    static async getAccessToken(credentials) {
        const cacheKey = this.getCacheKey(credentials);
        const cached = this.tokenCache.get(cacheKey);
        // Return cached token if still valid
        if (cached && cached.expiresAt > Date.now()) {
            return cached.accessToken;
        }
        // Fetch new token
        const newToken = await this.fetchAccessToken(credentials);
        // Cache the new token
        this.tokenCache.set(cacheKey, {
            accessToken: newToken.access_token,
            expiresAt: Date.now() + (newToken.expires_in - this.BUFFER_TIME_SECONDS) * 1000,
        });
        return newToken.access_token;
    }
    static async fetchAccessToken(credentials) {
        try {
            // Construct form-urlencoded data
            const formData = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: credentials.lwaRefreshToken,
                client_id: credentials.lwaClientId,
                client_secret: credentials.lwaClientSecret,
            });
            const response = await axios_1.default.post(this.TOKEN_ENDPOINT, formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'n8n-amazon-sp-api/1.0.0',
                },
                timeout: 30000,
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response) {
                const { status, data } = error.response;
                // Log detailed error info for debugging
                console.error('LWA Token Request Failed:', {
                    status,
                    data,
                    requestUrl: this.TOKEN_ENDPOINT,
                    clientId: credentials.lwaClientId,
                });
                throw new n8n_workflow_1.NodeOperationError({}, `LWA authentication failed (${status}): ${data.error_description || data.error || JSON.stringify(data)}`, {
                    description: 'Check your LWA credentials and ensure they are valid and not expired. See server logs for details.',
                });
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('LWA Token Request Error (non-HTTP):', errorMessage);
            throw new n8n_workflow_1.NodeOperationError({}, `LWA request failed: ${errorMessage}`);
        }
    }
    static getCacheKey(credentials) {
        // Create a cache key based on client ID to avoid token conflicts
        return `lwa_${credentials.lwaClientId}`;
    }
    static clearCache(credentials) {
        if (credentials) {
            const cacheKey = this.getCacheKey(credentials);
            this.tokenCache.delete(cacheKey);
        }
        else {
            this.tokenCache.clear();
        }
    }
}
exports.LwaClient = LwaClient;
