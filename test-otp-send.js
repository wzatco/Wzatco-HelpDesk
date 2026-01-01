// Test script for OTP sending
// Run with: node test-otp-send.js your-email@example.com

const http = require('http');

const testEmail = process.argv[2];

if (!testEmail || !testEmail.includes('@')) {
  console.log('❌ Please provide a valid email address');
  console.log('Usage: node test-otp-send.js your-email@example.com');
  process.exit(1);
}

const postData = JSON.stringify({ email: testEmail });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/widget/otp/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`\n📧 Testing OTP send to: ${testEmail}\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ OTP sent successfully!');
        console.log(`📬 Check your email inbox: ${testEmail}`);
        console.log(`✉️  Email sent: ${result.emailSent ? 'Yes' : 'No'}`);
        console.log('\n💡 Note: OTP is not displayed here for security reasons.');
        console.log('   Check your email inbox to see the 6-digit code.\n');
      } else {
        console.log('❌ Failed to send OTP');
        console.log(`Error: ${result.message}\n`);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure your development server is running on http://localhost:3000\n');
});

req.write(postData);
req.end();

