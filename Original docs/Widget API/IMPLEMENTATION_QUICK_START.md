# Quick Start Guide - Iterative Implementation

This guide helps you implement the conversation improvements step-by-step with automated testing.

## Prerequisites

1. **Node.js 18+** installed
2. **API running** on `http://localhost:3000` (or set `API_URL` env var)
3. **Test data loaded** in ChromaDB
4. **Dependencies installed**: `npm install`

## Quick Start

### 1. Start the API

```bash
# Development mode
npm run dev

# Or production mode
npm run build
npm start
```

### 2. Run Your First Iteration

```bash
# Validate iteration 1.1 (Data Models)
npm run validate:iteration 1.1
```

### 3. Implement Code Changes

Follow the steps in `MASTER_IMPLEMENTATION_PLAN.md` for the current iteration.

### 4. Test Your Changes

```bash
# Run specific scenario
npm run test:scenario "Basic Follow-up with Display Flags"

# Or run all scenarios for current iteration
npm run validate:iteration 1.1
```

### 5. Iterate

If tests fail:
1. Review error messages
2. Fix code
3. Re-run tests
4. Repeat until all pass

If tests pass:
1. Move to next iteration
2. Repeat from step 2

## Iteration Workflow

```
┌─────────────────┐
│ Start Iteration │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Implement Code  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run Tests       │
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
    ▼        ▼
  Pass?    Fail?
    │        │
    │        └──► Fix Code ──┐
    │                         │
    ▼                         │
Next Iteration ◄─────────────┘
```

## Available Commands

### Testing Commands

```bash
# Run all scenarios
npm run test:scenarios

# Run specific scenario
npm run test:scenario "Scenario Name"

# Validate specific iteration
npm run validate:iteration 1.1

# Validate all iterations
npm run validate:all
```

### Development Commands

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Iteration Checklist

For each iteration:

- [ ] Read iteration details in `MASTER_IMPLEMENTATION_PLAN.md`
- [ ] Review related scenarios in `CONVERSATION_SCENARIOS.md`
- [ ] Check test cases in `TEST_CASES.md`
- [ ] Implement code changes
- [ ] Run validation: `npm run validate:iteration X.X`
- [ ] Fix any failures
- [ ] ✅ All tests pass
- [ ] Move to next iteration

## Example: Iteration 1.1

### Step 1: Read the Plan

Open `MASTER_IMPLEMENTATION_PLAN.md` and find "Iteration 1.1: Data Model Enhancements"

### Step 2: Implement

Edit `src/models/POIResult.ts`:
```typescript
export interface POIResult {
  // ... existing fields ...
  displayAsCard: boolean;
  displayReason?: 'requested' | 'alternative' | 'search_result' | 'relevant';
  previouslyDisplayed?: boolean;
}
```

### Step 3: Test

```bash
npm run validate:iteration 1.1
```

### Step 4: Fix if Needed

If tests fail, review errors and fix code.

### Step 5: Continue

Once tests pass, move to iteration 1.2.

## Troubleshooting

### API Not Running

```bash
# Start API first
npm run dev
```

### Tests Can't Connect

Check `API_URL` environment variable:
```bash
export API_URL=http://localhost:3000/api
# Or on Windows:
set API_URL=http://localhost:3000/api
```

### Scenario Not Found

Check scenario name in `tests/scenarios/scenarios.json`:
```bash
# List all scenarios
cat tests/scenarios/scenarios.json | grep "name"
```

### Test Data Missing

Ensure test POIs are loaded in ChromaDB. Check:
- POIs have required amenities
- Opening hours data present
- Q&A data available

## Progress Tracking

Track your progress in `IMPLEMENTATION_CHECKLIST.md`:

```markdown
## Phase 1: Core Data Model Enhancements

- [x] **Step 1.1**: Add `displayAsCard: boolean` to `POIResult` model
- [x] **Step 1.1**: Add `displayReason?: string` to `POIResult` model
- [ ] **Step 1.2**: Add `displayedPOIs: string[]` to `SessionContext`
...
```

## Next Steps

1. **Start with Iteration 1.1** (Data Models)
2. **Follow the workflow** for each iteration
3. **Document learnings** as you go
4. **Ask for help** if stuck

## Getting Help

- Review `MASTER_IMPLEMENTATION_PLAN.md` for detailed steps
- Check `TEST_CASES.md` for expected behaviors
- Review `CONVERSATION_SCENARIOS.md` for examples
- Check error messages in test output

Happy coding! 🚀

