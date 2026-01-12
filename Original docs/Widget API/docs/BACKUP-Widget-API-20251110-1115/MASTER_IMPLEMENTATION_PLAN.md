# Master Implementation Plan - Multi-Turn Conversations

This document integrates all planning documents into a single, iterative implementation plan with automated testing and validation.

## Document Structure

This plan combines:
- **CONVERSATION_IMPROVEMENT_PLAN.md** - Technical implementation details
- **IMPLEMENTATION_CHECKLIST.md** - Step-by-step checklist
- **TEST_CASES.md** - Detailed test specifications
- **CONVERSATION_SCENARIOS.md** - Real-world scenario examples

## Implementation Strategy

### Iterative Development Approach

Each iteration follows this cycle:
1. **Implement** a specific feature/step
2. **Test** against scenarios and test cases
3. **Validate** results match expected outcomes
4. **Refine** if results don't match expectations
5. **Document** changes and move to next step

### Automated Testing Framework

Each step includes:
- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **Scenario Tests**: Test complete conversation flows
- **Validation Scripts**: Automated result validation

---

## Phase-by-Phase Implementation

## Phase 1: Foundation - Data Models & Basic Follow-ups

### Iteration 1.1: Data Model Enhancements

#### Implementation Steps

**Step 1.1.1: Update POIResult Model**
- File: `src/models/POIResult.ts`
- Add fields:
  ```typescript
  displayAsCard: boolean;
  displayReason?: 'requested' | 'alternative' | 'search_result' | 'relevant';
  previouslyDisplayed?: boolean;
  ```
- **Validation**: TypeScript compiles without errors

**Step 1.1.2: Update SessionContext Model**
- File: `src/models/SessionContext.ts`
- Add fields:
  ```typescript
  displayedPOIs: string[];  // POI IDs displayed as cards
  lastDisplayedPOIs: string[];  // POIs from last response
  conversationTurn: number;
  ```
- **Validation**: TypeScript compiles without errors

**Step 1.1.3: Update POIReference Model**
- File: `src/models/POIReference.ts`
- Add metadata preservation:
  ```typescript
  metadata?: {
    openingHours?: any;
    phone?: string;
    website?: string;
    rating?: number;
    // ... other key fields
  };
  ```
- **Validation**: TypeScript compiles without errors

#### Test Scenarios (from CONVERSATION_SCENARIOS.md)

**Scenario 1.1.1: Basic Follow-up with Display Flags**
```
User: "Italian restaurants"
Bot: [Returns 5 restaurants, all marked displayAsCard: true, displayReason: "search_result"]

User: "Is the first one open?"
Bot: [Returns 1 restaurant, displayAsCard: true, displayReason: "requested"]
```

**Test Case**: `TEST_CASES.md` - Test 1.1 (Basic Opening Hours Follow-up)

**Expected Results**:
- ✅ All POIs have `displayAsCard` field
- ✅ New search: top 5 have `displayAsCard: true`
- ✅ Follow-up: only requested POI has `displayAsCard: true`
- ✅ `displayReason` is set appropriately

**Automated Validation**:
```typescript
// tests/validation/displayFlags.test.ts
describe('Display Flags', () => {
  it('should mark top 5 POIs as cards in new search', async () => {
    const response = await search('Italian restaurants');
    const displayCards = response.data.results.filter(p => p.displayAsCard);
    expect(displayCards.length).toBeLessThanOrEqual(5);
    displayCards.forEach(poi => {
      expect(poi.displayReason).toBe('search_result');
    });
  });
  
  it('should mark only requested POI in follow-up', async () => {
    // First query
    await search('Italian restaurants');
    // Follow-up
    const response = await search('Is the first one open?');
    const displayCards = response.data.results.filter(p => p.displayAsCard);
    expect(displayCards.length).toBe(1);
    expect(displayCards[0].displayReason).toBe('requested');
  });
});
```

**Run Tests**: `npm test -- tests/validation/displayFlags.test.ts`

---

### Iteration 1.2: Basic Follow-up Question Handling

#### Implementation Steps

**Step 1.2.1: Preserve Metadata in Follow-ups**
- File: `src/services/searchService.ts`
- Modify `handleFollowUpQuestion()` to preserve full metadata
- Ensure opening hours data is maintained

**Step 1.2.2: Generate Basic Text Responses**
- File: `src/services/searchService.ts`
- Add text response generation for follow-ups
- Basic responses: "Yes, [POI] is open" or "No, [POI] is closed"

