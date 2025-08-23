/**
 * Generate Test API Key for Paid Tier Authentication Testing
 * This creates a properly formatted API key like our system would generate
 */

const { createHash, randomBytes } = require('crypto');

console.log('🔐 GENERATING TEST API KEY');
console.log('==========================');

// Generate API key exactly like our system does (from api-keys/route.ts)
function generateApiKey() {
  const key = `sk_${randomBytes(32).toString('hex')}`;
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, hash };
}

// Generate a test API key
const { key, hash } = generateApiKey();

console.log('✅ Generated Test API Key:');
console.log(`   Raw Key: ${key}`);
console.log(`   SHA256 Hash: ${hash}`);
console.log(`   Key Length: ${key.length} characters`);
console.log(`   Format: ${key.startsWith('sk_') ? 'Correct (sk_...)' : 'Incorrect'}`);
console.log('');

console.log('🧪 Testing Authentication Logic:');

// Test our authentication logic directly
function testAuthentication(testKey) {
    const testHash = createHash('sha256').update(testKey).digest('hex');
    console.log(`   Input Key: ${testKey.substring(0, 20)}...`);
    console.log(`   Computed Hash: ${testHash}`);
    console.log(`   Hash Matches: ${testHash === hash ? 'YES ✅' : 'NO ❌'}`);
    return testHash === hash;
}

console.log('');
console.log('Testing with correct key:');
testAuthentication(key);

console.log('');
console.log('Testing with wrong key:');  
testAuthentication('sk_wrong_key_test_12345');

console.log('');
console.log('💡 How to use this key:');
console.log('1. Add this key to the database api_keys table');
console.log('2. Set SIGN_API_KEY environment variable to the raw key');
console.log('3. Test with TikTok Live Connector');
console.log('');

console.log('📋 SQL to insert into database:');
console.log(`INSERT INTO api_keys (user_id, key_hash, name, is_active) VALUES`);
console.log(`('4f2d532d-6c6c-441e-8b09-64fc0dfbc01e', '${hash}', 'Generated Test Key', true);`);