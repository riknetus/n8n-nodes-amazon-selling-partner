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

async function testQueryVariation(accessToken, variationName, graphqlQuery) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing: ${variationName}`);
    console.log(`${'='.repeat(70)}`);
    console.log('Query:', graphqlQuery.substring(0, 200) + '...\n');
    
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
        console.log('Status:', response.status);
        console.log('Query ID:', response.data.queryId);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
        
    } catch (error) {
        console.log(`❌ FAILED`);
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
        return false;
    }
}

async function main() {
    console.log('═'.repeat(70));
    console.log('Testing Different DataKiosk GraphQL Query Variations');
    console.log('═'.repeat(70));
    
    try {
        console.log('\n🔑 Getting LWA Access Token...');
        const accessToken = await getLWAToken();
        console.log('✅ Access Token obtained\n');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Variation 1: Original (from documentation examples)
        const query1 = `
            query {
                salesAndTraffic(
                    startDate: "${startDateStr}"
                    endDate: "${endDateStr}"
                    marketplaceIds: ["${config.marketplaceId}"]
                    aggregateBy: DATE
                ) {
                    startDate
                    endDate
                }
            }
        `.replace(/\s+/g, ' ').trim();
        
        // Variation 2: With _v1 suffix (versioned domain field)
        const query2 = `
            query {
                salesAndTraffic_v1(
                    startDate: "${startDateStr}"
                    endDate: "${endDateStr}"
                    marketplaceIds: ["${config.marketplaceId}"]
                    aggregateBy: DATE
                ) {
                    startDate
                    endDate
                }
            }
        `.replace(/\s+/g, ' ').trim();
        
        // Variation 3: Simpler query - just requesting available queries
        const query3 = `
            query {
                __schema {
                    queryType {
                        name
                        fields {
                            name
                        }
                    }
                }
            }
        `.replace(/\s+/g, ' ').trim();
        
        // Variation 4: Different aggregateBy format
        const query4 = `
            query {
                salesAndTraffic(
                    startDate: "${startDateStr}"
                    endDate: "${endDateStr}"
                    marketplaceIds: ["${config.marketplaceId}"]
                    aggregateBy: "DATE"
                ) {
                    startDate
                    endDate
                }
            }
        `.replace(/\s+/g, ' ').trim();
        
        // Variation 5: With full nested fields from the documentation
        const query5 = `
            query {
                salesAndTraffic(
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
                        }
                    }
                }
            }
        `.replace(/\s+/g, ' ').trim();
        
        // Variation 6: Using schema introspection for available types
        const query6 = `
            query {
                __type(name: "Query") {
                    fields {
                        name
                        type {
                            name
                        }
                    }
                }
            }
        `.replace(/\s+/g, ' ').trim();
        
        const results = [];
        
        results.push(await testQueryVariation(accessToken, 'Variation 1: Original (no version)', query1));
        results.push(await testQueryVariation(accessToken, 'Variation 2: With _v1 suffix', query2));
        results.push(await testQueryVariation(accessToken, 'Variation 3: Schema introspection', query3));
        results.push(await testQueryVariation(accessToken, 'Variation 4: String aggregateBy', query4));
        results.push(await testQueryVariation(accessToken, 'Variation 5: Full nested fields', query5));
        results.push(await testQueryVariation(accessToken, 'Variation 6: Type introspection', query6));
        
        console.log('\n' + '═'.repeat(70));
        console.log('📋 SUMMARY');
        console.log('═'.repeat(70));
        const successCount = results.filter(r => r).length;
        console.log(`✅ Successful queries: ${successCount}/6`);
        console.log(`❌ Failed queries: ${6 - successCount}/6`);
        
        if (successCount > 0) {
            console.log('\n🎉 At least one query format works!');
        } else {
            console.log('\n⚠️  None of the query formats worked.');
            console.log('   This might indicate:');
            console.log('   1. Missing "Brand Analytics" role');
            console.log('   2. DataKiosk not available in this marketplace');
            console.log('   3. Different GraphQL schema than expected');
        }
        console.log('═'.repeat(70));
        
    } catch (error) {
        console.log('\n❌ TEST FAILED:', error.message);
    }
}

main().catch(console.error);

