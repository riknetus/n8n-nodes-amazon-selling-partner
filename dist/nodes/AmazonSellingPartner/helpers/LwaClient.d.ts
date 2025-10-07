import { ICredentialDataDecryptedObject } from 'n8n-workflow';
export declare class LwaClient {
    private static tokenCache;
    private static readonly TOKEN_ENDPOINT;
    private static readonly BUFFER_TIME_SECONDS;
    static getAccessToken(credentials: ICredentialDataDecryptedObject): Promise<string>;
    private static fetchAccessToken;
    private static getCacheKey;
    static clearCache(credentials?: ICredentialDataDecryptedObject): void;
}
