const axios = require('axios');

// Load credentials from environment
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
    console.log('🔑 Getting LWA Access Token...\n');
    
    const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
    });

    try {
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

        console.log('✅ Access Token obtained successfully!\n');
        console.log('Token Info:', {
            access_token: response.data.access_token.substring(0, 50) + '...',
            token_type: response.data.token_type,
            expires_in: response.data.expires_in,
        });
        return response.data.access_token;
    } catch (error) {
        console.log('❌ Failed to get access token!');
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function testSellersAPI(accessToken) {
    console.log('🏪 Testing Sellers API (basic endpoint)...\n');
    
    const url = `${config.endpoint}/sellers/v1/marketplaceParticipations`;
    
    console.log('Request URL:', url);
    
    try {
        const response = await axios.get(url, {
            headers: {
                'x-amz-access-token': accessToken,
                'User-Agent': 'n8n-amazon-sp-api/test',
            },
            timeout: 30000,
        });

        console.log('✅ Sellers API Works!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
        
    } catch (error) {
        console.log('❌ Sellers API Failed!');
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function testDataKiosk(accessToken) {
    console.log('\n📊 Testing Data Kiosk API...\n');
    
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

        console.log('✅ Data Kiosk Works!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
        
    } catch (error) {
        console.log('❌ Data Kiosk Failed!');
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function main() {
    console.log('═'.repeat(70));
    console.log('Testing Amazon SP-API Credentials & DataKiosk Access');
    console.log('═'.repeat(70));
    console.log();
    
    try {
        // Step 1: Get access token
        const accessToken = await getLWAToken();
        
        console.log('\n' + '═'.repeat(70));
        
        // Step 2: Test basic Sellers API
        const sellersWorks = await testSellersAPI(accessToken);
        
        console.log('\n' + '═'.repeat(70));
        
        // Step 3: Test DataKiosk
        const dataKioskWorks = await testDataKiosk(accessToken);
        
        console.log('\n' + '═'.repeat(70));
        console.log('📋 SUMMARY');
        console.log('═'.repeat(70));
        console.log('✅ LWA Authentication: WORKING');
        console.log(sellersWorks ? '✅ Basic API Access (Sellers): WORKING' : '❌ Basic API Access (Sellers): FAILED');
        console.log(dataKioskWorks ? '✅ Data Kiosk API: WORKING' : '❌ Data Kiosk API: NOT AVAILABLE');
        
        if (!dataKioskWorks && sellersWorks) {
            console.log('\n⚠️  CONCLUSION: Your credentials work, but DataKiosk requires "Brand Analytics" role');
        } else if (!sellersWorks) {
            console.log('\n⚠️  CONCLUSION: Your credentials may be invalid or expired');
        }
        console.log('═'.repeat(70));
        
    } catch (error) {
        console.log('\n❌ TEST FAILED:', error.message);
    }
}

main().catch(console.error);

