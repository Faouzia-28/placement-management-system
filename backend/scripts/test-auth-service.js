// Test using production auth service
const authService = require('../src/services/authService');

async function test() {
  try {
    console.log('🔍 Testing with production authService...');
    
    const user = await authService.findUserByEmail('head@college.edu');
    console.log('Found user:', user);
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    const isValid = await authService.verifyPassword(user, 'password123');
    console.log('✓ Password valid:', isValid);
    
   if (isValid) {
      console.log('✅ Authentication should work!');
    } else {
      console.log('❌ Password does not match');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
