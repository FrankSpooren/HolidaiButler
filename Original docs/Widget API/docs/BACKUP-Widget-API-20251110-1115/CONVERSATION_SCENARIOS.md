# Conversation Scenarios Based on Available POI Data

This document contains realistic conversation scenarios based on the actual data available in the POI database. These scenarios will be used to improve the conversation improvement plan, implementation checklist, and test cases.

## Data Available for Scenarios

Based on `all data - cleaned.csv`, the following data types are available:

### Core POI Data
- **Location**: Coordinates (lat/lng), address, street, postal code, city, state
- **Ratings**: Total score (0-5), review count, star distribution (1-5 stars)
- **Review Tags**: Extracted tags from reviews (e.g., "price:17;indonesian food:12;rijsttafel:11")
- **Place Tags**: Additional categorization tags
- **Price Level**: Cost indicator
- **Opening Hours**: Hourly format (Mo:8:open;Mo:9:open...) and day-specific readable format
- **Contact**: Phone (formatted and unformatted), website
- **Categories**: Main category (level 1), Subcategory (level 2), Subcategory types (level 3)

### Amenities (224 fields)
- **Food & Dining**: Delivery, takeaway, dine-in, breakfast, lunch, dinner, brunch
- **Dietary**: Vegan options, vegetarian options, halal food, healthy options, organic dishes
- **Accessibility**: Wheelchair accessible entrance, toilet, car park, seating
- **Family**: Family friendly, good for kids, kids menu, high chairs, changing table
- **Pets**: Dogs allowed (inside/outside), pet friendly
- **Services**: Wifi, parking (free/paid), reservations, walk-ins, outdoor seating
- **Atmosphere**: Romantic, cozy, casual, trendy, upscale, quiet
- **Entertainment**: Live music, dancing, karaoke, sports, arcade games
- **And many more...**

### Q&A Data (65 question-answer pairs per POI)
- Questions about specific features, services, accessibility, food types, etc.
- Answers providing detailed information

### People Also Search
- Related POIs that users commonly search for together

---

## Scenario Categories

## Category 1: Food & Restaurant Scenarios

### Scenario 1.1: Dietary Requirements Search
**Context**: User has specific dietary needs
**Conversation Flow**:
```
User: "I'm looking for a vegan restaurant"
Bot: [Returns restaurants with vegan options, shows top 5 as cards]
     Text: "I found several restaurants with vegan options in Calpe..."

User: "Which one has the best reviews?"
Bot: [Shows top-rated vegan restaurant]
     Text: "[Restaurant Name] has the highest rating at [X] stars with [Y] reviews..."

User: "Do they have outdoor seating?"
Bot: [Checks amenity, responds]
     Text: "Yes, [Restaurant Name] has outdoor seating available..."
```

**Data Used**: 
- `google_amenity_vegan_options`
- `google_totalscore`, `google_reviewscount`
- `google_amenity_outdoor_seating`

**Test Points**:
- Filter by dietary requirement
- Sort by rating
- Check specific amenity
- Follow-up questions maintain context

---

### Scenario 1.2: Family-Friendly Restaurant Search
**Context**: User is traveling with children
**Conversation Flow**:
```
User: "Where can I eat with my kids?"
Bot: [Returns family-friendly restaurants]
     Text: "I found several family-friendly restaurants..."

User: "Does the first one have a kids menu?"
Bot: [Checks amenity for first restaurant]
     Text: "Yes, [Restaurant Name] has a kids menu. They also have high chairs and changing tables available..."

User: "What about parking?"
Bot: [Checks parking amenities]
     Text: "[Restaurant Name] has [free/paid] parking available..."
```

**Data Used**:
- `google_amenity_family_friendly`
- `google_amenity_kids_menu`
- `google_amenity_high_chairs`
- `google_amenity_has_changing_table`
- `google_amenity_free_parking` / `google_amenity_paid_parking`

**Test Points**:
- Multi-amenity filtering
- Follow-up amenity checks
- Contextual responses about family features

---

