const axios = require('axios');

const credentials = {
    refreshToken: process.env.AMZN_REFRESH_TOKEN,
    clientId: process.env.AMZN_CLIENT_ID,
    clientSecret: process.env.AMZN_CLIENT_SECRET
};

const config = {
    endpoint: 'https://sellingpartnerapi-eu.amazon.com',
    queryId: '102344020372', // From previous run
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

async function checkQueryStatus(accessToken) {
    const url = `${config.endpoint}/dataKiosk/2023-11-15/queries/${config.queryId}`;
    
    console.log('Checking query status...');
    console.log('Query ID:', config.queryId);
    console.log('URL:', url, '\n');
    
    try {
        const response = await axios.get(url, {
            headers: {
                'x-amz-access-token': accessToken,
                'User-Agent': 'n8n-amazon-sp-api/test',
            },
            timeout: 30000,
        });

        const query = response.data;
        console.log('✅ Query Status Retrieved!');
        console.log('Status:', query.processingStatus);
        console.log('Full Response:', JSON.stringify(query, null, 2));
        
        return query;
    } catch (error) {
        console.log('❌ Failed to get query status');
        if (axios.isAxiosError(error) && error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
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
        console.log('\nData Preview:');
        const dataStr = JSON.stringify(response.data, null, 2);
        console.log(dataStr.substring(0, 2000));
        if (dataStr.length > 2000) {
            console.log('...(truncated)');
        }
        console.log();
        
        return response.data;
        
    } catch (error) {
        console.log('❌ Download Failed!');
        console.log('Error:', error.message);
        throw error;
    }
}

async function main() {
    console.log('═'.repeat(70));
    console.log('Checking Status of DataKiosk Query');
    console.log('═'.repeat(70));
    console.log();
    
    try {
        console.log('🔑 Getting LWA Access Token...');
        const accessToken = await getLWAToken();
        console.log('✅ Access Token obtained\n');
        
        console.log('═'.repeat(70));
        console.log();
        
        const query = await checkQueryStatus(accessToken);
        
        if (query.processingStatus === 'DONE') {
            console.log('\n═'.repeat(70));
            
            const documentUrl = await getDocument(accessToken, query.dataDocumentId);
            
            console.log('═'.repeat(70));
            
            const data = await downloadDocument(documentUrl);
            
            console.log('═'.repeat(70));
            console.log('🎉🎉🎉 SUCCESS! DataKiosk is FULLY WORKING! 🎉🎉🎉');
            console.log('═'.repeat(70));
        } else {
            console.log('\n⏳ Query is still processing. Status:', query.processingStatus);
            console.log('   Wait a bit longer and run this script again.');
        }
        
    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
    }
}

main().catch(console.error);

