const axios = require('axios');

// Load credentials from environment
const credentials = {
    refreshToken: process.env.AMZN_REFRESH_TOKEN,
    clientId: process.env.AMZN_CLIENT_ID,
    clientSecret: process.env.AMZN_CLIENT_SECRET
};

// Test both sandbox and production
const configs = [
    {
        name: 'SANDBOX',
        endpoint: 'https://sandbox.sellingpartnerapi-eu.amazon.com',
        marketplaceId: 'A21TJRUUN4KGV',
    },
    {
        name: 'PRODUCTION',
        endpoint: 'https://sellingpartnerapi-eu.amazon.com',
        marketplaceId: 'A21TJRUUN4KGV',
    }
];

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

async function testSellersAPI(config, accessToken) {
    console.log(`\n🏪 Testing Sellers API (${config.name})...`);
    
    const url = `${config.endpoint}/sellers/v1/marketplaceParticipations`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'x-amz-access-token': accessToken,
                'User-Agent': 'n8n-amazon-sp-api/test',
            },
            timeout: 30000,
        });

        console.log(`✅ ${config.name} Sellers API: WORKING`);
        console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 300) + '...');
        return true;
        
    } catch (error) {
        console.log(`❌ ${config.name} Sellers API: FAILED`);
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function testDataKiosk(config, accessToken) {
    console.log(`\n📊 Testing Data Kiosk API (${config.name})...`);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    
    const graphqlQuery = `
        query {
            salesAndTraffic(
                startDate: "${startDate.toISOString().split('T')[0]}"
                endDate: "${endDate.toISOString().split('T')[0]}"
                marketplaceIds: ["${config.marketplaceId}"]
                aggregateBy: DATE
            ) {
                startDate
                endDate
            }
        }
    `.replace(/\s+/g, ' ').trim();
    
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

        console.log(`✅ ${config.name} Data Kiosk: WORKING`);
        console.log('Query ID:', response.data.queryId);
        return true;
        
    } catch (error) {
        console.log(`❌ ${config.name} Data Kiosk: FAILED`);
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function main() {
    console.log('═'.repeat(70));
    console.log('Testing SANDBOX vs PRODUCTION Endpoints');
    console.log('═'.repeat(70));
    
    try {
        // Get access token (same for both sandbox and production)
        console.log('🔑 Getting LWA Access Token...\n');
        const accessToken = await getLWAToken();
        console.log('✅ Access Token obtained\n');
        
        console.log('═'.repeat(70));
        
        const results = {
            sandbox: { sellers: false, datakiosk: false },
            production: { sellers: false, datakiosk: false }
        };
        
        // Test SANDBOX
        console.log('\n🧪 TESTING SANDBOX ENDPOINTS');
        console.log('═'.repeat(70));
        results.sandbox.sellers = await testSellersAPI(configs[0], accessToken);
        results.sandbox.datakiosk = await testDataKiosk(configs[0], accessToken);
        
        // Test PRODUCTION
        console.log('\n\n🚀 TESTING PRODUCTION ENDPOINTS');
        console.log('═'.repeat(70));
        results.production.sellers = await testSellersAPI(configs[1], accessToken);
        results.production.datakiosk = await testDataKiosk(configs[1], accessToken);
        
        // Summary
        console.log('\n\n═'.repeat(70));
        console.log('📋 SUMMARY');
        console.log('═'.repeat(70));
        console.log('\nSANDBOX:');
        console.log(`  Sellers API: ${results.sandbox.sellers ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`  DataKiosk API: ${results.sandbox.datakiosk ? '✅ WORKING' : '❌ FAILED'}`);
        console.log('\nPRODUCTION:');
        console.log(`  Sellers API: ${results.production.sellers ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`  DataKiosk API: ${results.production.datakiosk ? '✅ WORKING' : '❌ FAILED'}`);
        
        console.log('\n💡 CONCLUSION:');
        if (results.sandbox.sellers) {
            console.log('✅ Your credentials are SANDBOX credentials');
            console.log('   Use endpoint: https://sandbox.sellingpartnerapi-eu.amazon.com');
        } else if (results.production.sellers) {
            console.log('✅ Your credentials are PRODUCTION credentials');
            console.log('   Use endpoint: https://sellingpartnerapi-eu.amazon.com');
        } else {
            console.log('❌ Your credentials don\'t work with either endpoint');
            console.log('   - Check if refresh token is valid');
            console.log('   - Check if app is self-authorized');
            console.log('   - Check marketplace/region configuration');
        }
        
        if (results.sandbox.datakiosk || results.production.datakiosk) {
            console.log('✅ DataKiosk API is working!');
        } else {
            console.log('❌ DataKiosk API requires "Brand Analytics" role');
        }
        
        console.log('═'.repeat(70));
        
    } catch (error) {
        console.log('\n❌ TEST FAILED:', error.message);
    }
}

main().catch(console.error);

