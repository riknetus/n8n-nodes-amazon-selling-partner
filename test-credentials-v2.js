const axios = require('axios');

// Your credentials - REPLACE WITH YOUR OWN
const credentials = {
    refreshToken: 'YOUR_REFRESH_TOKEN_HERE',
    clientId: 'YOUR_CLIENT_ID_HERE',
    clientSecret: 'YOUR_CLIENT_SECRET_HERE'
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
                'User-Agent': 'n8n-amazon-sp-api/1.11.2-test',
            },
            timeout: 30000,
        }
    );

    return response.data.access_token;
}

async function testMultipleEndpoints() {
    console.log('Getting LWA Access Token...\n');
    const accessToken = await getLWAToken();
    console.log('✅ Access Token obtained\n');

    const endpoint = 'https://sellingpartnerapi-eu.amazon.com'; // Update based on your region
    const marketplaceId = 'A21TJRUUN4KGV'; // Example: India marketplace - Update this!

    const tests = [
        {
            name: 'Marketplace Participation',
            url: `${endpoint}/sellers/v1/marketplaceParticipations`,
            role: 'Selling Partner Insights'
        },
        {
            name: 'Orders (last 7 days)',
            url: `${endpoint}/orders/v0/orders?MarketplaceIds=${marketplaceId}&CreatedAfter=${new Date(Date.now() - 7*24*60*60*1000).toISOString()}`,
            role: 'Inventory and Order Tracking'
        },
        {
            name: 'Report Types',
            url: `${endpoint}/reports/2021-06-30/reports?reportTypes=GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL`,
            role: 'Inventory and Order Tracking (Reports)'
        },
        {
            name: 'Data Kiosk Queries (probe)',
            url: `${endpoint}/dataKiosk/2023-11-15/queries?pageSize=1`,
            method: 'GET',
            role: 'Selling Partner Insights / Data Kiosk',
        },
        {
            name: 'Inventory Summaries',
            url: `${endpoint}/fba/inventory/v1/summaries?marketplaceIds=${marketplaceId}&granularityType=Marketplace`,
            role: 'Amazon Fulfillment / Inventory and Order Tracking'
        }
    ];

    for (const test of tests) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${test.name}`);
        console.log(`Required Role: ${test.role}`);
        console.log(`${'='.repeat(60)}`);

        try {
            const config = {
                headers: {
                    'x-amz-access-token': accessToken,
                    'User-Agent': 'n8n-amazon-sp-api/1.11.2-test',
                    'Accept': 'application/json',
                },
                timeout: 30000,
            };

            let response;
            if (test.method === 'POST') {
                config.headers['Content-Type'] = 'application/json';
                response = await axios.post(test.url, test.body, config);
            } else {
                response = await axios.get(test.url, config);
            }

            console.log(`✅ SUCCESS - Status: ${response.status}`);
            console.log('Response preview:', JSON.stringify(response.data).substring(0, 200) + '...');

        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                console.log(`❌ FAILED - Status: ${error.response.status}`);
                console.log('Error:', JSON.stringify(error.response.data, null, 2));
                
                if (error.response.status === 403) {
                    console.log('\n⚠️  This endpoint requires a role you may not have or app not authorized properly');
                }
            } else {
                console.log('❌ FAILED - Network error:', error.message);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS:');
    console.log('='.repeat(60));
    console.log('If ALL tests fail with 403, your app needs to be:');
    console.log('  1. Authorized in Seller Central (Apps & Services > Manage Apps)');
    console.log('  2. Make sure you used Self-Authorization to get the refresh token');
    console.log('\nIf SOME tests pass:');
    console.log('  - You have some roles working');
    console.log('  - Failed endpoints need additional roles added in Developer Portal');
}

// Run tests
testMultipleEndpoints().catch(console.error);



