const axios = require('axios');

// Your credentials - REPLACE WITH YOUR OWN
const credentials = {
    refreshToken: 'YOUR_REFRESH_TOKEN_HERE',
    clientId: 'YOUR_CLIENT_ID_HERE',
    clientSecret: 'YOUR_CLIENT_SECRET_HERE'
};

async function testLWATokenExchange() {
    console.log('Testing LWA Token Exchange...');
    console.log('=====================================\n');
    
    try {
        // Step 1: Exchange refresh token for access token
        const formData = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: credentials.refreshToken,
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
        });

        console.log('Request URL:', 'https://api.amazon.com/auth/o2/token');
        console.log('Request Body:', formData.toString().substring(0, 100) + '...\n');

        const tokenResponse = await axios.post(
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

        console.log('✅ LWA Token Exchange Successful!');
        console.log('Access Token:', tokenResponse.data.access_token.substring(0, 50) + '...');
        console.log('Token Type:', tokenResponse.data.token_type);
        console.log('Expires In:', tokenResponse.data.expires_in, 'seconds\n');

        // Step 2: Test SP-API call with the access token
        const accessToken = tokenResponse.data.access_token;
        await testSPApiCall(accessToken);

    } catch (error) {
        console.error('❌ LWA Token Exchange Failed!\n');
        
        if (axios.isAxiosError(error) && error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
        } else if (error.message) {
            console.error('Error:', error.message);
        } else {
            console.error('Unknown error:', error);
        }
    }
}

async function testSPApiCall(accessToken) {
    console.log('Testing SP-API Call...');
    console.log('=====================================\n');

    // Test with your marketplace - Update these values!
    const marketplaceId = 'A21TJRUUN4KGV'; // Example: India marketplace
    const endpoint = 'https://sellingpartnerapi-eu.amazon.com'; // EU endpoint for India
    
    try {
        // Simple test call to get marketplace participation
        const response = await axios.get(
            `${endpoint}/sellers/v1/marketplaceParticipations`,
            {
                headers: {
                    'x-amz-access-token': accessToken,
                    'User-Agent': 'n8n-amazon-sp-api/1.11.2-test',
                    'Accept': 'application/json',
                },
                timeout: 30000,
            }
        );

        console.log('✅ SP-API Call Successful!');
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ SP-API Call Failed!\n');
        
        if (axios.isAxiosError(error) && error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
            
            if (error.response.status === 403) {
                console.error('\n⚠️  403 Forbidden - This usually means:');
                console.error('   1. Your app does not have the required SP-API roles/permissions');
                console.error('   2. The marketplace ID doesn\'t match your authorization');
                console.error('   3. Your app needs to be re-authorized in Seller Central');
            }
        } else if (error.message) {
            console.error('Error:', error.message);
        } else {
            console.error('Unknown error:', error);
        }
    }
}

// Run the test
testLWATokenExchange();



