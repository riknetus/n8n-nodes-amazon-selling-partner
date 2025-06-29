import { SecurityValidator } from '../SecurityValidator';

// Mock the audit logger
jest.mock('../AuditLogger', () => ({
	auditLogger: {
		logEvent: jest.fn(),
		logError: jest.fn(),
		logSuspiciousActivity: jest.fn(),
		logSecurityEvent: jest.fn(),
	},
}));

describe('SecurityValidator', () => {
	let securityValidator: SecurityValidator;
	const mockNodeId = 'test-node-123';

	beforeEach(() => {
		securityValidator = new SecurityValidator();
		jest.clearAllMocks();
	});

	describe('validateMarketplaceIds', () => {
		it('should validate correct marketplace IDs', () => {
			const result = securityValidator.validateMarketplaceIds(['ATVPDKIKX0DER', 'A1PA6795UKMFR9'], mockNodeId);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject empty marketplace IDs', () => {
			const result = securityValidator.validateMarketplaceIds([], mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('At least one marketplace ID is required');
		});

		it('should reject invalid marketplace ID format', () => {
			const result = securityValidator.validateMarketplaceIds(['INVALID_ID', 'ATVPDKIKX0DER'], mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain('Invalid marketplace ID format: INVALID_ID');
		});
	});

	describe('validateDateRange', () => {
		it('should validate correct date range', () => {
			const createdAfter = '2024-01-01T00:00:00Z';
			const createdBefore = '2024-01-07T00:00:00Z';
			
			const result = securityValidator.validateDateRange(createdAfter, createdBefore, mockNodeId);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject date range exceeding 30 days', () => {
			const createdAfter = '2024-01-01T00:00:00Z';
			const createdBefore = '2024-02-05T00:00:00Z'; // 35 days later
			
			const result = securityValidator.validateDateRange(createdAfter, createdBefore, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Date range cannot exceed 30 days');
		});

		it('should reject when after date is later than before date', () => {
			const createdAfter = '2024-01-15T00:00:00Z';
			const createdBefore = '2024-01-10T00:00:00Z';
			
			const result = securityValidator.validateDateRange(createdAfter, createdBefore, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Created After date must be before Created Before date');
		});

		it('should reject invalid date format', () => {
			const createdAfter = 'invalid-date';
			const createdBefore = '2024-01-10T00:00:00Z';
			
			const result = securityValidator.validateDateRange(createdAfter, createdBefore, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('does not match required pattern'))).toBe(true);
		});

		it('should log suspicious activity for very old dates', () => {
			const { auditLogger } = require('../AuditLogger');
			const createdAfter = '2020-01-01T00:00:00Z'; // More than 2 years ago
			const createdBefore = '2020-01-07T00:00:00Z';
			
			securityValidator.validateDateRange(createdAfter, createdBefore, mockNodeId);
			
			expect(auditLogger.logSuspiciousActivity).toHaveBeenCalledWith(
				mockNodeId,
				'old_date_range_request',
				expect.objectContaining({
					createdAfter,
					createdBefore,
				})
			);
		});
	});

	describe('sanitizeString', () => {
		it('should remove null bytes', () => {
			const input = 'test\x00string';
			const result = securityValidator.sanitizeString(input);
			
			expect(result).toBe('teststring');
		});

		it('should encode HTML entities', () => {
			const input = '<script>alert("xss")</script>';
			const result = securityValidator.sanitizeString(input);
			
			expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
		});

		it('should remove control characters', () => {
			const input = 'test\x01\x02string\x7F';
			const result = securityValidator.sanitizeString(input);
			
			expect(result).toBe('teststring');
		});

		it('should preserve tabs, newlines, and carriage returns', () => {
			const input = 'test\t\n\rstring';
			const result = securityValidator.sanitizeString(input);
			
			expect(result).toBe('test\t\n\rstring');
		});

		it('should trim whitespace', () => {
			const input = '  test string  ';
			const result = securityValidator.sanitizeString(input);
			
			expect(result).toBe('test string');
		});
	});

	describe('detectSuspiciousPatterns', () => {
		it('should detect SQL injection patterns', () => {
			const { auditLogger } = require('../AuditLogger');
			const input = "'; DROP TABLE users; --";
			
			const result = securityValidator.detectSuspiciousPatterns(input, mockNodeId);
			
			expect(result).toBe(true);
			expect(auditLogger.logSuspiciousActivity).toHaveBeenCalledWith(
				mockNodeId,
				'malicious_input_detected',
				expect.objectContaining({
					input: expect.stringContaining('DROP'),
					attackVector: 'input_injection',
				})
			);
		});

		it('should detect XSS patterns', () => {
			const { auditLogger } = require('../AuditLogger');
			const input = '<script>alert("xss")</script>';
			
			const result = securityValidator.detectSuspiciousPatterns(input, mockNodeId);
			
			expect(result).toBe(true);
			expect(auditLogger.logSuspiciousActivity).toHaveBeenCalled();
		});

		it('should detect command injection patterns', () => {
			const { auditLogger } = require('../AuditLogger');
			const input = 'test; rm -rf /';
			
			const result = securityValidator.detectSuspiciousPatterns(input, mockNodeId);
			
			expect(result).toBe(true);
			expect(auditLogger.logSuspiciousActivity).toHaveBeenCalled();
		});

		it('should detect directory traversal patterns', () => {
			const { auditLogger } = require('../AuditLogger');
			const input = '../../../etc/passwd';
			
			const result = securityValidator.detectSuspiciousPatterns(input, mockNodeId);
			
			expect(result).toBe(true);
			expect(auditLogger.logSuspiciousActivity).toHaveBeenCalled();
		});

		it('should return false for safe input', () => {
			const input = 'This is a safe string with normal characters';
			
			const result = securityValidator.detectSuspiciousPatterns(input, mockNodeId);
			
			expect(result).toBe(false);
		});
	});

	describe('validateCredentials', () => {
		const validCredentials = {
			lwaClientId: 'amzn1.application-oa2-client.12345678901234567890',
			lwaClientSecret: 'amzn1.application-oa2-client.secret.12345678901234567890',
			lwaRefreshToken: 'Atzr.IwEBIH1234567890abcdefghijklmnopqrstuvwxyz',
			awsRegion: 'us-east-1',
			environment: 'sandbox',
		};

		const validCredentialsWithAws = {
			...validCredentials,
			advancedOptions: {
				awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				awsSecretAccessKey: 'wJalrXUtnFEMI-K7MDENG-bPxRfiCYEXAMPLEKEY',
				useAwsSigning: true,
			},
		};

		it('should validate correct LWA-only credentials', () => {
			const result = securityValidator.validateCredentials(validCredentials, mockNodeId, false);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should validate correct credentials with AWS signing', () => {
			const result = securityValidator.validateCredentials(validCredentialsWithAws, mockNodeId, true);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject missing LWA credentials', () => {
			const invalidCredentials: any = { ...validCredentials };
			delete invalidCredentials.lwaClientId;
			
			const result = securityValidator.validateCredentials(invalidCredentials, mockNodeId, false);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('lwaClientId is required');
		});

		it('should reject missing AWS credentials when AWS signing is enabled', () => {
			const invalidCredentials = { ...validCredentials };
			
			const result = securityValidator.validateCredentials(invalidCredentials, mockNodeId, true);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('AWS Access Key ID is required when AWS signing is enabled');
		});

		it('should reject invalid AWS region', () => {
			const invalidCredentials = { ...validCredentials, awsRegion: 'invalid-region' };
			
			const result = securityValidator.validateCredentials(invalidCredentials, mockNodeId, false);
			
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain('must be one of:');
		});

		it('should reject invalid environment', () => {
			const invalidCredentials = { ...validCredentials, environment: 'development' };
			
			const result = securityValidator.validateCredentials(invalidCredentials, mockNodeId, false);
			
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain('must be one of: sandbox, production');
		});

		it('should reject AWS access key with invalid format when AWS signing is enabled', () => {
			const invalidCredentials = {
				...validCredentials,
				advancedOptions: {
					awsAccessKeyId: 'invalid-key-12345678', // 20 chars but has lowercase and dashes
					awsSecretAccessKey: 'valid-secret-key-123456789012345',
					useAwsSigning: true,
				},
			};
			
			const result = securityValidator.validateCredentials(invalidCredentials, mockNodeId, true);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('AWS Access Key ID contains invalid characters');
		});

		it('should reject AWS access key with invalid length when AWS signing is enabled', () => {
			const invalidCredentials = {
				...validCredentials,
				advancedOptions: {
					awsAccessKeyId: 'SHORT',
					awsSecretAccessKey: 'valid-secret-key-123456789012345',
					useAwsSigning: true,
				},
			};
			
			const result = securityValidator.validateCredentials(invalidCredentials, mockNodeId, true);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('AWS Access Key ID must be between 16 and 30 characters');
		});

		it('should support backwards compatibility with old credential structure', () => {
			const oldStyleCredentials = {
				...validCredentials,
				awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
			};
			
			const result = securityValidator.validateCredentials(oldStyleCredentials, mockNodeId, true);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('validateApiParameters', () => {
		it('should sanitize string parameters', () => {
			const params = {
				orderId: '<div>order-123</div>', // HTML but not suspicious
				status: 'Shipped',
			};
			
			const result = securityValidator.validateApiParameters(params, mockNodeId);
			
			expect(result.isValid).toBe(true);
			expect(result.sanitizedData.orderId).toBe('&lt;div&gt;order-123&lt;/div&gt;');
			expect(result.sanitizedData.status).toBe('Shipped');
		});

		it('should reject parameters with suspicious patterns', () => {
			const params = {
				orderId: "'; DROP TABLE orders; --",
				status: 'Shipped',
			};
			
			const result = securityValidator.validateApiParameters(params, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Suspicious pattern detected in parameter: orderId');
		});

		it('should preserve non-string parameters', () => {
			const params = {
				limit: 100,
				active: true,
				filters: ['status1', 'status2'],
			};
			
			const result = securityValidator.validateApiParameters(params, mockNodeId);
			
			expect(result.isValid).toBe(true);
			expect(result.sanitizedData.limit).toBe(100);
			expect(result.sanitizedData.active).toBe(true);
			expect(result.sanitizedData.filters).toEqual(['status1', 'status2']);
		});
	});

	describe('validateEnvironmentIsolation', () => {
		it('should pass for clean production credentials', () => {
			const credentials = {
				environment: 'production',
				clientId: 'amzn1.application-oa2-client.prod12345',
				region: 'us-east-1',
			};
			
			const result = securityValidator.validateEnvironmentIsolation(credentials, mockNodeId);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail for production credentials with sandbox references', () => {
			const { auditLogger } = require('../AuditLogger');
			const credentials = {
				environment: 'production',
				clientId: 'amzn1.application-oa2-client.sandbox12345',
				region: 'us-east-1',
			};
			
			const result = securityValidator.validateEnvironmentIsolation(credentials, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Production environment contains test/sandbox references');
			expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeId: mockNodeId,
					action: 'environment_isolation_violation',
					threatLevel: 'medium',
				})
			);
		});

		it('should fail for production credentials with test references', () => {
			const credentials = {
				environment: 'production',
				clientId: 'amzn1.application-oa2-client.test12345',
				region: 'us-east-1',
			};
			
			const result = securityValidator.validateEnvironmentIsolation(credentials, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Production environment contains test/sandbox references');
		});

		it('should pass for sandbox credentials with sandbox references', () => {
			const credentials = {
				environment: 'sandbox',
				clientId: 'amzn1.application-oa2-client.sandbox12345',
				region: 'us-east-1',
			};
			
			const result = securityValidator.validateEnvironmentIsolation(credentials, mockNodeId);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('validateInput', () => {
		it('should validate required fields', () => {
			const data = { name: 'test', value: 123 };
			const rules = [
				{ field: 'name', required: true, type: 'string' as const },
				{ field: 'value', required: true, type: 'number' as const },
			];
			
			const result = securityValidator.validateInput(data, rules, mockNodeId);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail validation for missing required fields', () => {
			const data = { name: 'test' };
			const rules = [
				{ field: 'name', required: true, type: 'string' as const },
				{ field: 'value', required: true, type: 'number' as const },
			];
			
			const result = securityValidator.validateInput(data, rules, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('value is required');
		});

		it('should validate string length constraints', () => {
			const data = { name: 'ab' };
			const rules = [
				{ field: 'name', required: true, type: 'string' as const, minLength: 3, maxLength: 10 },
			];
			
			const result = securityValidator.validateInput(data, rules, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('name must be at least 3 characters long');
		});

		it('should validate custom validation rules', () => {
			const data = { email: 'invalid-email' };
			const rules = [
				{
					field: 'email',
					required: true,
					type: 'string' as const,
					customValidator: (value: string) => value.includes('@') || 'Invalid email format',
				},
			];
			
			const result = securityValidator.validateInput(data, rules, mockNodeId);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Invalid email format');
		});
	});
}); 