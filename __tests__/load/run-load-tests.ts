import { LoadTestRunner, createOrdersLoadTest, createStressTest, createEnduranceTest } from './LoadTestRunner';

async function runAllLoadTests() {
	const runner = new LoadTestRunner();

	console.log('🚀 Starting Amazon SP-API Load Tests\n');

	try {
		// Run Orders Load Test
		console.log('Running Orders Load Test...');
		const ordersTest = await runner.runLoadTest(createOrdersLoadTest());
		
		// Wait between tests
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Run Stress Test
		console.log('Running Stress Test...');
		const stressTest = await runner.runLoadTest(createStressTest());
		
		// Wait between tests
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Run Endurance Test (optional - takes 5 minutes)
		if (process.argv.includes('--endurance')) {
			console.log('Running Endurance Test...');
			const enduranceTest = await runner.runLoadTest(createEnduranceTest());
		}

		console.log('✅ All load tests completed successfully!');
		
		// Summary
		console.log('\n=== Test Summary ===');
		console.log(`Orders Test: ${ordersTest.successfulRequests}/${ordersTest.totalRequests} requests successful`);
		console.log(`Stress Test: ${stressTest.successfulRequests}/${stressTest.totalRequests} requests successful`);
		console.log('====================');

	} catch (error) {
		console.error('❌ Load test failed:', error);
		process.exit(1);
	}
}

// Handle graceful shutdown
process.on('SIGINT', () => {
	console.log('\n⏹️  Stopping load tests...');
	process.exit(0);
});

// Run the tests
if (require.main === module) {
	runAllLoadTests().catch(console.error);
} 