#### Test Scenarios

**Scenario 1.2.1: Opening Hours Follow-up** (from CONVERSATION_SCENARIOS.md - Category 4.1)
```
User: "What restaurants are open right now?"
Bot: [Returns open restaurants with text: "I found X restaurants currently open..."]

User: "Is the first one still open?"
Bot: [Checks status, responds: "Yes, [POI] is currently open"]
```

**Test Case**: `TEST_CASES.md` - Test 1.1, Test 1.3

**Expected Results**:
- ✅ Opening hours data preserved from previous results
- ✅ Text response generated for follow-up
- ✅ Response is concise and accurate

**Automated Validation**:
```typescript
// tests/validation/followUpOpeningHours.test.ts
describe('Follow-up Opening Hours', () => {
  it('should preserve opening hours in follow-up', async () => {
    const firstResponse = await search('Restaurants');
    const firstPOI = firstResponse.data.results[0];
    expect(firstPOI.metadata.openingHours).toBeDefined();
    
    const followUp = await search('Is the first one open?');
    const followUpPOI = followUp.data.results[0];
    expect(followUpPOI.metadata.openingHours).toBeDefined();
    expect(followUpPOI.metadata.openingHours).toEqual(firstPOI.metadata.openingHours);
  });
  
  it('should generate text response for opening status', async () => {
    await search('Restaurants');
    const response = await search('Is the first one open?');
    expect(response.data.textResponse).toBeDefined();
    expect(response.data.textResponse).toMatch(/open|closed/i);
  });
});
```

**Run Tests**: `npm test -- tests/validation/followUpOpeningHours.test.ts`

---

## Phase 2: Enhanced Follow-ups & Opening Hours

### Iteration 2.1: Opening Hours Service

#### Implementation Steps

**Step 2.1.1: Create OpeningHoursResponseService**
- File: `src/services/openingHoursResponseService.ts` (new)
- Methods:
  - `checkOpeningStatus(poi, currentTime)`
  - `getNextOpeningTime(poi, currentTime)`
  - `findAlternativeOpenPOIs(closedPOI, previousResults)`

**Step 2.1.2: Integrate into Search Service**
- File: `src/services/searchService.ts`
- Use OpeningHoursResponseService in follow-up handling

#### Test Scenarios

**Scenario 2.1.1: Closed POI with Alternatives** (from CONVERSATION_SCENARIOS.md - Category 9.2)
```
User: "Restaurants with paella"
Bot: [Returns paella restaurants]

User: "Is the first one open now?"
Bot: [Checks status]
     Text: "No, [POI] is currently closed. It opens at [time]..."

User: "What else is open?"
Bot: [Finds alternative open restaurants]
     Text: "However, these restaurants are currently open: [list]..."
```

**Test Case**: `TEST_CASES.md` - Test 1.2 (Closed POI with Alternatives)

**Expected Results**:
- ✅ Closed POI identified correctly
- ✅ Next opening time provided
- ✅ Alternative open POIs found
- ✅ Alternatives marked with `displayReason: "alternative"`

**Automated Validation**:
```typescript
// tests/validation/alternatives.test.ts
describe('Alternative POIs', () => {
  it('should find alternatives when POI is closed', async () => {
    await search('Restaurants');
    const response = await search('Is the first one open?');
    
    // If closed, should have alternatives
    if (response.data.textResponse.includes('closed')) {
      expect(response.data.alternatives).toBeDefined();
      expect(response.data.alternatives.length).toBeGreaterThan(0);
      response.data.alternatives.forEach(alt => {
        expect(alt.displayAsCard).toBe(true);
        expect(alt.displayReason).toBe('alternative');
      });
    }
  });
});
```

**Run Tests**: `npm test -- tests/validation/alternatives.test.ts`

---

### Iteration 2.2: Enhanced Text Responses

#### Implementation Steps

**Step 2.2.1: Enhance TextResponseService**
- File: `src/services/textResponseService.ts`
- Add `generateFollowUpResponse()` method
- Improve opening hours responses
- Add alternative suggestions to responses

#### Test Scenarios

**Scenario 2.2.1: Complete Opening Hours Response** (from CONVERSATION_SCENARIOS.md - Category 4.1)
```
User: "Restaurants open now"
Bot: [Returns open restaurants]

User: "When does the first one close?"
Bot: [Checks closing time]
     Text: "[POI] closes at [time] today..."
```

**Test Case**: `TEST_CASES.md` - Test 4.1, Test 4.2

