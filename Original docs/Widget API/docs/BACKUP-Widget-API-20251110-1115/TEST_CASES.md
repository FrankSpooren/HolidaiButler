# Test Cases for Conversation Improvements

This document contains detailed test cases that should be implemented to verify the conversation improvements work correctly.

## Test Category 1: Follow-up Question Handling

### Test 1.1: Basic Opening Hours Follow-up
**Setup**:
- Previous query: "Italian restaurants"
- Previous results: 5 Italian restaurants returned
- Current query: "Is the first one open?"

**Expected Behavior**:
- ✅ Detected as follow-up question
- ✅ Target POI resolved to first restaurant from previous results
- ✅ Opening hours checked for that POI
- ✅ Text response generated: "Yes, [POI Name] is currently open" OR "No, [POI Name] is currently closed. Opens [time]"
- ✅ Only the requested POI marked as `displayAsCard: true`
- ✅ Other POIs marked as `displayAsCard: false`

**Assertions**:
```typescript
expect(response.data.textResponse).toContain(poiName);
expect(response.data.textResponse).toMatch(/open|closed|opens/i);
expect(response.data.results).toHaveLength(1);
expect(response.data.results[0].displayAsCard).toBe(true);
expect(response.data.results[0].id).toBe(firstPOI.id);
```

### Test 1.2: Closed POI with Alternatives
**Setup**:
- Previous query: "Restaurants"
- Previous results: 5 restaurants returned
- Current query: "Is [POI Name] open?"
- POI is currently closed

**Expected Behavior**:
- ✅ Opening status checked
- ✅ Text response: "No, [POI Name] is currently closed. Opens [time]"
- ✅ Alternative open POIs found from previous results
- ✅ Alternatives included in response (max 3-5)
- ✅ Text response mentions alternatives: "However, these restaurants are currently open: [list]"
- ✅ Requested POI marked as `displayAsCard: true`
- ✅ Alternative POIs marked as `displayAsCard: true` with `displayReason: "alternative"`

**Assertions**:
```typescript
expect(response.data.textResponse).toContain('closed');
expect(response.data.textResponse).toContain('Opens');
expect(response.data.alternatives).toBeDefined();
expect(response.data.alternatives.length).toBeGreaterThan(0);
expect(response.data.alternatives.length).toBeLessThanOrEqual(5);
response.data.alternatives.forEach(alt => {
  expect(alt.displayAsCard).toBe(true);
  expect(alt.displayReason).toBe('alternative');
});
```

### Test 1.3: Open POI Follow-up
**Setup**:
- Previous query: "Restaurants"
- Previous results: 5 restaurants returned
- Current query: "Is the first one open?"
- POI is currently open

**Expected Behavior**:
- ✅ Text response: "Yes, [POI Name] is currently open"
- ✅ No alternatives needed
- ✅ Only requested POI in results

**Assertions**:
```typescript
expect(response.data.textResponse).toMatch(/yes|currently open/i);
expect(response.data.textResponse).toContain(poiName);
expect(response.data.alternatives).toBeUndefined();
```

### Test 1.4: Missing Opening Hours Data
**Setup**:
- Previous query: "Restaurants"
- Previous results: 5 restaurants (one has no opening hours data)
- Current query: "Is [POI without hours] open?"

**Expected Behavior**:
- ✅ Text response: "I don't have opening hours information for [POI Name]"
- ✅ No error thrown
- ✅ Graceful handling

**Assertions**:
```typescript
expect(response.data.textResponse).toContain("don't have");
expect(response.success).toBe(true);
expect(response.data.results).toHaveLength(1);
```

## Test Category 2: POI Display Logic

### Test 2.1: New Search Display
**Setup**:
- Query: "Italian restaurants"
- Results: 10 Italian restaurants found

**Expected Behavior**:
- ✅ Top 5 POIs marked as `displayAsCard: true`
- ✅ Remaining POIs marked as `displayAsCard: false`
- ✅ All POIs have `displayReason` set
- ✅ Top 5 have `displayReason: "search_result"` or similar

**Assertions**:
```typescript
const displayPOIs = response.data.results.filter(p => p.displayAsCard);
expect(displayPOIs.length).toBeLessThanOrEqual(5);
displayPOIs.forEach(poi => {
  expect(poi.displayAsCard).toBe(true);
  expect(poi.displayReason).toBeDefined();
});
```

### Test 2.2: Follow-up Single POI Display
**Setup**:
- Previous query: "Restaurants" (5 POIs displayed)
- Current query: "Tell me about the second one"

**Expected Behavior**:
- ✅ Only the second POI marked as `displayAsCard: true`
- ✅ Other POIs marked as `displayAsCard: false`
- ✅ Second POI has `displayReason: "requested"` or similar

**Assertions**:
```typescript
const displayPOIs = response.data.results.filter(p => p.displayAsCard);
expect(displayPOIs.length).toBe(1);
expect(displayPOIs[0].id).toBe(secondPOI.id);
expect(displayPOIs[0].displayReason).toContain('requested');
```

