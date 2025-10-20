const axios = require('axios');

// Your credentials - Add your credentials here to test
const credentials = {
    refreshToken: process.env.AMZN_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN_HERE',
    clientId: process.env.AMZN_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
    clientSecret: process.env.AMZN_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE'
};

// Check if credentials are provided
if (credentials.refreshToken === 'YOUR_REFRESH_TOKEN_HERE') {
    console.error('❌ Please provide credentials!');
    console.error('   Either set environment variables or edit the script:\n');
    console.error('   export AMZN_REFRESH_TOKEN="your-token"');
    console.error('   export AMZN_CLIENT_ID="your-client-id"');
    console.error('   export AMZN_CLIENT_SECRET="your-secret"\n');
    process.exit(1);
}

// Configuration
const config = {
    endpoint: 'https://sellingpartnerapi-eu.amazon.com', // EU endpoint for India
    marketplaceId: 'A21TJRUUN4KGV', // India marketplace
};

async function getLWAToken() {
    console.log('1️⃣  Getting LWA Access Token...\n');
    
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

    console.log('✅ Access Token obtained\n');
    return response.data.access_token;
}

async function createDataKioskQuery(accessToken) {
    console.log('2️⃣  Creating Data Kiosk Query (Correct API)...\n');
    
    // Build GraphQL query for sales and traffic data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
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
                marketplaceId
                salesAndTrafficByDate {
                    date
                    salesByDate {
                        orderedProductSales {
                            amount
                            currencyCode
                        }
                        unitsOrdered
                    }
                    trafficByDate {
                        browserPageViews
                        browserSessions
                        mobileAppPageViews
                        mobileAppSessions
                    }
                }
            }
        }
    `.replace(/\s+/g, ' ').trim();
    
    console.log('GraphQL Query:', graphqlQuery.substring(0, 150) + '...\n');
    
    const url = `${config.endpoint}/dataKiosk/2023-11-15/queries`;
    
    console.log('Request URL:', url);
    console.log('Method: POST\n');
    
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

        console.log('✅ Query Created Successfully!');
        console.log('Status:', response.status);
        console.log('Query ID:', response.data.queryId);
        console.log('Response:', JSON.stringify(response.data, null, 2), '\n');
        
        return response.data.queryId;
        
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.log('❌ Query Creation Failed!');
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
            console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
            
            if (error.response.status === 403) {
                console.log('\n⚠️  403 Error - This means:');
                console.log('   • Data Kiosk API requires "Brand Analytics" role');
                console.log('   • Your app may not have this role enabled');
                console.log('   • This is the same issue as before with the wrong endpoint');
            }
        } else {
            console.log('❌ Error:', error.message);
        }
        throw error;
    }
}

async function pollQueryStatus(accessToken, queryId) {
    console.log('3️⃣  Polling Query Status...\n');
    
    const maxAttempts = 20;
    const pollInterval = 3000; // 3 seconds
    
    for (let i = 0; i < maxAttempts; i++) {
        const url = `${config.endpoint}/dataKiosk/2023-11-15/queries/${queryId}`;
        
        console.log(`Attempt ${i + 1}/${maxAttempts}: Checking query status...`);
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'x-amz-access-token': accessToken,
                    'User-Agent': 'n8n-amazon-sp-api/test',
                },
                timeout: 30000,
            });

            const query = response.data;
            console.log(`Status: ${query.processingStatus}`);
            
            if (query.processingStatus === 'DONE') {
                console.log('\n✅ Query Complete!');
                console.log('Data Document ID:', query.dataDocumentId);
                console.log('Full Response:', JSON.stringify(query, null, 2), '\n');
                return query.dataDocumentId;
            } else if (query.processingStatus === 'FATAL' || query.processingStatus === 'CANCELLED') {
                console.log('\n❌ Query Failed!');
                console.log('Status:', query.processingStatus);
                if (query.errorDocumentId) {
                    console.log('Error Document ID:', query.errorDocumentId);
                }
                throw new Error(`Query failed with status: ${query.processingStatus}`);
            }
            
            // Still processing, wait and retry
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                console.log('❌ Status Check Failed!');
                console.log('Status:', error.response.status);
                console.log('Response:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }
    
    throw new Error('Query timed out - exceeded maximum polling attempts');
}

async function getDocument(accessToken, documentId) {
    console.log('4️⃣  Getting Document URL...\n');
    
    const url = `${config.endpoint}/dataKiosk/2023-11-15/documents/${documentId}`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'x-amz-access-token': accessToken,
                'User-Agent': 'n8n-amazon-sp-api/test',
            },
            timeout: 30000,
        });

        console.log('✅ Document Info Retrieved!');
        console.log('Document ID:', response.data.documentId);
        console.log('Document URL:', response.data.documentUrl, '\n');
        
        return response.data.documentUrl;
        
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.log('❌ Get Document Failed!');
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function downloadDocument(documentUrl) {
    console.log('5️⃣  Downloading Document Data...\n');
    
    try {
        const response = await axios.get(documentUrl, {
            timeout: 30000,
        });

        console.log('✅ Document Downloaded!');
        console.log('Content Type:', response.headers['content-type']);
        console.log('Content Encoding:', response.headers['content-encoding'] || 'none');
        console.log('\nData Preview:');
        console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + '...\n');
        
        return response.data;
        
    } catch (error) {
        console.log('❌ Download Failed!');
        console.log('Error:', error.message);
        throw error;
    }
}

async function testCorrectDataKioskAPI() {
    console.log('═'.repeat(70));
    console.log('Testing CORRECT Data Kiosk API (2023-11-15)');
    console.log('═'.repeat(70));
    console.log();
    
    try {
        // Step 1: Get access token
        const accessToken = await getLWAToken();
        
        // Step 2: Create query
        const queryId = await createDataKioskQuery(accessToken);
        
        // Step 3: Poll for completion
        const documentId = await pollQueryStatus(accessToken, queryId);
        
        // Step 4: Get document URL
        const documentUrl = await getDocument(accessToken, documentId);
        
        // Step 5: Download data
        const data = await downloadDocument(documentUrl);
        
        console.log('═'.repeat(70));
        console.log('✅ ALL TESTS PASSED!');
        console.log('═'.repeat(70));
        console.log('\nThe correct Data Kiosk API (2023-11-15) works!');
        console.log('Now we can implement this properly in the node.\n');
        
    } catch (error) {
        console.log('\n═'.repeat(70));
        console.log('❌ TEST FAILED');
        console.log('═'.repeat(70));
        console.log();
        
        if (error.message && error.message.includes('403')) {
            console.log('⚠️  The Data Kiosk API requires "Brand Analytics" role');
            console.log('   This is a permissions issue, not an implementation issue.');
            console.log('   The correct API endpoints exist and work for accounts with proper roles.\n');
        }
    }
}

// Run the test
testCorrectDataKioskAPI().catch(console.error);

