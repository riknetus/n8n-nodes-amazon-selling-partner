import { ICredentialDataDecryptedObject } from 'n8n-workflow';
export declare class SigV4Signer {
    static signRequest(method: string, url: string, headers: Record<string, string>, body: string | undefined, credentials: ICredentialDataDecryptedObject): Promise<Record<string, string>>;
}