**Expected Results**:
- ✅ Text responses are concise (< 200 chars for simple queries)
- ✅ Include relevant information
- ✅ Natural language

**Automated Validation**:
```typescript
// tests/validation/textResponses.test.ts
describe('Text Responses', () => {
  it('should generate concise responses', async () => {
    await search('Restaurants');
    const response = await search('Is the first one open?');
    expect(response.data.textResponse.length).toBeLessThan(200);
  });
  
  it('should include POI name in response', async () => {
    await search('Restaurants');
    const response = await search('Is the first one open?');
    const poiName = response.data.results[0].title;
    expect(response.data.textResponse).toContain(poiName);
  });
});
```

**Run Tests**: `npm test -- tests/validation/textResponses.test.ts`

---

## Phase 3: Display Logic & Context Tracking

### Iteration 3.1: POI Display Service

#### Implementation Steps

**Step 3.1.1: Create POIDisplayService**
- File: `src/services/poiDisplayService.ts` (new)
- Method: `determineDisplayPOIs(allPOIs, conversationContext, queryIntent)`
- Logic:
  - Filter to max 5 POIs
  - Check if previously displayed
  - Mark relevant POIs
  - Set display reasons

**Step 3.1.2: Integrate Display Service**
- File: `src/services/searchService.ts`
- Call POIDisplayService after processing results
- Update session context with displayed POIs

#### Test Scenarios

**Scenario 3.1.1: Prevent POI Repetition** (from CONVERSATION_SCENARIOS.md - Category 9.1)
```
User: "Restaurants"
Bot: [Shows 5 POIs as cards]

User: "Tell me about the first one"
Bot: [Shows only first POI as card, others not shown]

User: "What about Italian restaurants?"
Bot: [New search, but if some POIs overlap, don't show them again unless explicitly requested]
```

**Test Case**: `TEST_CASES.md` - Test 2.3 (Prevent POI Repetition)

**Expected Results**:
- ✅ Max 5 POIs displayed per response
- ✅ Previously displayed POIs not repeated
- ✅ `previouslyDisplayed` flag set correctly

**Automated Validation**:
```typescript
// tests/validation/displayLogic.test.ts
describe('Display Logic', () => {
  it('should limit to max 5 displayed POIs', async () => {
    const response = await search('Restaurants');
    const displayCards = response.data.results.filter(p => p.displayAsCard);
    expect(displayCards.length).toBeLessThanOrEqual(5);
  });
  
  it('should prevent POI repetition', async () => {
    const firstResponse = await search('Restaurants');
    const firstDisplayed = firstResponse.data.results
      .filter(p => p.displayAsCard)
      .map(p => p.id);
    
    await search('Tell me about the first one');
    const secondResponse = await search('Italian restaurants');
    
    // Check if previously displayed POIs are marked
    firstDisplayed.forEach(id => {
      const poi = secondResponse.data.results.find(p => p.id === id);
      if (poi && !poi.displayAsCard) {
        expect(poi.previouslyDisplayed).toBe(true);
      }
    });
  });
});
```

**Run Tests**: `npm test -- tests/validation/displayLogic.test.ts`

---

### Iteration 3.2: Context Tracking

#### Implementation Steps

**Step 3.2.1: Track Displayed POIs in Session**
- File: `src/services/sessionService.ts`
- Update session with displayed POI IDs after each response

**Step 3.2.2: Use Context in Display Decisions**
- File: `src/services/poiDisplayService.ts`
- Check session context when determining display flags

#### Test Scenarios

**Scenario 3.2.1: Multi-turn Context** (from CONVERSATION_SCENARIOS.md - Category 9.1)
```
User: "Restaurants"
Bot: [Shows 5 POIs, stores in context]

User: "Is the first one open?"
Bot: [Uses context to find first POI, shows only that one]

User: "What about the second one?"
Bot: [Uses context to find second POI from original list]
```

**Test Case**: `TEST_CASES.md` - Test 5.1 (Complete Conversation Flow)

**Expected Results**:
- ✅ Context maintained across turns
- ✅ Positional references work correctly
- ✅ Display flags respect context

**Automated Validation**:
```typescript
// tests/validation/contextTracking.test.ts
describe('Context Tracking', () => {
  it('should maintain context across turns', async () => {
    const turn1 = await search('Restaurants');
    const turn1POIs = turn1.data.results.map(p => p.id);
    
    const turn2 = await search('Is the first one open?');
    expect(turn2.data.results[0].id).toBe(turn1POIs[0]);
    
    const turn3 = await search('What about the second one?');
    expect(turn3.data.results[0].id).toBe(turn1POIs[1]);
  });
});
```

