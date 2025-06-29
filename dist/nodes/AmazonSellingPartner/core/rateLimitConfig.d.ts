export interface RateLimitConfig {
    rate: number;
    burst: number;
    description?: string;
}
export declare const RATE_LIMIT_GROUPS: Record<string, RateLimitConfig>;
export declare const ENDPOINT_TO_GROUP: Array<{
    pattern: RegExp;
    group: string;
}>;
/**
 * Get the rate limit group for a given endpoint
 */
export declare function getEndpointGroup(endpoint: string): string;
/**
 * Get rate limit configuration for a group, with environment variable overrides
 */
export declare function getRateLimitConfig(group: string): RateLimitConfig;
/**
 * Validate rate limit configuration
 */
export declare function validateRateLimitConfig(config: RateLimitConfig): boolean;
