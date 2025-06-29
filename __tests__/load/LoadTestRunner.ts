import { performance } from 'perf_hooks';

export interface LoadTestConfig {
	name: string;
	duration: number; // in milliseconds
	concurrency: number;
	requestsPerSecond?: number;
	rampUpTime?: number; // time to reach full concurrency
	scenarios: LoadTestScenario[];
}

export interface LoadTestScenario {
	name: string;
	weight: number; // percentage of requests (0-1)
	execute: () => Promise<LoadTestResult>;
}

export interface LoadTestResult {
	success: boolean;
	duration: number;
	error?: string;
	metadata?: Record<string, any>;
}

export interface LoadTestReport {
	config: LoadTestConfig;
	startTime: Date;
	endTime: Date;
	totalDuration: number;
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	requestsPerSecond: number;
	averageResponseTime: number;
	minResponseTime: number;
	maxResponseTime: number;
	p50ResponseTime: number;
	p95ResponseTime: number;
	p99ResponseTime: number;
	errorsByType: Record<string, number>;
	scenarioResults: Record<string, {
		requests: number;
		successes: number;
		failures: number;
		averageResponseTime: number;
	}>;
}

export class LoadTestRunner {
	private results: LoadTestResult[] = [];
	private isRunning = false;

	async runLoadTest(config: LoadTestConfig): Promise<LoadTestReport> {
		console.log(`Starting load test: ${config.name}`);
		console.log(`Duration: ${config.duration}ms, Concurrency: ${config.concurrency}`);

		this.results = [];
		this.isRunning = true;

		const startTime = new Date();
		const endTime = new Date(startTime.getTime() + config.duration);

		// Calculate request interval if requestsPerSecond is specified
		const requestInterval = config.requestsPerSecond 
			? 1000 / config.requestsPerSecond 
			: 0;

		// Start concurrent workers
		const workers = [];
		for (let i = 0; i < config.concurrency; i++) {
			const workerDelay = config.rampUpTime 
				? (config.rampUpTime / config.concurrency) * i 
				: 0;
			
			workers.push(this.runWorker(config, endTime, requestInterval, workerDelay));
		}

		// Wait for all workers to complete
		await Promise.all(workers);

		this.isRunning = false;
		const actualEndTime = new Date();

		return this.generateReport(config, startTime, actualEndTime);
	}

