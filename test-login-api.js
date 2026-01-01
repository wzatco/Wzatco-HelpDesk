// Test login API endpoint to verify database connection
const http = require('http');

console.log('🧪 Testing Login API endpoint with database...\n');

const postData = JSON.stringify({
  email: 'demo@wzatco.com',
  password: 'wrongpassword' // Use wrong password to avoid actual login, just test DB connection
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    
    if (res.statusCode === 500) {
      console.log('❌ Server Error - Database connection issue!');
      console.log('Response:', data.substring(0, 200));
    } else {
      console.log('✅ API endpoint responding (no database errors)');
      console.log('Response:', data.substring(0, 100));
    }
    
    console.log('\n📋 If you see 401 or similar - that means database is working!');
    console.log('   (401 = wrong credentials, which means it could check the database)');
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();

