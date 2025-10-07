"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigV4Signer = void 0;
const aws4 = __importStar(require("aws4"));
const url_1 = require("url");
const n8n_workflow_1 = require("n8n-workflow");
class SigV4Signer {
    static async signRequest(method, url, headers, body, credentials) {
        try {
            const urlParts = new url_1.URL(url);
            // Get AWS credentials from either old location or advanced options
            const advancedOptions = credentials.advancedOptions;
            const awsAccessKeyId = credentials.awsAccessKeyId || advancedOptions?.awsAccessKeyId;
            const awsSecretAccessKey = credentials.awsSecretAccessKey || advancedOptions?.awsSecretAccessKey;
            const awsRegion = credentials.awsRegion;
            if (!awsAccessKeyId || !awsSecretAccessKey) {
                throw new Error('AWS credentials are required for SigV4 signing');
            }
            const requestOptions = {
                method,
                host: urlParts.hostname,
                path: urlParts.pathname + urlParts.search,
                headers: { ...headers },
                body,
                service: 'execute-api',
                region: awsRegion,
            };
            const awsCredentials = {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            };
            // Sign the request using aws4
            const signedRequest = aws4.sign(requestOptions, awsCredentials);
            return signedRequest.headers;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new n8n_workflow_1.NodeOperationError({}, `Failed to sign request: ${errorMessage}`, {
                description: 'Check your AWS credentials and region configuration',
            });
        }
    }
}
exports.SigV4Signer = SigV4Signer;