### Scenario 1.3: Cuisine Type with Q&A Context
**Context**: User wants specific cuisine type mentioned in Q&A
**Conversation Flow**:
```
User: "I want authentic Indonesian food"
Bot: [Searches Q&A for "indonesian food", finds Club Bali Restaurant]
     Text: "I found Club Bali Restaurant which serves authentic Indonesian cuisine, including rijsttafel..."

User: "Is it spicy?"
Bot: [Checks Q&A or review tags for "spicy"]
     Text: "According to reviews, some dishes are spicy. You can ask for milder options..."

User: "What time do they open today?"
Bot: [Checks opening hours for current day]
     Text: "Club Bali Restaurant opens at [time] today..."
```

**Data Used**:
- Q&A pairs (`qa_question_*`, `qa_answer_*`)
- Review tags (`google_reviewstags`) - e.g., "spicy:8"
- Opening hours (`google_openinghours`)

**Test Points**:
- Q&A-based search
- Review tag extraction
- Opening hours query
- Multi-turn conversation

---

### Scenario 1.4: Price Range Comparison
**Context**: User wants to compare restaurants by price
**Conversation Flow**:
```
User: "Show me affordable restaurants"
Bot: [Returns restaurants with lower price levels]
     Text: "I found several affordable restaurants in Calpe..."

User: "Which one has the best value for money?"
Bot: [Compares price level with ratings]
     Text: "[Restaurant Name] offers great value with a [X]-star rating and [price level] pricing..."

User: "What do people say about the portions?"
Bot: [Searches review tags for portion-related comments]
     Text: "Reviews mention [portion feedback from review tags]..."
```

**Data Used**:
- `google_price`
- `google_totalscore`
- `google_reviewstags` (e.g., "quantity:6")

**Test Points**:
- Price-based filtering
- Rating comparison
- Review tag extraction for specific aspects

---

## Category 2: Location & Proximity Scenarios

### Scenario 2.1: Beach Proximity Search
**Context**: User wants restaurants near the beach
**Conversation Flow**:
```
User: "Restaurants near the beach"
Bot: [Searches for restaurants with beach access or beach proximity]
     Text: "I found several restaurants near the beach in Calpe..."

User: "Which one is closest to the water?"
Bot: [Uses coordinates to calculate distance, or checks "beach" in review tags]
     Text: "[Restaurant Name] is the closest, located [distance] from the beach..."

User: "Do they have sea views?"
Bot: [Checks review tags or Q&A for "sea view" or "sea" mentions]
     Text: "Yes, [Restaurant Name] has sea views according to reviews..."
```

**Data Used**:
- `google_lat`, `google_lng` (for distance calculation)
- `google_amenity_beach_access`
- `google_reviewstags` (e.g., "sea:6")
- Q&A pairs about location

**Test Points**:
- Proximity-based search
- Distance calculation
- Review tag context
- Location-specific follow-ups

---

### Scenario 2.2: Current Location Proximity
**Context**: User wants nearby places based on their location
**Conversation Flow**:
```
User: "What restaurants are close to me?"
Bot: [Uses user's current location to find nearest restaurants]
     Text: "I found several restaurants near your location..."

User: "How far is the first one?"
Bot: [Calculates distance from user location]
     Text: "[Restaurant Name] is approximately [X] km from your location..."

User: "Can I walk there?"
Bot: [Considers distance and walkability]
     Text: "Yes, it's about a [X]-minute walk from your location..."
```

**Data Used**:
- `google_lat`, `google_lng`
- User's current location (from request)
- Address information for directions

**Test Points**:
- Location-based search
- Distance calculation
- Walkability assessment
- User location context

---

## Category 3: Accessibility & Special Needs Scenarios

### Scenario 3.1: Wheelchair Accessibility
**Context**: User needs wheelchair-accessible venues
**Conversation Flow**:
```
User: "I need wheelchair accessible restaurants"
Bot: [Filters by wheelchair accessibility amenities]
     Text: "I found several wheelchair-accessible restaurants..."

User: "Does the first one have accessible toilets?"
Bot: [Checks specific accessibility amenity]
     Text: "Yes, [Restaurant Name] has wheelchair-accessible toilets and entrance..."

User: "What about parking?"
Bot: [Checks wheelchair-accessible parking]
     Text: "[Restaurant Name] has wheelchair-accessible parking available..."
```

