import { ICredentialDataDecryptedObject } from 'n8n-workflow';
export interface RestrictedResource {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    dataElements?: string[];
}
export declare class RdtClient {
    private static readonly RDT_ENDPOINT;
    static getRestrictedAccessToken(credentials: ICredentialDataDecryptedObject, restrictedResources: RestrictedResource[]): Promise<string>;
    private static getBaseUrl;
}