### Test 2.3: Prevent POI Repetition
**Setup**:
- Query 1: "Restaurants" (5 POIs displayed)
- Query 2: "Tell me about the first one" (first POI displayed)
- Query 3: "What about Italian restaurants?" (new search, but some POIs overlap)

**Expected Behavior**:
- ✅ Previously displayed POIs have `previouslyDisplayed: true`
- ✅ Previously displayed POIs not shown as cards again (unless explicitly requested)
- ✅ New POIs are shown as cards

**Assertions**:
```typescript
const previouslyDisplayed = response.data.results.filter(p => p.previouslyDisplayed);
previouslyDisplayed.forEach(poi => {
  // Should not be displayed as card unless explicitly requested
  if (!isExplicitlyRequested(poi)) {
    expect(poi.displayAsCard).toBe(false);
  }
});
```

### Test 2.4: Alternative POI Display
**Setup**:
- Previous query: "Restaurants"
- Current query: "Is [closed POI] open?"
- Alternatives found: 3 open restaurants

**Expected Behavior**:
- ✅ Requested POI marked as `displayAsCard: true`
- ✅ Alternative POIs marked as `displayAsCard: true`
- ✅ Alternatives have `displayReason: "alternative"`
- ✅ Max 5 total POIs displayed (requested + alternatives)

**Assertions**:
```typescript
const displayPOIs = response.data.results.filter(p => p.displayAsCard);
expect(displayPOIs.length).toBeLessThanOrEqual(5);
const alternatives = displayPOIs.filter(p => p.displayReason === 'alternative');
expect(alternatives.length).toBeGreaterThan(0);
```

## Test Category 3: Positional Reference Resolution

### Test 3.1: "First One" Resolution
**Setup**:
- Previous results: ["Restaurant A", "Restaurant B", "Restaurant C"]
- Query: "Is the first one open?"

**Expected Behavior**:
- ✅ Resolves to "Restaurant A"
- ✅ Correct POI returned in results

**Assertions**:
```typescript
expect(detection.targetPOI).toBe('Restaurant A');
expect(response.data.results[0].title).toBe('Restaurant A');
```

### Test 3.2: "Second One" Resolution
**Setup**:
- Previous results: ["Restaurant A", "Restaurant B", "Restaurant C"]
- Query: "Tell me about the second one"

**Expected Behavior**:
- ✅ Resolves to "Restaurant B"
- ✅ Correct POI returned

**Assertions**:
```typescript
expect(detection.targetPOI).toBe('Restaurant B');
expect(response.data.results[0].title).toBe('Restaurant B');
```

### Test 3.3: "Last One" Resolution
**Setup**:
- Previous results: ["Restaurant A", "Restaurant B", "Restaurant C"]
- Query: "What about the last one?"

**Expected Behavior**:
- ✅ Resolves to "Restaurant C"
- ✅ Correct POI returned

**Assertions**:
```typescript
expect(detection.targetPOI).toBe('Restaurant C');
expect(response.data.results[0].title).toBe('Restaurant C');
```

### Test 3.4: Category-based Resolution
**Setup**:
- Previous results: ["Restaurant A", "Hotel B", "Restaurant C"]
- Query: "Is that restaurant open?"

**Expected Behavior**:
- ✅ Resolves to a restaurant (preferably the most relevant one)
- ✅ Correct POI returned

**Assertions**:
```typescript
expect(detection.targetPOI).toMatch(/Restaurant/);
expect(response.data.results[0].category).toContain('restaurant');
```

## Test Category 4: Text Response Generation

### Test 4.1: Opening Hours Response - Open
**Setup**:
- Query: "Is [POI] open?"
- POI is currently open

**Expected Response Format**:
- ✅ Concise: "Yes, [POI Name] is currently open"
- ✅ Or: "[POI Name] is currently open"
- ✅ No unnecessary information

**Assertions**:
```typescript
expect(response.data.textResponse.length).toBeLessThan(200);
expect(response.data.textResponse).toMatch(/open/i);
expect(response.data.textResponse).toContain(poiName);
```

### Test 4.2: Opening Hours Response - Closed
**Setup**:
- Query: "Is [POI] open?"
- POI is currently closed
- Next opening: "Monday at 9 AM"

**Expected Response Format**:
- ✅ "No, [POI Name] is currently closed. Opens Monday at 9 AM"
- ✅ Includes next opening time

**Assertions**:
```typescript
expect(response.data.textResponse).toMatch(/closed/i);
expect(response.data.textResponse).toContain('Opens');
expect(response.data.textResponse).toContain(poiName);
```

### Test 4.3: Opening Hours Response - Closed with Alternatives
**Setup**:
- Query: "Is [POI] open?"
- POI is closed
- 3 alternatives found

**Expected Response Format**:
- ✅ "No, [POI Name] is currently closed. Opens [time]. However, these restaurants are currently open: [list]"
- ✅ Lists alternatives

**Assertions**:
```typescript
expect(response.data.textResponse).toMatch(/closed/i);
expect(response.data.textResponse).toContain('However');
expect(response.data.textResponse).toMatch(/currently open/i);
alternatives.forEach(alt => {
  expect(response.data.textResponse).toContain(alt.title);
});
```

