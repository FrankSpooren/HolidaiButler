# Enhanced Filter System

## Overzicht
Een geavanceerd filtersysteem gebaseerd op Miller's Law en Proximity Principle voor optimale gebruikerservaring.

## UX Principes
- **Miller's Law:** Max 5-7 primaire filters zichtbaar
- **Proximity Principle:** Filters gegroepeerd, actieve filters als chips
- **Hick's Law:** Progressive disclosure met "More filters"

## Components

### 1. EnhancedFilterBar.jsx
Hoofd filter component met:
- Quick filters (Category, Date, Price)
- Advanced filters (drawer)
- Active filter chips
- Result count feedback

### 2. useFilterState.js
Custom hook voor filter state management

### 3. FilterChips.jsx
Visual representation van actieve filters

## Installatie

```bash
cd ticketing-module/frontend
npm install date-fns lodash.debounce
```

## Gebruik

```jsx
import EnhancedFilterBar from './components/filters/EnhancedFilterBar';
import useFilterState from './hooks/useFilterState';

function EventSelection() {
  const { filters, setFilter, clearFilters, activeFilterCount } = useFilterState();

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Apply filters
      if (filters.categories.length && !filters.categories.includes(event.category)) {
        return false;
      }
      // ... more filter logic
      return true;
    });
  }, [events, filters]);

  return (
    <>
      <EnhancedFilterBar
        filters={filters}
        onFilterChange={setFilter}
        onClearAll={clearFilters}
        resultCount={filteredEvents.length}
      />
      {/* Event cards */}
    </>
  );
}
```

## Filter Categories

- **Natuur & Outdoor:** Parks, beaches, hiking
- **Cultuur & Geschiedenis:** Museums, landmarks
- **Familie & Kinderen:** Theme parks, family activities
- **Eten & Drinken:** Restaurants, food tours
- **Sport & Avontuur:** Water sports, climbing

## Integration Checklist

- [ ] Kopieer components naar `src/components/filters/`
- [ ] Kopieer hook naar `src/hooks/`
- [ ] Import in EventSelection.jsx
- [ ] Update API calls met filter parameters
- [ ] Test op mobiel en desktop
- [ ] Accessibility test (keyboard navigation)

## Performance Considerations

- Filters use debouncing (300ms) voor text input
- Memoized filter logic
- Lazy loading van advanced filters
