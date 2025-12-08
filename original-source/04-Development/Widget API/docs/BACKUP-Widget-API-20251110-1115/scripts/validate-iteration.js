/**
 * Iteration Validator - Validates a specific iteration against test scenarios
 * 
 * Usage: node scripts/validate-iteration.js <iteration-number>
 */

const { runScenarios } = require('./scenario-runner');
const scenarios = require('../tests/scenarios/scenarios.json');

/**
 * Get scenarios for a specific iteration
 */
function getScenariosForIteration(iterationNumber) {
  return scenarios.filter(s => s.iteration === iterationNumber);
}

/**
 * Validate an iteration
 */
async function validateIteration(iterationNumber) {
  console.log(`\n🔍 Validating Iteration ${iterationNumber}...\n`);
  
  const iterationScenarios = getScenariosForIteration(iterationNumber);
  
  if (iterationScenarios.length === 0) {
    console.log(`⚠️  No scenarios found for iteration ${iterationNumber}`);
    return { passed: false, error: 'No scenarios found' };
  }
  
  console.log(`Found ${iterationScenarios.length} scenario(s) for this iteration:\n`);
  iterationScenarios.forEach(s => {
    console.log(`  - ${s.name}`);
  });
  
  const results = await runScenarios(iterationScenarios);
  
  const allPassed = results.every(r => r.passed);
  
  if (allPassed) {
    console.log(`\n✅ Iteration ${iterationNumber} validation PASSED`);
  } else {
    console.log(`\n❌ Iteration ${iterationNumber} validation FAILED`);
    console.log(`\nFailed scenarios:`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.scenario}`);
      r.errors.forEach(e => {
        console.log(`    Turn ${e.turn}: ${e.errors.join(', ')}`);
      });
    });
  }
  
  return {
    passed: allPassed,
    results
  };
}

// CLI usage
if (require.main === module) {
  const iterationNumber = process.argv[2];
  
  if (!iterationNumber) {
    console.log('Usage: node scripts/validate-iteration.js <iteration-number>');
    console.log('Example: node scripts/validate-iteration.js 1.1');
    process.exit(1);
  }
  
  validateIteration(iterationNumber).then(result => {
    process.exit(result.passed ? 0 : 1);
  }).catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateIteration,
  getScenariosForIteration
};

