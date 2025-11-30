/**
 * Validate All Iterations - Runs validation for all iterations in sequence
 * 
 * Usage: node scripts/validate-all-iterations.js
 */

const { validateIteration } = require('./validate-iteration');

const ITERATIONS = [
  '1.1', // Data Models
  '1.2', // Basic Follow-ups
  '2.1', // Opening Hours Service
  '2.2', // Enhanced Text Responses
  '3.1', // Display Service
  '3.2', // Context Tracking
  '4.1', // Multi-Criteria
  '4.2', // Q&A Integration
  '5.1'  // Progressive Filtering
];

async function validateAllIterations() {
  console.log('🚀 Starting validation of all iterations...\n');
  
  const results = [];
  
  for (const iteration of ITERATIONS) {
    const result = await validateIteration(iteration);
    results.push({
      iteration,
      ...result
    });
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal iterations: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Iteration ${result.iteration}: ${result.passed ? 'PASSED' : 'FAILED'}`);
  });
  
  if (failed === 0) {
    console.log('\n🎉 All iterations passed!');
  } else {
    console.log('\n⚠️  Some iterations failed. Review errors above.');
  }
  
  return results;
}

// CLI usage
if (require.main === module) {
  validateAllIterations().then(results => {
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }).catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateAllIterations
};

