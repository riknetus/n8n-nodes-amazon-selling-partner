import { 
	getEndpointGroup, 
	getRateLimitConfig, 
	validateRateLimitConfig,
	RATE_LIMIT_GROUPS,
	ENDPOINT_TO_GROUP 
} from '../rateLimitConfig';

describe('Rate Limit Configuration', () => {
	describe('getEndpointGroup', () => {
		it('should map order detail endpoints to orders-detail group', () => {
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567')).toBe('orders-detail');
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/orderItems')).toBe('orders-detail');
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/orderAddress')).toBe('orders-detail');
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/buyerInfo')).toBe('orders-detail');
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/orderItemsBuyerInfo')).toBe('orders-detail');
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/regulatedInfo')).toBe('orders-detail');
		});

		it('should map order list endpoints to orders-list group', () => {
			expect(getEndpointGroup('/orders/v0/orders')).toBe('orders-list');
			expect(getEndpointGroup('/orders/v0/orders?CreatedAfter=2024-01-01')).toBe('orders-list');
		});

		it('should map order update endpoints to orders-update group', () => {
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/shipment')).toBe('orders-update');
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/shipmentStatus')).toBe('orders-update');
		});

		it('should map shipment endpoints to orders-update group', () => {
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/shipmentConfirmation')).toBe(
				'orders-update',
			);
			expect(getEndpointGroup('/orders/v0/orders/123-1234567-1234567/shipmentStatus')).toBe(
				'orders-update',
			);
		});

		it('should return default group for unmatched endpoints', () => {
			expect(getEndpointGroup('/unknown/endpoint')).toBe('default');
			expect(getEndpointGroup('/catalog/v1/items')).toBe('default');
			expect(getEndpointGroup('')).toBe('default');
		});

		it('should handle edge cases', () => {
			expect(getEndpointGroup('/orders/v0/orders/')).toBe('orders-list');
			expect(getEndpointGroup('/orders/v0/orders/invalid-order-id')).toBe('orders-detail');
		});
	});

	describe('getRateLimitConfig', () => {
		beforeEach(() => {
			// Clear environment variable
			delete process.env.RATE_LIMIT_OVERRIDE_JSON;
		});

		it('should return correct config for orders-detail group', () => {
			const config = getRateLimitConfig('orders-detail');
			expect(config).toEqual({
				rate: 0.5,
				burst: 30,
				description: 'Order detail operations: getOrder, getOrderItems, getOrderAddress, getOrderBuyerInfo, etc.'
			});
		});

		it('should return correct config for orders-list group', () => {
			const config = getRateLimitConfig('orders-list');
			expect(config).toEqual({
				rate: 0.0167,
				burst: 20,
				description: 'Order list operations: getOrders'
			});
		});

		it('should return default config for unknown group', () => {
			const config = getRateLimitConfig('unknown-group');
			expect(config).toEqual(RATE_LIMIT_GROUPS['default']);
		});

		it('should apply environment variable overrides', () => {
			process.env.RATE_LIMIT_OVERRIDE_JSON = JSON.stringify({
				'orders-detail': {
					rate: 1.0,
					burst: 50
				}
			});

			const config = getRateLimitConfig('orders-detail');
			expect(config.rate).toBe(1.0);
			expect(config.burst).toBe(50);
			expect(config.description).toBe('Order detail operations: getOrder, getOrderItems, getOrderAddress, getOrderBuyerInfo, etc.');
		});

		it('should handle invalid environment variable override', () => {
			process.env.RATE_LIMIT_OVERRIDE_JSON = 'invalid-json';
			
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
			const config = getRateLimitConfig('orders-detail');
			
			expect(config).toEqual(RATE_LIMIT_GROUPS['orders-detail']);
			expect(consoleSpy).toHaveBeenCalledWith('Failed to parse RATE_LIMIT_OVERRIDE_JSON:', expect.any(SyntaxError));
			
			consoleSpy.mockRestore();
		});

		it('should only override specified groups', () => {
			process.env.RATE_LIMIT_OVERRIDE_JSON = JSON.stringify({
				'orders-detail': {
					rate: 1.0
				}
			});

			const detailConfig = getRateLimitConfig('orders-detail');
			const listConfig = getRateLimitConfig('orders-list');
			
			expect(detailConfig.rate).toBe(1.0);
			expect(detailConfig.burst).toBe(30); // Original value preserved
			expect(listConfig).toEqual(RATE_LIMIT_GROUPS['orders-list']); // Unchanged
		});
	});

	describe('validateRateLimitConfig', () => {
		it('should validate correct configurations', () => {
			expect(validateRateLimitConfig({ rate: 0.5, burst: 30 })).toBe(true);
			expect(validateRateLimitConfig({ rate: 1.0, burst: 1 })).toBe(true);
			expect(validateRateLimitConfig({ rate: 0.0167, burst: 20 })).toBe(true);
		});

		it('should reject invalid rate values', () => {
			expect(validateRateLimitConfig({ rate: 0, burst: 30 })).toBe(false);
			expect(validateRateLimitConfig({ rate: -1, burst: 30 })).toBe(false);
			expect(validateRateLimitConfig({ rate: NaN, burst: 30 })).toBe(false);
			expect(validateRateLimitConfig({ rate: 'invalid' as any, burst: 30 })).toBe(false);
		});

		it('should reject invalid burst values', () => {
			expect(validateRateLimitConfig({ rate: 0.5, burst: 0 })).toBe(false);
			expect(validateRateLimitConfig({ rate: 0.5, burst: -1 })).toBe(false);
			expect(validateRateLimitConfig({ rate: 0.5, burst: NaN })).toBe(false);
			expect(validateRateLimitConfig({ rate: 0.5, burst: 'invalid' as any })).toBe(false);
		});

		it('should reject configurations with missing properties', () => {
			expect(validateRateLimitConfig({ rate: 0.5 } as any)).toBe(false);
			expect(validateRateLimitConfig({ burst: 30 } as any)).toBe(false);
			expect(validateRateLimitConfig({} as any)).toBe(false);
		});
	});

	describe('ENDPOINT_TO_GROUP mapping', () => {
		it('should have valid regex patterns', () => {
			ENDPOINT_TO_GROUP.forEach(({ pattern, group }) => {
				expect(pattern).toBeInstanceOf(RegExp);
				expect(typeof group).toBe('string');
				expect(group.length).toBeGreaterThan(0);
			});
		});

		it('should map to existing groups', () => {
			ENDPOINT_TO_GROUP.forEach(({ group }) => {
				expect(RATE_LIMIT_GROUPS[group] || group === 'default').toBeTruthy();
			});
		});

		it('should not have overlapping patterns for same priority', () => {
			// Test a few key endpoints to ensure they map to expected groups
			const testCases = [
				{ endpoint: '/orders/v0/orders/123-1234567-1234567', expectedGroup: 'orders-detail' },
				{ endpoint: '/orders/v0/orders', expectedGroup: 'orders-list' },
				{ endpoint: '/orders/v0/orders/123-1234567-1234567/orderItems', expectedGroup: 'orders-detail' },
			];

			testCases.forEach(({ endpoint, expectedGroup }) => {
				expect(getEndpointGroup(endpoint)).toBe(expectedGroup);
			});
		});
	});

	describe('Rate limit configuration completeness', () => {
		it('should have all required rate limit groups defined', () => {
			const requiredGroups = ['orders-detail', 'orders-list', 'orders-update', 'default'];
			
			requiredGroups.forEach(group => {
				expect(RATE_LIMIT_GROUPS[group]).toBeDefined();
				expect(validateRateLimitConfig(RATE_LIMIT_GROUPS[group])).toBe(true);
			});
		});

		it('should have reasonable rate limits for production use', () => {
			// Orders detail should allow 0.5 rps with 30 burst (matches Amazon documentation)
			expect(RATE_LIMIT_GROUPS['orders-detail'].rate).toBe(0.5);
			expect(RATE_LIMIT_GROUPS['orders-detail'].burst).toBe(30);

			// Orders list should be more restrictive (matches Amazon documentation)
			expect(RATE_LIMIT_GROUPS['orders-list'].rate).toBe(0.0167);
			expect(RATE_LIMIT_GROUPS['orders-list'].burst).toBe(20);

			// Update operations should be more permissive
			expect(RATE_LIMIT_GROUPS['orders-update'].rate).toBe(2.0);
			expect(RATE_LIMIT_GROUPS['orders-update'].burst).toBe(10);
		});
	});
}); 