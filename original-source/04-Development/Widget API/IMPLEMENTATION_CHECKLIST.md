# Implementation Checklist

Quick reference checklist for implementing conversation improvements.

## Phase 1: Core Data Model Enhancements

- [x] **Step 1.1**: Add `displayAsCard: boolean` to `POIResult` model ✅
- [x] **Step 1.1**: Add `displayReason?: string` to `POIResult` model ✅
- [x] **Step 1.1**: Add `previouslyDisplayed?: boolean` to `POIResult` model ✅
- [x] **Step 1.1**: Write tests for display flag logic ✅ (iteration-1.1.test.js)
- [x] **Step 1.2**: Add `displayedPOIs: string[]` to `SessionContext` ✅
- [x] **Step 1.2**: Add `lastDisplayedPOIs: string[]` to `SessionContext` ✅
- [x] **Step 1.2**: Add `conversationTurn: number` to `SessionContext` ✅
- [x] **Step 1.2**: Write tests for session context tracking ✅ (iteration-1.1.test.js)
- [x] **Step 1.3**: Enhance `POIReference` to preserve metadata ✅
- [x] **Step 1.3**: Write tests for metadata preservation ✅ (iteration-1.1.test.js)

**Status**: ✅ **COMPLETED** - All tests passing (Iteration 1.1)

## Phase 2: Follow-up Question Processing

- [x] **Step 2.1**: Refactor `handleFollowUpQuestion` to preserve full metadata ✅
- [x] **Step 2.1**: Add opening hours extraction logic ✅
- [ ] **Step 2.1**: Add alternative POI finding logic (Next iteration)
- [x] **Step 2.1**: Write tests for follow-up question handling ✅ (iteration-1.2.test.js)
- [x] **Step 2.1**: Enhanced follow-up detection with multiple safety checks ✅
- [x] **Step 2.1**: Added emergency fallbacks for edge cases ✅

**Status**: 🟡 **IN PROGRESS** - Iteration 1.2 (2/3 tests passing, Test 1 needs API restart)
- [ ] **Step 2.2**: Create `openingHoursResponseService.ts`
- [ ] **Step 2.2**: Implement opening status checking
- [ ] **Step 2.2**: Implement alternative finding
- [ ] **Step 2.2**: Write tests for opening hours service

## Phase 3: Text Response Generation

- [x] **Step 3.1**: Improve opening hours response generation ✅
- [x] **Step 3.1**: Enhanced single POI responses for follow-ups ✅
- [x] **Step 3.1**: Better Yes/No answers for "is it open?" queries ✅
- [ ] **Step 3.1**: Add alternative suggestions to responses (Next iteration)
- [x] **Step 3.1**: Write tests for text response improvements ✅ (iteration-1.2.test.js)

**Status**: 🟡 **PARTIALLY COMPLETE** - Basic text responses working, alternatives pending
- [ ] **Step 3.2**: Create `conversationResponseService.ts`
- [ ] **Step 3.2**: Implement response type determination
- [ ] **Step 3.2**: Implement conversation-aware responses
- [ ] **Step 3.2**: Write tests for conversation responses

## Phase 4: POI Display Logic

- [ ] **Step 4.1**: Create `poiDisplayService.ts`
- [ ] **Step 4.1**: Implement `determineDisplayPOIs()` method
- [ ] **Step 4.1**: Implement display flag logic
- [ ] **Step 4.1**: Implement repetition prevention
- [ ] **Step 4.1**: Write tests for display service
- [ ] **Step 4.2**: Integrate display service into `searchService.ts`
- [ ] **Step 4.2**: Update session context with displayed POIs
- [ ] **Step 4.2**: Write integration tests

## Phase 5: Conversation Context

- [ ] **Step 5.1**: Enhance positional reference resolution
- [ ] **Step 5.1**: Improve edge case handling
- [ ] **Step 5.1**: Write tests for reference resolution
- [ ] **Step 5.2**: Improve conversation history usage
- [ ] **Step 5.2**: Track displayed POIs across turns
- [ ] **Step 5.2**: Write tests for context tracking

## Phase 6: Opening Hours Handling

- [ ] **Step 6.1**: Ensure opening hours preservation in follow-ups
- [ ] **Step 6.1**: Add fallback for missing data
- [ ] **Step 6.1**: Write tests for data preservation
- [ ] **Step 6.2**: Create `alternativePOIService.ts`
- [ ] **Step 6.2**: Implement alternative finding logic
- [ ] **Step 6.2**: Write tests for alternative service

## Phase 7: Integration

- [ ] **Step 7.1**: Update `SearchResponse` model
- [ ] **Step 7.1**: Add alternatives field
- [ ] **Step 7.1**: Write tests for response format
- [ ] **Step 7.2**: Integrate all services into main flow
- [ ] **Step 7.2**: Ensure proper order of operations
- [ ] **Step 7.2**: Write integration tests

## Phase 8: Testing

- [ ] **Step 8.1**: Create test suite structure
- [ ] **Step 8.2**: Create test scenarios
- [ ] **Step 8.3**: Create test runner
- [ ] **Step 8.3**: Run all tests and verify

## Phase 9: Documentation

- [ ] **Step 9.1**: Update README.md
- [ ] **Step 9.2**: Create CONVERSATION_EXAMPLES.md

## Test Scenarios to Verify

### Scenario 1: Basic Follow-up
```
User: "Italian restaurants"
Bot: [Returns list with text response]
User: "Is the first one open?"
Bot: [Should return text: "Yes, [POI] is currently open" or "No, [POI] is closed. Opens [time]"]
```

### Scenario 2: Closed POI with Alternatives
```
User: "Restaurants"
Bot: [Returns list]
User: "Is [POI] open?"
Bot: [If closed, should suggest alternatives that are open]
```

### Scenario 3: Multi-turn Conversation
```
User: "Italian restaurants"
Bot: [Shows 5 POIs as cards]
User: "What about the second one?"
Bot: [Shows only second POI as card, others not shown]
User: "Is it open?"
Bot: [Returns opening status, no new cards unless alternatives]
```

### Scenario 4: Positional References
- [ ] "first one" resolves correctly
- [ ] "second one" resolves correctly
- [ ] "last one" resolves correctly
- [ ] "that restaurant" resolves correctly

### Scenario 5: Display Logic
- [ ] New search shows max 5 POIs as cards
- [ ] Follow-up shows only relevant POIs
- [ ] Previously shown POIs are not repeated
- [ ] Alternatives are marked appropriately

## Key Files to Modify

1. `src/models/POIResult.ts` - Add display flags
2. `src/models/SessionContext.ts` - Add displayed POIs tracking
3. `src/models/POIReference.ts` - Preserve metadata
4. `src/services/searchService.ts` - Main integration point
5. `src/services/textResponseService.ts` - Improve responses
6. `src/services/queryDetectionService.ts` - Better reference resolution

## Key Files to Create

1. `src/services/openingHoursResponseService.ts` - Opening hours handling
2. `src/services/poiDisplayService.ts` - Display logic
3. `src/services/conversationResponseService.ts` - Conversation responses
4. `src/services/alternativePOIService.ts` - Alternative finding
5. `tests/conversation/` - Test suite

## Success Metrics

- [ ] All test scenarios pass
- [ ] Response time < 500ms
- [ ] Follow-up questions return proper text responses
- [ ] Closed POIs suggest alternatives
- [ ] Display flags work correctly
- [ ] No POI repetition
- [ ] Max 5 POIs per response

