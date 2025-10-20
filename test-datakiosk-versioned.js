const axios = require('axios');

// Load credentials from environment
const credentials = {
    refreshToken: process.env.AMZN_REFRESH_TOKEN,
    clientId: process.env.AMZN_CLIENT_ID,
    clientSecret: process.env.AMZN_CLIENT_SECRET
};

const config = {
    endpoint: 'https://sellingpartnerapi-eu.amazon.com', // Production
    marketplaceId: 'A21TJRUUN4KGV', // India
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

async function createDataKioskQuery(accessToken) {
    console.log('📊 Creating Data Kiosk Query with CORRECT versioned field...\n');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Use the VERSIONED domain field: analytics_salesAndTraffic_2024_04_24
    const graphqlQuery = `
        query {
            analytics_salesAndTraffic_2024_04_24(
                startDate: "${startDateStr}"
                endDate: "${endDateStr}"
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
                    }
                }
            }
        }
    `.replace(/\s+/g, ' ').trim();
    
    console.log('GraphQL Query Field:', 'analytics_salesAndTraffic_2024_04_24');
    console.log('Query:', graphqlQuery.substring(0, 200) + '...\n');
    
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
        console.log('❌ Query Creation Failed!');
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
        throw error;
    }
}

async function pollQueryStatus(accessToken, queryId) {
    console.log('⏳ Polling Query Status...\n');
    
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
    console.log('\n📄 Getting Document URL...\n');
    
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
    console.log('⬇️  Downloading Document Data...\n');
    
    try {
        const response = await axios.get(documentUrl, {
            timeout: 30000,
        });

        console.log('✅ Document Downloaded!');
        console.log('Content Type:', response.headers['content-type']);
        console.log('\nData Preview (first 500 chars):');
        console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + '...\n');
        
        return response.data;
        
    } catch (error) {
        console.log('❌ Download Failed!');
        console.log('Error:', error.message);
        throw error;
    }
}

async function main() {
    console.log('═'.repeat(70));
    console.log('Testing DataKiosk with VERSIONED Field Name');
    console.log('Schema: analytics_salesAndTraffic_2024_04_24');
    console.log('═'.repeat(70));
    console.log();
    
    try {
        // Step 1: Get access token
        console.log('🔑 Getting LWA Access Token...');
        const accessToken = await getLWAToken();
        console.log('✅ Access Token obtained\n');
        
        console.log('═'.repeat(70));
        console.log();
        
        // Step 2: Create query with versioned field
        const queryId = await createDataKioskQuery(accessToken);
        
        console.log('═'.repeat(70));
        console.log();
        
        // Step 3: Poll for completion
        const documentId = await pollQueryStatus(accessToken, queryId);
        
        console.log('═'.repeat(70));
        
        // Step 4: Get document URL
        const documentUrl = await getDocument(accessToken, documentId);
        
        console.log('═'.repeat(70));
        
        // Step 5: Download data
        const data = await downloadDocument(documentUrl);
        
        console.log('═'.repeat(70));
        console.log('🎉 ALL TESTS PASSED!');
        console.log('═'.repeat(70));
        console.log('\n✅ DataKiosk API is WORKING with your credentials!');
        console.log('✅ Correct field name: analytics_salesAndTraffic_2024_04_24');
        console.log('\nReference: https://sellercentral.amazon.com/datakiosk-schema-explorer?schema=analytics_salesAndTraffic_2024_04_24\n');
        
    } catch (error) {
        console.log('\n═'.repeat(70));
        console.log('❌ TEST FAILED');
        console.log('═'.repeat(70));
        console.log('\nError:', error.message);
        console.log();
    }
}

main().catch(console.error);

