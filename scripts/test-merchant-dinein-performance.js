const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_COUNT = 5;

// Test data
const testPaymentData = {
  phone: '9999999999',
  outletId: '64e1c2f1a2b3c4d5e6f7a8b9', // Replace with actual outlet ID
  billAmount: 1000,
  maxDiscountPercentage: 10,
  paymentMethod: 'cash'
};

// Auth token (you'll need to get this from a valid login)
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testMerchantDineInPerformance() {
  console.log('🚀 Starting merchant dine-in performance test...\n');
  
  const results = [];
  
  for (let i = 0; i < TEST_COUNT; i++) {
    console.log(`Test ${i + 1}/${TEST_COUNT}...`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/payments/merchant-dinein`,
        testPaymentData,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        testNumber: i + 1,
        duration,
        status: response.status,
        success: response.data.success,
        message: response.data.message
      });
      
      console.log(`✅ Test ${i + 1} completed in ${duration}ms`);
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        testNumber: i + 1,
        duration,
        status: error.response?.status || 'ERROR',
        success: false,
        message: error.response?.data?.message || error.message
      });
      
      console.log(`❌ Test ${i + 1} failed in ${duration}ms: ${error.response?.data?.message || error.message}`);
    }
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Calculate statistics
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  if (successfulTests.length > 0) {
    const durations = successfulTests.map(r => r.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log('\n📊 Performance Results:');
    console.log('========================');
    console.log(`Total Tests: ${TEST_COUNT}`);
    console.log(`Successful: ${successfulTests.length}`);
    console.log(`Failed: ${failedTests.length}`);
    console.log(`Success Rate: ${((successfulTests.length / TEST_COUNT) * 100).toFixed(1)}%`);
    console.log(`Average Response Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`Min Response Time: ${minDuration}ms`);
    console.log(`Max Response Time: ${maxDuration}ms`);
    
    if (avgDuration < 2000) {
      console.log('\n🎉 Performance is excellent! (< 2s average)');
    } else if (avgDuration < 5000) {
      console.log('\n✅ Performance is good! (< 5s average)');
    } else if (avgDuration < 10000) {
      console.log('\n⚠️  Performance needs improvement (> 5s average)');
    } else {
      console.log('\n🚨 Performance is poor! (> 10s average)');
    }
  }
  
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`Test ${test.testNumber}: ${test.message}`);
    });
  }
  
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${result.testNumber}: ${result.duration}ms - ${result.message}`);
  });
}

// Run the test
if (require.main === module) {
  testMerchantDineInPerformance().catch(console.error);
}

module.exports = { testMerchantDineInPerformance };
