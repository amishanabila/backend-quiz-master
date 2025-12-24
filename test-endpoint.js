// Test script untuk verify backend endpoint
const https = require('https');

const BASE_URL = 'https://backend-quiz-master-production.up.railway.app';

// Test 1: Check health endpoint
console.log('🔍 Testing Health Endpoint...');
https.get(`${BASE_URL}/health`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ Health Check Response:', JSON.parse(data));
    console.log('');
  });
}).on('error', (err) => {
  console.error('❌ Health check failed:', err.message);
});

// Test 2: Get all kategori (no auth needed)
console.log('🔍 Testing Kategori Endpoint...');
https.get(`${BASE_URL}/api/kategori`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('✅ Kategori Count:', result.data?.length || 0);
    console.log('📋 Kategori List:', result.data?.map(k => k.nama_kategori).join(', '));
    console.log('');
  });
}).on('error', (err) => {
  console.error('❌ Kategori fetch failed:', err.message);
});

// Test 3: Try to get my kumpulan soal (will fail without auth - expected)
console.log('🔍 Testing My Kumpulan Soal Endpoint (should return 401)...');
https.get(`${BASE_URL}/api/soal/my-kumpulan/all`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('📋 Response:', JSON.parse(data));
    console.log('');
    console.log('ℹ️  To test with authentication:');
    console.log('   1. Login via frontend');
    console.log('   2. Copy token from localStorage');
    console.log('   3. Use curl or Postman with Bearer token');
  });
}).on('error', (err) => {
  console.error('❌ Request failed:', err.message);
});