**Run Tests**: `npm test -- tests/validation/contextTracking.test.ts`

---

## Phase 4: Advanced Scenarios

### Iteration 4.1: Multi-Criteria Filtering

#### Implementation Steps

**Step 4.1.1: Enhance Query Detection for Amenities**
- File: `src/services/queryDetectionService.ts`
- Detect amenity-based queries (e.g., "vegan", "wheelchair accessible")

**Step 4.1.2: Filter by Multiple Amenities**
- File: `src/services/searchService.ts`
- Support filtering by multiple amenities simultaneously

#### Test Scenarios

**Scenario 4.1.1: Dietary + Accessibility** (from CONVERSATION_SCENARIOS.md - Category 3.2)
```
User: "Vegetarian restaurant that's wheelchair accessible"
Bot: [Filters by both criteria]
     Text: "I found X vegetarian restaurants that are wheelchair accessible..."
```

**Test Case**: Custom test for multi-criteria filtering

**Expected Results**:
- ✅ Both criteria applied
- ✅ Only matching POIs returned
- ✅ Text response mentions both criteria

**Automated Validation**:
```typescript
// tests/validation/multiCriteria.test.ts
describe('Multi-Criteria Filtering', () => {
  it('should filter by multiple amenities', async () => {
    const response = await search('Vegetarian restaurant that is wheelchair accessible');
    response.data.results.forEach(poi => {
      expect(poi.metadata.amenities).toContain('vegetarian_options');
      // Check wheelchair accessibility
      expect(poi.metadata.amenities).toContain('wheelchair_accessible_entrance');
    });
  });
});
```

**Run Tests**: `npm test -- tests/validation/multiCriteria.test.ts`

---

### Iteration 4.2: Q&A-Based Discovery

#### Implementation Steps

**Step 4.2.1: Enhance Search to Use Q&A Data**
- File: `src/services/searchService.ts`
- Include Q&A content in search embeddings

**Step 4.2.2: Extract Q&A Information in Responses**
- File: `src/services/textResponseService.ts`
- Use Q&A data to answer specific questions

#### Test Scenarios

**Scenario 4.2.1: Q&A-Driven Search** (from CONVERSATION_SCENARIOS.md - Category 7.1)
```
User: "Where can I get authentic paella?"
Bot: [Searches Q&A for "paella"]
     Text: "I found restaurants known for authentic paella..."

User: "Do they make it fresh?"
Bot: [Searches Q&A for freshness information]
     Text: "According to reviews, [Restaurant] prepares paella fresh daily..."
```

**Test Case**: Custom test for Q&A integration

**Expected Results**:
- ✅ Q&A content used in search
- ✅ Q&A information included in responses
- ✅ Natural language answers

**Automated Validation**:
```typescript
// tests/validation/qaIntegration.test.ts
describe('Q&A Integration', () => {
  it('should use Q&A in search', async () => {
    const response = await search('Where can I get authentic paella?');
    // Should find restaurants with paella in Q&A
    expect(response.data.results.length).toBeGreaterThan(0);
  });
  
  it('should include Q&A in responses', async () => {
    await search('Restaurants with paella');
    const response = await search('Do they make it fresh?');
    // Response should reference Q&A information
    expect(response.data.textResponse).toMatch(/fresh|daily|prepare/i);
  });
});
```

**Run Tests**: `npm test -- tests/validation/qaIntegration.test.ts`

---

## Phase 5: Complex Multi-Turn Conversations

### Iteration 5.1: Progressive Filtering

#### Implementation Steps

**Step 5.1.1: Maintain Filter State**
- File: `src/services/searchService.ts`
- Track applied filters across conversation turns

**Step 5.1.2: Apply Progressive Filters**
- File: `src/services/searchService.ts`
- Apply new filters to previous results

#### Test Scenarios

**Scenario 5.1.1: Complete Dining Decision** (from CONVERSATION_SCENARIOS.md - Category 9.1)
```
User: "I want to have dinner tonight"
Bot: [Returns restaurants open for dinner]

User: "Something romantic"
Bot: [Filters to romantic restaurants]

User: "With sea views"
Bot: [Further filters by sea view mentions]

User: "Do they need reservations?"
Bot: [Checks reservation requirements]
```

**Test Case**: `TEST_CASES.md` - Test 5.1