### Test 4.4: Contact Information Response
**Setup**:
- Query: "What's the phone number of the first restaurant?"

**Expected Response Format**:
- ✅ "[POI Name]: Phone: [number]"
- ✅ Or includes website if available

**Assertions**:
```typescript
expect(response.data.textResponse).toContain('Phone');
expect(response.data.textResponse).toMatch(/\d/); // Contains digits
```

## Test Category 5: Multi-turn Conversations

### Test 5.1: Complete Conversation Flow
**Conversation**:
1. User: "Italian restaurants"
2. Bot: [Shows 5 POIs, text: "I found 5 Italian restaurants"]
3. User: "Is the first one open?"
4. Bot: [Shows 1 POI, text: "Yes, [POI] is currently open"]
5. User: "What about the second one?"
6. Bot: [Shows 1 POI, text: "No, [POI] is currently closed. Opens [time]"]

**Expected Behavior**:
- ✅ Each turn maintains context
- ✅ Positional references resolve correctly
- ✅ Display flags are set appropriately
- ✅ Text responses are contextually relevant

**Assertions**:
```typescript
// Turn 1
expect(turn1.results.filter(p => p.displayAsCard).length).toBe(5);

// Turn 2
expect(turn2.results.filter(p => p.displayAsCard).length).toBe(1);
expect(turn2.results[0].id).toBe(turn1.results[0].id);

// Turn 3
expect(turn3.results.filter(p => p.displayAsCard).length).toBe(1);
expect(turn3.results[0].id).toBe(turn1.results[1].id);
```

### Test 5.2: Conversation with Alternatives
**Conversation**:
1. User: "Restaurants"
2. Bot: [Shows 5 POIs]
3. User: "Is [POI] open?"
4. Bot: [POI is closed, suggests 3 alternatives]

**Expected Behavior**:
- ✅ Alternatives are from previous results when possible
- ✅ Alternatives are currently open
- ✅ Text response explains the situation

**Assertions**:
```typescript
expect(response.data.alternatives.length).toBeGreaterThan(0);
response.data.alternatives.forEach(alt => {
  expect(isCurrentlyOpen(alt)).toBe(true);
});
expect(response.data.textResponse).toContain('However');
```

## Test Category 6: Edge Cases

### Test 6.1: No Previous Results
**Setup**:
- No previous query
- Query: "Is the first one open?"

**Expected Behavior**:
- ✅ Graceful handling
- ✅ Text response: "I don't have any previous results to reference. Please search for restaurants first."
- ✅ No error thrown

**Assertions**:
```typescript
expect(response.success).toBe(true);
expect(response.data.textResponse).toContain("don't have");
expect(response.data.results).toHaveLength(0);
```

### Test 6.2: Invalid Positional Reference
**Setup**:
- Previous results: 2 restaurants
- Query: "Tell me about the fifth one"

**Expected Behavior**:
- ✅ Graceful handling
- ✅ Text response explains the situation
- ✅ No error thrown

**Assertions**:
```typescript
expect(response.success).toBe(true);
expect(response.data.textResponse).toContain("only");
```

### Test 6.3: All POIs Closed
**Setup**:
- Previous query: "Restaurants"
- Current query: "Is [POI] open?"
- POI is closed
- No alternatives available (all others also closed)

**Expected Behavior**:
- ✅ Text response explains POI is closed
- ✅ Mentions no alternatives available
- ✅ No error thrown

**Assertions**:
```typescript
expect(response.data.textResponse).toContain('closed');
expect(response.data.alternatives).toBeUndefined();
expect(response.success).toBe(true);
```

## Test Category 7: Performance

### Test 7.1: Response Time
**Setup**:
- Standard follow-up query

**Expected Behavior**:
- ✅ Response time < 500ms
- ✅ No significant performance degradation

**Assertions**:
```typescript
expect(responseTime).toBeLessThan(500);
```

### Test 7.2: Large Conversation History
**Setup**:
- 20 previous conversation turns
- Follow-up query

**Expected Behavior**:
- ✅ Still responds in reasonable time
- ✅ Context is used efficiently

**Assertions**:
```typescript
expect(responseTime).toBeLessThan(1000);
expect(response.success).toBe(true);
```

## Test Implementation Notes

### Test Data Setup
Each test should:
1. Set up mock POI data with opening hours
2. Set up conversation history if needed
3. Mock external services (Mistral, ChromaDB) if needed
4. Clean up after test

### Test Structure
```typescript
describe('Follow-up Question Handling', () => {
  beforeEach(() => {
    // Set up test data
  });

  it('should handle basic opening hours follow-up', async () => {
    // Test implementation
  });
});
```

### Assertion Helpers
Create helper functions for common assertions:
- `expectOpeningHoursResponse(response, expectedStatus)`
- `expectDisplayFlags(response, expectedCount)`
- `expectAlternativePOIs(response, expectedCount)`

## Running Tests

### Unit Tests
```bash
npm test -- tests/conversation/followUpTests.ts
```

### Integration Tests
```bash
npm test -- tests/conversation/integrationTests.ts
```

### All Conversation Tests
```bash
npm test -- tests/conversation/
```