**Data Used**:
- `google_amenity_wheelchair_accessible_entrance`
- `google_amenity_wheelchair_accessible_toilet`
- `google_amenity_wheelchair_accessible_car_park`
- `google_amenity_wheelchair_accessible_seating`

**Test Points**:
- Accessibility filtering
- Multiple accessibility checks
- Detailed accessibility information

---

### Scenario 3.2: Dietary Restrictions with Accessibility
**Context**: User has both dietary and accessibility needs
**Conversation Flow**:
```
User: "Vegetarian restaurant that's wheelchair accessible"
Bot: [Filters by both criteria]
     Text: "I found [X] vegetarian restaurants that are wheelchair accessible..."

User: "Which one has the best accessibility features?"
Bot: [Compares accessibility amenities]
     Text: "[Restaurant Name] has the most comprehensive accessibility features including..."
```

**Data Used**:
- `google_amenity_vegetarian_options`
- All wheelchair accessibility amenities
- Rating for quality assessment

**Test Points**:
- Multi-criteria filtering
- Accessibility comparison
- Combined requirements

---

## Category 4: Time-Sensitive Scenarios

### Scenario 4.1: Currently Open Restaurants
**Context**: User wants to eat now
**Conversation Flow**:
```
User: "What restaurants are open right now?"
Bot: [Filters by current opening status]
     Text: "I found [X] restaurants currently open in Calpe..."

User: "Which one is closest?"
Bot: [Combines opening status with proximity]
     Text: "[Restaurant Name] is the closest open restaurant, [X] km away..."

User: "Do they take reservations?"
Bot: [Checks reservation amenity]
     Text: "Yes, [Restaurant Name] accepts reservations. You can book at [website/phone]..."
```

**Data Used**:
- `google_openinghours` (hourly format)
- `google_lat`, `google_lng` (for distance)
- `google_amenity_accepts_reservations`
- `google_reservetableurl`

**Test Points**:
- Real-time opening status
- Combined filters (open + proximity)
- Service availability checks

---

### Scenario 4.2: Opening Soon / Closing Soon
**Context**: User wants to know timing
**Conversation Flow**:
```
User: "Restaurants that open soon"
Bot: [Finds restaurants opening within next hour]
     Text: "I found [X] restaurants opening soon..."

User: "When does the first one open?"
Bot: [Checks next opening time]
     Text: "[Restaurant Name] opens at [time] today..."

User: "What about tomorrow?"
Bot: [Checks opening hours for next day]
     Text: "[Restaurant Name] opens at [time] tomorrow..."
```

**Data Used**:
- `google_openinghours` (hourly format)
- Day-specific opening hours fields

**Test Points**:
- Time-based filtering
- Future opening times
- Day-specific queries

---

## Category 5: Review & Rating Scenarios

### Scenario 5.1: High-Rated Restaurants
**Context**: User wants the best-rated places
**Conversation Flow**:
```
User: "Best restaurants in Calpe"
Bot: [Returns highest-rated restaurants]
     Text: "I found the top-rated restaurants in Calpe..."

User: "What makes the first one so good?"
Bot: [Extracts review tags and Q&A to explain]
     Text: "[Restaurant Name] is highly rated for [aspects from review tags]..."

User: "How many reviews does it have?"
Bot: [Shows review count]
     Text: "[Restaurant Name] has [X] reviews with an average rating of [Y] stars..."
```

**Data Used**:
- `google_totalscore`
- `google_reviewscount`
- `google_reviewstags`
- Star distribution (`google_onestar` through `google_fivestar`)

**Test Points**:
- Rating-based sorting
- Review tag extraction
- Review statistics
- Quality explanation

---

