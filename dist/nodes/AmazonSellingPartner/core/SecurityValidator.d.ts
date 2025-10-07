export interface ValidationRule {
    field: string;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: any[];
    sanitize?: boolean;
    customValidator?: (value: any) => boolean | string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    sanitizedData?: any;
}
export declare class SecurityValidator {
    private readonly suspiciousPatterns;
    private readonly marketplaceIdPattern;
    private readonly datePattern;
    /**
     * Validate and sanitize input data
     */
    validateInput(data: any, rules: ValidationRule[], nodeId: string): ValidationResult;
    /**
     * Validate marketplace IDs
     */
    validateMarketplaceIds(marketplaceIds: string[], nodeId: string): ValidationResult;
    /**
     * Validate date range
     */
    validateDateRange(createdAfter: string, createdBefore: string, nodeId: string): ValidationResult;
    /**
     * Sanitize string input
     */
    sanitizeString(input: string): string;
    /**
     * Check for suspicious patterns in input
     */
    detectSuspiciousPatterns(input: string, nodeId: string): boolean;
    /**
     * Validate credentials format
     */
    validateCredentials(credentials: any, nodeId: string, useAwsSigning?: boolean): ValidationResult;
    /**
     * Validate API endpoint parameters
     */
    validateApiParameters(params: Record<string, any>, nodeId: string): ValidationResult;
    /**
     * Check rate limiting compliance
     */
    checkRateLimitCompliance(endpoint: string, nodeId: string): boolean;
    /**
     * Validate environment isolation
     */
    validateEnvironmentIsolation(credentials: any, nodeId: string): ValidationResult;
    private validateField;
    private validateType;
    private getNestedValue;
    private setNestedValue;
}
export declare const securityValidator: SecurityValidator;
