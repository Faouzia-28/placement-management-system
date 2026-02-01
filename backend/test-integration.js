#!/usr/bin/env node

/**
 * Integration test script to verify queue, worker, and scheduler setup
 * Usage: node test-integration.js
 */

const { jobQueue, connection } = require('./queue');

async function runTests() {
  console.log('🧪 Starting integration tests...\n');

  try {
    // Test 1: Redis connection
    console.log('Test 1: Checking Redis connection...');
    const pong = await connection.ping();
    if (pong === 'PONG') {
      console.log('✅ Redis connection successful\n');
    } else {
      throw new Error('Redis connection failed');
    }

    // Test 2: Queue connectivity
    console.log('Test 2: Testing job queue...');
    const testJob = await jobQueue.add('test', { message: 'Test job' }, { attempts: 1 });
    console.log(`✅ Job enqueued with ID: ${testJob.id}\n`);

    // Test 3: Check job counts
    console.log('Test 3: Checking job queue status...');
    const counts = await jobQueue.getJobCounts();
    console.log(`✅ Queue status:`, counts, '\n');

    // Test 4: Clean up test job
    console.log('Test 4: Cleaning up test job...');
    await testJob.remove();
    console.log('✅ Test job removed\n');

    // Test 5: Check queue is empty
    const finalCounts = await jobQueue.getJobCounts();
    console.log('✅ Final queue status:', finalCounts, '\n');

    console.log('🎉 All integration tests passed!\n');
    console.log('Next steps:');
    console.log('1. Start the main server: npm start');
    console.log('2. Start the worker: npm run start:worker');
    console.log('3. Start the scheduler (optional): npm run start:scheduler');
    console.log('4. Test API endpoints by creating a drive and verifying background job processing\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('- Ensure Redis is running: redis-cli ping');
    console.error('- Check REDIS_URL in .env file');
    console.error('- Verify Redis is accessible on the configured port\n');
    process.exit(1);
  }
}

// Run tests
runTests();