### Scenario 5.2: Review Tag Deep Dive
**Context**: User wants specific aspects from reviews
**Conversation Flow**:
```
User: "Restaurants known for good service"
Bot: [Searches review tags for "service"]
     Text: "I found restaurants highly rated for service..."

User: "What else are they known for?"
Bot: [Shows other review tags]
     Text: "[Restaurant Name] is also praised for [other tags]..."

User: "Any complaints?"
Bot: [Checks lower-star reviews or negative tags]
     Text: "Some reviewers mention [aspects] as areas for improvement..."
```

**Data Used**:
- `google_reviewstags` (e.g., "service:6")
- Star distribution for sentiment analysis
- Q&A pairs for common concerns

**Test Points**:
- Review tag search
- Multi-tag extraction
- Sentiment analysis
- Balanced information

---

## Category 6: Amenity Combination Scenarios

### Scenario 6.1: Romantic Dinner with Specific Requirements
**Context**: User planning a special occasion
**Conversation Flow**:
```
User: "Romantic restaurant with outdoor seating and good wine"
Bot: [Filters by multiple amenities]
     Text: "I found romantic restaurants with outdoor seating and wine selection..."

User: "Which one has the best atmosphere?"
Bot: [Compares atmosphere-related review tags]
     Text: "[Restaurant Name] is praised for its [atmosphere aspects]..."

User: "Do they need reservations?"
Bot: [Checks reservation requirements]
     Text: "Yes, reservations are [required/recommended]. You can book at..."
```

**Data Used**:
- `google_amenity_romantic`
- `google_amenity_outdoor_seating`
- `google_amenity_great_wine_list`
- `google_amenity_reservations_required` / `google_amenity_reservations_recommended`
- `google_reservetableurl`

**Test Points**:
- Multi-amenity filtering
- Atmosphere assessment
- Reservation information

---

### Scenario 6.2: Work-Friendly Cafe
**Context**: User needs a place to work
**Conversation Flow**:
```
User: "Cafe where I can work on my laptop"
Bot: [Filters by work-friendly amenities]
     Text: "I found cafes suitable for working..."

User: "Do they have wifi?"
Bot: [Checks wifi amenity]
     Text: "Yes, [Cafe Name] has free wifi available..."

User: "Is it quiet?"
Bot: [Checks quiet amenity or reviews]
     Text: "[Cafe Name] is marked as quiet, making it ideal for work..."
```

**Data Used**:
- `google_amenity_good_for_working_on_laptop`
- `google_amenity_free_wi-fi`
- `google_amenity_quiet`
- `google_amenity_coffee`

**Test Points**:
- Work-specific amenities
- Wifi confirmation
- Atmosphere checks

---

## Category 7: Q&A-Based Discovery Scenarios

### Scenario 7.1: Question-Driven Search
**Context**: User searches based on common questions
**Conversation Flow**:
```
User: "Where can I get authentic paella?"
Bot: [Searches Q&A for "paella" or "authentic paella"]
     Text: "I found restaurants known for authentic paella..."

User: "Do they make it fresh?"
Bot: [Searches Q&A for freshness information]
     Text: "According to reviews, [Restaurant Name] prepares paella fresh daily..."

User: "What's the price range?"
Bot: [Checks price level and Q&A]
     Text: "Paella at [Restaurant Name] is [price level], typically [price range]..."
```

**Data Used**:
- Q&A pairs (`qa_question_*`, `qa_answer_*`)
- `google_price`
- Review tags related to price

**Test Points**:
- Q&A-based search
- Question matching
- Price information extraction

---

### Scenario 7.2: Multi-Question Follow-up
**Context**: User asks multiple related questions
**Conversation Flow**:
```
User: "Family-friendly restaurant"
Bot: [Returns family-friendly options]
     Text: "I found several family-friendly restaurants..."

User: "Does the first one have a playground?"
Bot: [Checks playground amenity]
     Text: "[Restaurant Name] [has/doesn't have] a playground, but it has [other family features]..."

User: "What about parking for a large car?"
Bot: [Checks parking amenities and Q&A]
     Text: "[Restaurant Name] has [parking type] parking. Reviews mention [parking details]..."
```

