/// <reference types="node" />
/// <reference types="node" />
export declare function downloadPresigned(url: string): Promise<{
    buffer: Buffer;
    contentType?: string;
}>;