**Expected Results**:
- ✅ Filters applied progressively
- ✅ Results narrowed appropriately
- ✅ Context maintained

**Automated Validation**:
```typescript
// tests/validation/progressiveFiltering.test.ts
describe('Progressive Filtering', () => {
  it('should apply filters progressively', async () => {
    const turn1 = await search('I want to have dinner tonight');
    expect(turn1.data.results.length).toBeGreaterThan(0);
    
    const turn2 = await search('Something romantic');
    expect(turn2.data.results.length).toBeLessThanOrEqual(turn1.data.results.length);
    turn2.data.results.forEach(poi => {
      expect(poi.metadata.amenities).toContain('romantic');
    });
    
    const turn3 = await search('With sea views');
    expect(turn3.data.results.length).toBeLessThanOrEqual(turn2.data.results.length);
  });
});
```

**Run Tests**: `npm test -- tests/validation/progressiveFiltering.test.ts`

---

## Automated Testing Workflow

### Test Execution Script

Create `scripts/run-iteration-tests.sh` (or `.bat` for Windows):

```bash
#!/bin/bash
# Run all tests for current iteration

echo "Running iteration tests..."

# Phase 1 tests
npm test -- tests/validation/displayFlags.test.ts
npm test -- tests/validation/followUpOpeningHours.test.ts

# Phase 2 tests
npm test -- tests/validation/alternatives.test.ts
npm test -- tests/validation/textResponses.test.ts

# Phase 3 tests
npm test -- tests/validation/displayLogic.test.ts
npm test -- tests/validation/contextTracking.test.ts

# Phase 4 tests
npm test -- tests/validation/multiCriteria.test.ts
npm test -- tests/validation/qaIntegration.test.ts

# Phase 5 tests
npm test -- tests/validation/progressiveFiltering.test.ts

echo "All tests completed!"
```

### Continuous Validation

Create `scripts/validate-iteration.js`:

```javascript
// Validate current iteration against scenarios
const scenarios = require('./scenarios.json');
const { runScenario } = require('./scenario-runner');

async function validateIteration(iterationNumber) {
  console.log(`Validating iteration ${iterationNumber}...`);
  
  const iterationScenarios = scenarios.filter(s => 
    s.iteration === iterationNumber
  );
  
  for (const scenario of iterationScenarios) {
    console.log(`Testing scenario: ${scenario.name}`);
    const result = await runScenario(scenario);
    
    if (result.passed) {
      console.log(`✅ ${scenario.name} passed`);
    } else {
      console.log(`❌ ${scenario.name} failed:`, result.errors);
      return false;
    }
  }
  
  return true;
}

module.exports = { validateIteration };
```

---

## Implementation Checklist by Iteration

### Iteration 1.1: Data Models
- [ ] Update POIResult model
- [ ] Update SessionContext model
- [ ] Update POIReference model
- [ ] Write unit tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 1.2: Basic Follow-ups
- [ ] Preserve metadata in follow-ups
- [ ] Generate basic text responses
- [ ] Write integration tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 2.1: Opening Hours Service
- [ ] Create OpeningHoursResponseService
- [ ] Integrate into search service
- [ ] Write service tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 2.2: Enhanced Text Responses
- [ ] Enhance TextResponseService
- [ ] Add alternative suggestions
- [ ] Write response tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 3.1: Display Service
- [ ] Create POIDisplayService
- [ ] Integrate display logic
- [ ] Write display tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 3.2: Context Tracking
- [ ] Track displayed POIs
- [ ] Use context in decisions
- [ ] Write context tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 4.1: Multi-Criteria
- [ ] Enhance query detection
- [ ] Support multiple filters
- [ ] Write filtering tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 4.2: Q&A Integration
- [ ] Include Q&A in search
- [ ] Extract Q&A in responses
- [ ] Write Q&A tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

### Iteration 5.1: Progressive Filtering
- [ ] Maintain filter state
- [ ] Apply progressive filters
- [ ] Write progressive tests
- [ ] Run validation tests
- [ ] ✅ All tests pass

---

## Scenario-to-Test Mapping

### Quick Reference

| Scenario (from CONVERSATION_SCENARIOS.md) | Test Case (from TEST_CASES.md) | Iteration | Priority |
|-------------------------------------------|--------------------------------|-----------|----------|
| 1.1: Dietary Requirements | Test 1.1 | 4.1 | High |
| 1.2: Family-Friendly | Test 1.1 | 4.1 | High |
| 4.1: Currently Open | Test 1.1, 1.3 | 1.2, 2.1 | Critical |
| 4.2: Opening Soon | Test 1.1 | 2.1 | High |
| 9.1: Complete Journey | Test 5.1 | 5.1 | Critical |
| 9.2: Alternatives | Test 1.2 | 2.1 | Critical |
| 3.1: Wheelchair Access | Custom | 4.1 | High |
| 7.1: Q&A Discovery | Custom | 4.2 | Medium |

