const https = require('https');

// Use the ID token from the recent login
const idToken = 'eyJraWQiOiJCU3lFbUt2bFprTWs0QTd5ZndnOVByRzNIT2xOdHRydHc0U1krazQ5Y1FjPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJkNGU4NTQ5OC1mMDcxLTcwMWUtZjQyZS1lM2Q5NTQ0MTc5NGMiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfZ0JzR3RSUG5NIiwiY29nbml0bzp1c2VybmFtZSI6ImQ0ZTg1NDk4LWYwNzEtNzAxZS1mNDJlLWUzZDk1NDQxNzk0YyIsImN1c3RvbTpjb21wYW55X2lkIjoiZTdiNWUxNjMtNDI1Yi00NWRhLWE3Y2MtNDlhNWYwOGE5NTY3Iiwib3JpZ2luX2p0aSI6IjY0ZTAzYWMyLTE5YmItNDk2Yi1hODg0LWQwMzA4NDA3MjQwNSIsImF1ZCI6IjN2aGgwYXJ0b2Frb2FyZG9pNGU5cmRtM205IiwiZXZlbnRfaWQiOiI2MTgwMzI2NS1jN2EyLTRhOTQtYWYyMC02ZTQ3Yjc1N2RiNjIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc2NzQ3NjU2NSwiZXhwIjoxNzY3NDgwMTY1LCJpYXQiOjE3Njc0NzY1NjUsImp0aSI6ImRhNmY4YWU5LTgzOWMtNDVlYi1iMzA2LWQ1ZjVhMTI3ZTQzMyIsImVtYWlsIjoibW9oYW1tYWRoMzIxOEBnbWFpbC5jb20ifQ.peIvQqNootmWoZX09RVBYzjuPvoT_putb-T7fTN3GpQwG2M28prDy7d4c-gT9dUKaCqnLYh5XAuWOdCr1_ZXjsIfMeGuQfRLje3kio7Rj6_7ZSCcUT4FhbUVdRq8bfh_n6lm70jXLhK3JUyz1_gTZt9BCSPdZaYOx86zI0OXE6jfGAYvEEpX-yHBomBKJEhMJcvMnzN36L_whFWxQzMB4Cp633nQH8UHbXR37J3KMzAuNaLy66OwVt9ph26iLpy2my324VwPO3KPaRC6UU7LRB1ju0K_T02fZGmtsHL4sJc7ZWhwbpKa5mYnxA1Jq-W5hF8-wYq-lLp8BMZxHhJbhg';

console.log('Testing /companies/me endpoint with ID token...\n');

const options = {
  hostname: 'api.handycall.org',
  port: 443,
  path: '/api/v1/companies/me',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  rejectUnauthorized: false  // Skip SSL verification
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse body:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