	private async runWorker(
		config: LoadTestConfig, 
		endTime: Date, 
		requestInterval: number,
		delay: number
	): Promise<void> {
		// Initial delay for ramp-up
		if (delay > 0) {
			await this.sleep(delay);
		}

		while (this.isRunning && new Date() < endTime) {
			try {
				// Select scenario based on weights
				const scenario = this.selectScenario(config.scenarios);
				
				const startTime = performance.now();
				const result = await scenario.execute();
				result.duration = performance.now() - startTime;
				result.metadata = { ...result.metadata, scenario: scenario.name };

				this.results.push(result);

				// Rate limiting
				if (requestInterval > 0) {
					await this.sleep(requestInterval);
				}
			} catch (error) {
				this.results.push({
					success: false,
					duration: 0,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
	}

	private selectScenario(scenarios: LoadTestScenario[]): LoadTestScenario {
		const random = Math.random();
		let cumulativeWeight = 0;

		for (const scenario of scenarios) {
			cumulativeWeight += scenario.weight;
			if (random <= cumulativeWeight) {
				return scenario;
			}
		}

		// Fallback to first scenario
		return scenarios[0];
	}

	private generateReport(config: LoadTestConfig, startTime: Date, endTime: Date): LoadTestReport {
		const totalDuration = endTime.getTime() - startTime.getTime();
		const successfulResults = this.results.filter(r => r.success);
		const failedResults = this.results.filter(r => !r.success);

		// Calculate response time percentiles
		const responseTimes = successfulResults.map(r => r.duration).sort((a, b) => a - b);
		const p50Index = Math.floor(responseTimes.length * 0.5);
		const p95Index = Math.floor(responseTimes.length * 0.95);
		const p99Index = Math.floor(responseTimes.length * 0.99);

		// Group errors by type
		const errorsByType: Record<string, number> = {};
		for (const result of failedResults) {
			const errorType = result.error || 'Unknown';
			errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
		}

		// Calculate scenario-specific results
		const scenarioResults: Record<string, any> = {};
		for (const scenario of config.scenarios) {
			const scenarioResultsList = this.results.filter(r => r.metadata?.scenario === scenario.name);
			const scenarioSuccesses = scenarioResultsList.filter(r => r.success);
			
			scenarioResults[scenario.name] = {
				requests: scenarioResultsList.length,
				successes: scenarioSuccesses.length,
				failures: scenarioResultsList.length - scenarioSuccesses.length,
				averageResponseTime: scenarioSuccesses.length > 0 
					? scenarioSuccesses.reduce((sum, r) => sum + r.duration, 0) / scenarioSuccesses.length 
					: 0,
			};
		}

		const report: LoadTestReport = {
			config,
			startTime,
			endTime,
			totalDuration,
			totalRequests: this.results.length,
			successfulRequests: successfulResults.length,
			failedRequests: failedResults.length,
			requestsPerSecond: this.results.length / (totalDuration / 1000),
			averageResponseTime: successfulResults.length > 0 
				? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length 
				: 0,
			minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
			maxResponseTime: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
			p50ResponseTime: responseTimes.length > 0 ? responseTimes[p50Index] : 0,
			p95ResponseTime: responseTimes.length > 0 ? responseTimes[p95Index] : 0,
			p99ResponseTime: responseTimes.length > 0 ? responseTimes[p99Index] : 0,
			errorsByType,
			scenarioResults,
		};

		this.printReport(report);
		return report;
	}

	private printReport(report: LoadTestReport): void {
		console.log('\n=== Load Test Report ===');
		console.log(`Test: ${report.config.name}`);
		console.log(`Duration: ${report.totalDuration}ms`);
		console.log(`Total Requests: ${report.totalRequests}`);
		console.log(`Successful: ${report.successfulRequests} (${((report.successfulRequests / report.totalRequests) * 100).toFixed(2)}%)`);
		console.log(`Failed: ${report.failedRequests} (${((report.failedRequests / report.totalRequests) * 100).toFixed(2)}%)`);
		console.log(`Requests/sec: ${report.requestsPerSecond.toFixed(2)}`);
		console.log('\nResponse Times:');
		console.log(`  Average: ${report.averageResponseTime.toFixed(2)}ms`);
		console.log(`  Min: ${report.minResponseTime.toFixed(2)}ms`);
		console.log(`  Max: ${report.maxResponseTime.toFixed(2)}ms`);
		console.log(`  P50: ${report.p50ResponseTime.toFixed(2)}ms`);
		console.log(`  P95: ${report.p95ResponseTime.toFixed(2)}ms`);
		console.log(`  P99: ${report.p99ResponseTime.toFixed(2)}ms`);

		if (Object.keys(report.errorsByType).length > 0) {
			console.log('\nErrors by Type:');
			for (const [errorType, count] of Object.entries(report.errorsByType)) {
				console.log(`  ${errorType}: ${count}`);
			}
		}

		console.log('\nScenario Results:');
		for (const [scenarioName, results] of Object.entries(report.scenarioResults)) {
			console.log(`  ${scenarioName}:`);
			console.log(`    Requests: ${results.requests}`);
			console.log(`    Success Rate: ${((results.successes / results.requests) * 100).toFixed(2)}%`);
			console.log(`    Avg Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
		}
		console.log('========================\n');
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	stop(): void {
		this.isRunning = false;
	}
}

// Example load test configurations
export const createOrdersLoadTest = (): LoadTestConfig => ({
	name: 'Orders API Load Test',
	duration: 60000, // 1 minute
	concurrency: 10,
	requestsPerSecond: 5, // Respect SP-API rate limits
	rampUpTime: 10000, // 10 seconds to reach full concurrency
	scenarios: [
		{
			name: 'getOrders',
			weight: 0.8, // 80% of requests
			execute: async () => {
				const delay = 500 + Math.random() * 1000; // 500-1500ms
				await new Promise(resolve => setTimeout(resolve, delay));
				// Simulate some failures
				const success = Math.random() > 0.05; // 95% success rate
				return {
					success,
					duration: delay,
					error: success ? undefined : 'Simulated API error',
					metadata: { endpoint: '/orders/v0/orders' },
				};
			},
		},
		{
			name: 'getOrder',
			weight: 0.1, // 10% of requests
			execute: async () => {
				const delay = 400 + Math.random() * 900; // 400-1300ms
				await new Promise(resolve => setTimeout(resolve, delay));
				const success = Math.random() > 0.04; // 96% success rate
				return {
					success,
					duration: delay,
					error: success ? undefined : 'Simulated API error',
					metadata: { endpoint: '/orders/v0/orders/{orderId}' },
				};
			},
		},
		{
			name: 'getOrderItems',
			weight: 0.1, // 10% of requests
			execute: async () => {
				const delay = 300 + Math.random() * 800; // 300-1100ms
				await new Promise(resolve => setTimeout(resolve, delay));
				const success = Math.random() > 0.03; // 97% success rate
				return {
					success,
					duration: delay,
					error: success ? undefined : 'Simulated API error',
					metadata: { endpoint: '/orders/v0/orders/{orderId}/orderItems' },
				};
			},
		},
	],
});

export const createStressTest = (): LoadTestConfig => ({
	name: 'Stress Test - High Concurrency',
	duration: 30000, // 30 seconds
	concurrency: 50,
	rampUpTime: 5000, // 5 seconds ramp-up
	scenarios: [
		{
			name: 'rapidRequests',
			weight: 1.0,
			execute: async () => {
				const delay = 100 + Math.random() * 200; // 100-300ms
				await new Promise(resolve => setTimeout(resolve, delay));
				
				// Higher failure rate under stress
				const success = Math.random() > 0.15; // 85% success rate
				
				return {
					success,
					duration: delay,
					error: success ? undefined : 'Stress test failure',
				};
			},
		},
	],
});

export const createEnduranceTest = (): LoadTestConfig => ({
	name: 'Endurance Test - Long Duration',
	duration: 300000, // 5 minutes
	concurrency: 5,
	requestsPerSecond: 2,
	scenarios: [
		{
			name: 'sustainedLoad',
			weight: 1.0,
			execute: async () => {
				const delay = 800 + Math.random() * 400; // 800-1200ms
				await new Promise(resolve => setTimeout(resolve, delay));
				
				const success = Math.random() > 0.02; // 98% success rate
				
				return {
					success,
					duration: delay,
					error: success ? undefined : 'Endurance test failure',
				};
			},
		},
	],
}); 