**Data Used**:
- `google_amenity_family_friendly`
- `google_amenity_playground`
- `google_amenity_free_parking` / `google_amenity_paid_parking`
- Q&A about parking

**Test Points**:
- Sequential amenity checks
- Q&A integration
- Detailed feature information

---

## Category 8: Comparison Scenarios

### Scenario 8.1: Compare Two Restaurants
**Context**: User wants to compare options
**Conversation Flow**:
```
User: "Italian restaurants"
Bot: [Returns Italian restaurants]
     Text: "I found several Italian restaurants..."

User: "Compare the first two"
Bot: [Compares ratings, amenities, prices]
     Text: "Comparing [Restaurant 1] and [Restaurant 2]:
           - Ratings: [Restaurant 1] has [X] stars, [Restaurant 2] has [Y] stars
           - Price: [Restaurant 1] is [price], [Restaurant 2] is [price]
           - Features: [Restaurant 1] offers [amenities], [Restaurant 2] offers [amenities]..."

User: "Which one is better for families?"
Bot: [Compares family-friendly features]
     Text: "[Restaurant X] is better for families because [reasons]..."
```

**Data Used**:
- Ratings, prices, amenities
- Review tags
- Family-related amenities

**Test Points**:
- Multi-POI comparison
- Feature-by-feature comparison
- Contextual recommendations

---

## Category 9: Complex Multi-Turn Scenarios

### Scenario 9.1: Complete Dining Decision Journey
**Context**: User goes through full decision process
**Conversation Flow**:
```
User: "I want to have dinner tonight"
Bot: [Returns restaurants open for dinner]
     Text: "I found several restaurants open for dinner tonight..."

User: "Something romantic"
Bot: [Filters to romantic restaurants]
     Text: "Here are romantic restaurants open tonight..."

User: "With sea views"
Bot: [Further filters by sea view mentions]
     Text: "[Restaurant Name] offers romantic dining with sea views..."

User: "Do they need reservations?"
Bot: [Checks reservation requirements]
     Text: "Reservations are recommended. You can book at..."

User: "What's the phone number?"
Bot: [Provides contact information]
     Text: "You can call [Restaurant Name] at [phone number]..."
```

**Data Used**:
- Opening hours
- `google_amenity_romantic`
- Review tags (sea views)
- Reservation info
- Contact information

**Test Points**:
- Progressive filtering
- Context maintenance
- Information retrieval
- Complete user journey

---

### Scenario 9.2: Alternative Suggestions
**Context**: User's first choice doesn't work, needs alternatives
**Conversation Flow**:
```
User: "Restaurants with paella"
Bot: [Returns paella restaurants]
     Text: "I found restaurants known for paella..."

User: "Is the first one open now?"
Bot: [Checks opening status]
     Text: "No, [Restaurant Name] is currently closed. It opens at [time]..."

User: "What else is open?"
Bot: [Finds alternative open restaurants with paella]
     Text: "However, these restaurants are currently open and also serve paella: [list]..."
```

**Data Used**:
- Opening hours
- Q&A or review tags for paella
- Alternative POI finding

**Test Points**:
- Opening status check
- Alternative finding
- Contextual suggestions

---

## Category 10: Special Occasion Scenarios

### Scenario 10.1: Birthday Celebration
**Context**: User planning special event
**Conversation Flow**:
```
User: "Where can I celebrate a birthday?"
Bot: [Searches for celebration-friendly venues]
     Text: "I found several venues suitable for birthday celebrations..."

User: "Something with live music"
Bot: [Filters by live music amenity]
     Text: "[Venue Name] offers live music and is great for celebrations..."

User: "Can we bring a cake?"
Bot: [Searches Q&A for outside food policy]
     Text: "[Venue Name] [allows/doesn't allow] outside food. [Details]..."
```

**Data Used**:
- `google_amenity_live_music`
- `google_amenity_outside_food_allowed`
- Q&A about policies
- Celebration-related amenities

**Test Points**:
- Event-specific search
- Policy information
- Q&A integration

---