---

## Success Criteria per Iteration

### Iteration 1.1 ✅
- [ ] All models compile without errors
- [ ] Display flags present on all POIs
- [ ] Session context tracks displayed POIs

### Iteration 1.2 ✅
- [ ] Follow-up questions return text responses
- [ ] Opening hours data preserved
- [ ] Basic responses are accurate

### Iteration 2.1 ✅
- [ ] Closed POIs suggest alternatives
- [ ] Opening status checked correctly
- [ ] Alternatives marked appropriately

### Iteration 2.2 ✅
- [ ] Text responses are concise
- [ ] Responses include relevant information
- [ ] Natural language used

### Iteration 3.1 ✅
- [ ] Max 5 POIs displayed
- [ ] Previously displayed POIs not repeated
- [ ] Display reasons set correctly

### Iteration 3.2 ✅
- [ ] Context maintained across turns
- [ ] Positional references work
- [ ] Display flags respect context

### Iteration 4.1 ✅
- [ ] Multiple criteria filtered
- [ ] Results match all criteria
- [ ] Text mentions criteria

### Iteration 4.2 ✅
- [ ] Q&A used in search
- [ ] Q&A in responses
- [ ] Natural answers

### Iteration 5.1 ✅
- [ ] Filters applied progressively
- [ ] Results narrowed correctly
- [ ] Context maintained

---

## Running the Implementation

### Step 1: Set Up Testing Environment

```bash
# Install dependencies
npm install

# Set up test database
npm run setup-test-db

# Verify test data loaded
npm run verify-test-data
```

### Step 2: Start with Iteration 1.1

```bash
# Implement data models
# (Edit files as specified)

# Run tests
npm test -- tests/validation/displayFlags.test.ts

# Validate
npm run validate-iteration 1.1
```

### Step 3: Iterate

For each iteration:
1. Implement code changes
2. Run unit tests: `npm test -- tests/validation/[test-file].test.ts`
3. Run scenario tests: `npm run test-scenarios [iteration-number]`
4. Validate results: `npm run validate-iteration [iteration-number]`
5. If tests fail, fix and repeat
6. If tests pass, move to next iteration

### Step 4: Full Integration Test

After all iterations:
```bash
# Run all tests
npm test

# Run all scenarios
npm run test-all-scenarios

# Generate test report
npm run generate-test-report
```

---

## Troubleshooting

### Tests Failing?

1. **Check test data**: Ensure test POIs have required data
2. **Check logs**: Review error messages
3. **Debug step-by-step**: Add console.logs to trace execution
4. **Compare with expected**: Review expected results in test cases

### Scenarios Not Working?

1. **Verify data**: Check if POIs have required amenities/data
2. **Check context**: Ensure conversation context is maintained
3. **Review implementation**: Compare with improvement plan
4. **Test individually**: Run scenario in isolation

### Performance Issues?

1. **Profile code**: Use performance profiler
2. **Check database**: Verify queries are optimized
3. **Review caching**: Add caching where appropriate
4. **Limit results**: Ensure max results limits are enforced

---

## Next Steps

1. **Review this plan** with the team
2. **Set up test infrastructure** (test database, test data)
3. **Start with Iteration 1.1**
4. **Follow iterative process** for each phase
5. **Document learnings** as you go
6. **Adjust plan** based on findings

---

## Appendix: Test Data Requirements

### Required Test POIs

For comprehensive testing, ensure test data includes:

1. **Restaurants with various amenities**:
   - Vegan/vegetarian options
   - Wheelchair accessible
   - Family-friendly
   - Pet-friendly
   - Outdoor seating
   - etc.

2. **Various opening statuses**:
   - Currently open
   - Currently closed
   - Opening soon
   - Closing soon

3. **Various ratings**:
   - High-rated (4.5+)
   - Medium-rated (3.5-4.5)
   - Lower-rated (<3.5)

4. **Q&A data**:
   - POIs with Q&A about specific topics
   - Various question types

5. **Location variety**:
   - Near beach
   - In city center
   - Various distances

This ensures all scenarios can be tested with real data.

