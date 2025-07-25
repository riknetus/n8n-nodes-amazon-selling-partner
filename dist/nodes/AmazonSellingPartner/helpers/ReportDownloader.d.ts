/// <reference types="node" />
/// <reference types="node" />
interface EncryptionDetails {
    standard: string;
    initializationVector: string;
    key: string;
}
interface ReportDocument {
    reportDocumentId: string;
    url: string;
    encryptionDetails?: EncryptionDetails;
    compressionAlgorithm?: string;
}
export declare class ReportDownloader {
    /**
     * Download and optionally decrypt a report document
     */
    static downloadReportDocument(document: ReportDocument, nodeId?: string): Promise<Buffer>;
    /**
     * Decrypt document using AES-256-CBC
     */
    private static decryptDocument;
}
export {};
