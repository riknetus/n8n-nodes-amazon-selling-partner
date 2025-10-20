const axios = require('axios');

const credentials = {
    refreshToken: process.env.AMZN_REFRESH_TOKEN,
    clientId: process.env.AMZN_CLIENT_ID,
    clientSecret: process.env.AMZN_CLIENT_SECRET
};

const config = {
    endpoint: 'https://sellingpartnerapi-eu.amazon.com',
    marketplaceId: 'A21TJRUUN4KGV',
};

async function getLWAToken() {
    const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
    });

    const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        formData.toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'n8n-amazon-sp-api/test',
            },
            timeout: 30000,
        }
    );

    return response.data.access_token;
}

async function testQuery(accessToken, queryName, graphqlQuery) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing: ${queryName}`);
    console.log(`${'='.repeat(70)}`);
    console.log('Query:', graphqlQuery, '\n');
    
    const url = `${config.endpoint}/dataKiosk/2023-11-15/queries`;
    
    try {
        const response = await axios.post(
            url,
            { query: graphqlQuery },
            {
                headers: {
                    'x-amz-access-token': accessToken,
                    'User-Agent': 'n8n-amazon-sp-api/test',
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        console.log(`✅ SUCCESS!`);
        console.log('Query ID:', response.data.queryId);
        return true;
        
    } catch (error) {
        console.log(`❌ FAILED`);
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function main() {
    console.log('═'.repeat(70));
    console.log('Testing DataKiosk Query Structures');
    console.log('═'.repeat(70));
    
    try {
        console.log('\n🔑 Getting LWA Access Token...');
        const accessToken = await getLWAToken();
        console.log('✅ Access Token obtained');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Try 1: Minimal - just top-level fields
        const query1 = `query { analytics_salesAndTraffic_2024_04_24(startDate: "${startDateStr}" endDate: "${endDateStr}" marketplaceIds: ["${config.marketplaceId}"] aggregateBy: DATE) { startDate endDate } }`;
        
        // Try 2: Even simpler - just one field
        const query2 = `query { analytics_salesAndTraffic_2024_04_24(startDate: "${startDateStr}" endDate: "${endDateStr}" marketplaceIds: ["${config.marketplaceId}"] aggregateBy: DATE) { startDate } }`;
        
        // Try 3: With salesAndTrafficByDate but minimal
        const query3 = `query { analytics_salesAndTraffic_2024_04_24(startDate: "${startDateStr}" endDate: "${endDateStr}" marketplaceIds: ["${config.marketplaceId}"] aggregateBy: DATE) { salesAndTrafficByDate { date } } }`;
        
        // Try 4: Different nesting
        const query4 = `query { analytics_salesAndTraffic_2024_04_24(startDate: "${startDateStr}" endDate: "${endDateStr}" marketplaceIds: ["${config.marketplaceId}"] aggregateBy: DATE) { salesAndTrafficByDate { salesByDate { unitsOrdered } } } }`;
        
        // Try 5: Without nested objects - just requesting the parent
        const query5 = `query { analytics_salesAndTraffic_2024_04_24(startDate: "${startDateStr}" endDate: "${endDateStr}" marketplaceIds: ["${config.marketplaceId}"]) { startDate } }`;
        
        // Try 6: With aggregateBy as string
        const query6 = `query { analytics_salesAndTraffic_2024_04_24(startDate: "${startDateStr}", endDate: "${endDateStr}", marketplaceIds: ["${config.marketplaceId}"], aggregateBy: DATE) { salesAndTrafficByDate { date } } }`;
        
        const results = [];
        results.push(await testQuery(accessToken, 'Try 1: Top-level fields only', query1));
        results.push(await testQuery(accessToken, 'Try 2: Single field', query2));
        results.push(await testQuery(accessToken, 'Try 3: With salesAndTrafficByDate minimal', query3));
        results.push(await testQuery(accessToken, 'Try 4: Nested structure', query4));
        results.push(await testQuery(accessToken, 'Try 5: Without aggregateBy', query5));
        results.push(await testQuery(accessToken, 'Try 6: Commas in params', query6));
        
        console.log('\n' + '═'.repeat(70));
        console.log('📋 SUMMARY');
        console.log('═'.repeat(70));
        const successCount = results.filter(r => r).length;
        console.log(`✅ Successful: ${successCount}/6`);
        console.log(`❌ Failed: ${6 - successCount}/6`);
        console.log('═'.repeat(70));
        
    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
    }
}

main().catch(console.error);

