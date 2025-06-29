"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportDownloader = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const n8n_workflow_1 = require("n8n-workflow");
class ReportDownloader {
    /**
     * Download and optionally decrypt a report document
     */
    static async downloadReportDocument(document, nodeId) {
        try {
            // Download the document
            const response = await (0, axios_1.default)({
                method: 'GET',
                url: document.url,
                responseType: 'arraybuffer',
                timeout: 300000, // 5 minutes for large files
            });
            let data = Buffer.from(response.data);
            // Decrypt if encryption details are provided
            if (document.encryptionDetails) {
                data = this.decryptDocument(data, document.encryptionDetails);
            }
            // TODO: Add decompression support if needed
            // if (document.compressionAlgorithm === 'GZIP') {
            //   data = await this.decompressGzip(data);
            // }
            return data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new n8n_workflow_1.NodeOperationError({ id: nodeId || 'unknown', name: 'ReportDownloader', type: 'helper' }, `Failed to download report document: ${error.message}`, {
                    description: 'Check if the document URL is still valid and accessible'
                });
            }
            throw new n8n_workflow_1.NodeOperationError({ id: nodeId || 'unknown', name: 'ReportDownloader', type: 'helper' }, `Unexpected error downloading report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Decrypt document using AES-256-CBC
     */
    static decryptDocument(encryptedData, encryptionDetails) {
        try {
            if (encryptionDetails.standard !== 'AES') {
                throw new Error(`Unsupported encryption standard: ${encryptionDetails.standard}`);
            }
            const key = Buffer.from(encryptionDetails.key, 'base64');
            const iv = Buffer.from(encryptionDetails.initializationVector, 'base64');
            const decipher = (0, crypto_1.createDecipheriv)('aes-256-cbc', key, iv);
            const decrypted = Buffer.concat([
                decipher.update(encryptedData),
                decipher.final()
            ]);
            return decrypted;
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError({ id: 'unknown', name: 'ReportDownloader', type: 'helper' }, `Failed to decrypt report document: ${error instanceof Error ? error.message : 'Unknown error'}`, {
                description: 'The encryption key or initialization vector may be invalid'
            });
        }
    }
}
exports.ReportDownloader = ReportDownloader;
