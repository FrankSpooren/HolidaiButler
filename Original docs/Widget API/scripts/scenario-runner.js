/**
 * Scenario Runner - Executes conversation scenarios and validates results
 * 
 * Usage: node scripts/scenario-runner.js <scenario-name>
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const DEFAULT_SESSION_ID = 'test-session-' + Date.now();

/**
 * Execute a single conversation turn
 */
async function executeTurn(query, sessionId = DEFAULT_SESSION_ID, clientContext = null) {
  try {
    const response = await axios.post(`${API_BASE_URL}/search`, {
      query,
      sessionId,
      userId: 'test-user',
      clientContext
    });
    
    return {
      success: response.data.success,
      data: response.data.data,
      textResponse: response.data.data.textResponse,
      results: response.data.data.results,
      context: response.data.data.context
    };
  } catch (error) {
    console.error('Error executing turn:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run a complete conversation scenario
 */
async function runScenario(scenario) {
  const results = {
    scenario: scenario.name,
    passed: true,
    errors: [],
    turns: []
  };
  
  let sessionId = DEFAULT_SESSION_ID;
  let clientContext = null;
  
  console.log(`\n📋 Running scenario: ${scenario.name}`);
  console.log(`   Context: ${scenario.context || 'None'}`);
  
  for (let i = 0; i < scenario.conversation.length; i++) {
    const turn = scenario.conversation[i];
    console.log(`\n   Turn ${i + 1}: "${turn.user}"`);
    
    const response = await executeTurn(turn.user, sessionId, clientContext);
    
    // Update client context for next turn
    if (response.context && response.context.clientContext) {
      clientContext = response.context.clientContext;
    }
    
    // Store turn result
    const turnResult = {
      query: turn.user,
      response: response,
      expected: turn.expected
    };
    
    results.turns.push(turnResult);
    
    // Validate turn
    const validation = validateTurn(turnResult);
    if (!validation.passed) {
      results.passed = false;
      results.errors.push({
        turn: i + 1,
        query: turn.user,
        errors: validation.errors
      });
      console.log(`   ❌ Validation failed:`, validation.errors);
    } else {
      console.log(`   ✅ Validation passed`);
    }
    
    // Log response summary
    if (response.results) {
      const displayCards = response.results.filter(r => r.displayAsCard);
      console.log(`      Results: ${response.results.length} total, ${displayCards.length} displayed as cards`);
      if (response.textResponse) {
        console.log(`      Text: ${response.textResponse.substring(0, 100)}...`);
      }
    }
  }
  
  // Final validation
  if (results.errors.length === 0) {
    console.log(`\n✅ Scenario "${scenario.name}" PASSED`);
  } else {
    console.log(`\n❌ Scenario "${scenario.name}" FAILED`);
    console.log(`   Errors: ${results.errors.length}`);
  }
  
  return results;
}

/**
 * Validate a single turn against expected results
 */
function validateTurn(turnResult) {
  const { response, expected } = turnResult;
  const errors = [];
  
  // Check if response was successful
  if (!response.success) {
    errors.push('Response was not successful');
    return { passed: false, errors };
  }
  
  // Validate text response exists
  if (expected.textResponse && !response.textResponse) {
    errors.push('Expected text response but none provided');
  }
  
  // Validate text response content
  if (expected.textResponseContains) {
    const contains = expected.textResponseContains.every(term => 
      response.textResponse && response.textResponse.toLowerCase().includes(term.toLowerCase())
    );
    if (!contains) {
      errors.push(`Text response should contain: ${expected.textResponseContains.join(', ')}`);
    }
  }
  
  // Validate number of results
  if (expected.resultCount !== undefined) {
    if (response.results.length !== expected.resultCount) {
      errors.push(`Expected ${expected.resultCount} results, got ${response.results.length}`);
    }
  }
  
  // Validate display flags
  if (expected.displayCardCount !== undefined) {
    const displayCards = response.results.filter(r => r.displayAsCard);
    if (displayCards.length !== expected.displayCardCount) {
      errors.push(`Expected ${expected.displayCardCount} displayed cards, got ${displayCards.length}`);
    }
  }
  
  // Validate display reasons
  if (expected.displayReasons) {
    expected.displayReasons.forEach((reason, index) => {
      if (response.results[index] && response.results[index].displayReason !== reason) {
        errors.push(`Result ${index} should have displayReason "${reason}"`);
      }
    });
  }
  
  // Validate POI IDs
  if (expected.poiIds) {
    expected.poiIds.forEach((expectedId, index) => {
      if (response.results[index] && response.results[index].id !== expectedId) {
        errors.push(`Result ${index} should have ID "${expectedId}"`);
      }
    });
  }
  
  // Validate alternatives
  if (expected.hasAlternatives !== undefined) {
    const hasAlternatives = response.data && response.data.alternatives && response.data.alternatives.length > 0;
    if (hasAlternatives !== expected.hasAlternatives) {
      errors.push(`Expected alternatives: ${expected.hasAlternatives}, got: ${hasAlternatives}`);
    }
  }
  
  return {
    passed: errors.length === 0,
    errors
  };
}

/**
 * Run multiple scenarios
 */
async function runScenarios(scenarios) {
  const results = [];
  
  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
    
    // Small delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   Total scenarios: ${results.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  return results;
}

module.exports = {
  runScenario,
  runScenarios,
  executeTurn,
  validateTurn
};

// CLI usage
if (require.main === module) {
  const scenarioName = process.argv[2];
  
  if (!scenarioName) {
    console.log('Usage: node scripts/scenario-runner.js <scenario-name>');
    console.log('Or: node scripts/scenario-runner.js all');
    process.exit(1);
  }
  
  // Load scenarios
  const scenarios = require('../tests/scenarios/scenarios.json');
  
  if (scenarioName === 'all') {
    runScenarios(scenarios).then(() => {
      process.exit(0);
    });
  } else {
    const scenario = scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      console.error(`Scenario "${scenarioName}" not found`);
      process.exit(1);
    }
    
    runScenario(scenario).then(result => {
      process.exit(result.passed ? 0 : 1);
    });
  }
}