### Scenario 10.2: Business Lunch
**Context**: Professional meeting requirements
**Conversation Flow**:
```
User: "Good restaurant for a business lunch"
Bot: [Finds professional/upscale restaurants]
     Text: "I found restaurants suitable for business lunches..."

User: "Quiet enough to have a conversation?"
Bot: [Checks quiet amenity]
     Text: "Yes, [Restaurant Name] is marked as quiet, perfect for business meetings..."

User: "Do they have private dining?"
Bot: [Checks private dining room amenity]
     Text: "[Restaurant Name] has a private dining room available for business meetings..."
```

**Data Used**:
- `google_amenity_upscale`
- `google_amenity_quiet`
- `google_amenity_private_dining_room`
- Business-friendly amenities

**Test Points**:
- Professional context
- Atmosphere requirements
- Special room availability

---

## Category 11: Pet-Friendly Scenarios

### Scenario 11.1: Dining with Dogs
**Context**: User wants to bring their dog
**Conversation Flow**:
```
User: "Restaurants where I can bring my dog"
Bot: [Filters by pet-friendly amenities]
     Text: "I found pet-friendly restaurants in Calpe..."

User: "Can dogs go inside or just outside?"
Bot: [Checks specific pet amenities]
     Text: "[Restaurant Name] allows dogs [inside/outside/both]..."

User: "Is there a dog park nearby?"
Bot: [Searches for dog parks or checks Q&A]
     Text: "[Information about nearby dog facilities]..."
```

**Data Used**:
- `google_amenity_dogs_allowed`
- `google_amenity_dogs_allowed_inside`
- `google_amenity_dogs_allowed_outside`
- `google_amenity_dog_park`

**Test Points**:
- Pet policy details
- Specific amenity checks
- Nearby facility information

---

## Category 12: Review-Driven Scenarios

### Scenario 12.1: Specific Review Aspect
**Context**: User cares about specific review aspects
**Conversation Flow**:
```
User: "Restaurants with great cocktails"
Bot: [Searches review tags for "cocktail"]
     Text: "I found restaurants praised for their cocktails..."

User: "What do people say about the cocktails?"
Bot: [Extracts cocktail-related review information]
     Text: "Reviews mention [cocktail details from review tags and Q&A]..."

User: "Do they have happy hour?"
Bot: [Checks happy hour amenities]
     Text: "Yes, [Restaurant Name] offers happy hour [details]..."
```

**Data Used**:
- `google_reviewstags` (e.g., "cocktail:5")
- `google_amenity_happy_hour_drinks`
- Q&A about cocktails

**Test Points**:
- Review tag extraction
- Specific aspect queries
- Related amenity checks

---

## Implementation Notes

### Data Mapping to Scenarios

Each scenario should:
1. **Identify relevant data fields** from the CSV
2. **Map to conversation flow** steps
3. **Define expected responses** based on data
4. **Create test cases** for validation

### Priority Scenarios

Based on common use cases, prioritize:
1. **Food & Restaurant** scenarios (most common)
2. **Time-sensitive** scenarios (currently open, opening soon)
3. **Accessibility** scenarios (important for inclusivity)
4. **Location-based** scenarios (proximity, beach, etc.)

### Scenario Complexity Levels

- **Simple**: Single query, single response
- **Medium**: Follow-up questions, context maintenance
- **Complex**: Multi-turn conversations, comparisons, alternatives

### Integration with Improvement Plan

These scenarios will be used to:
1. **Enhance test cases** in `TEST_CASES.md`
2. **Update implementation checklist** in `IMPLEMENTATION_CHECKLIST.md`
3. **Refine improvement plan** in `CONVERSATION_IMPROVEMENT_PLAN.md`
4. **Create realistic test data** for development

---

## Next Steps

1. **Prioritize scenarios** based on user needs
2. **Create test data** for each scenario
3. **Implement scenario handlers** in the chatbot
4. **Validate scenarios** with real data
5. **Iterate** based on user feedback

Each scenario should be tested end-to-end to ensure the conversation flow works naturally and provides helpful, accurate information based on the available POI data.

