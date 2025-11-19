# WCAG 2.1 Level AA Compliance Components

## Overzicht
Complete accessibility suite voor WCAG 2.1 Level AA compliance.

## Current Status: 65% → Target: 100%

## Critical Accessibility Issues to Fix

### 1. Keyboard Navigation
❌ **Missing:**
- Skip-to-content link
- Focus trap in modals
- Custom focus indicators
- Tab order optimization

✅ **Solution:**
- `SkipToContent.jsx` - Jump to main content
- `FocusTrap.jsx` - Trap focus in dialogs
- Custom focus styles with 3px outline

### 2. Screen Reader Support
❌ **Missing:**
- ARIA labels on custom components
- ARIA live regions for dynamic content
- Proper landmark regions

✅ **Solution:**
- `AccessibleButton.jsx` - Buttons with proper ARIA
- `AccessibleForm.jsx` - Forms with error announcements
- ARIA live regions for notifications

### 3. Color Contrast
❌ **Not Tested:**
- Text: 4.5:1 ratio (WCAG AA)
- UI components: 3:1 ratio

✅ **Solution:**
- Automated testing with axe-core
- Color palette verification
- Contrast checker utility

### 4. Text Accessibility
✅ **Good:**
- Minimum 16px font
- Line height 1.5
- Resizable up to 200%

⚠️ **Needs Improvement:**
- Letter spacing for dyslexia support
- Text alternatives for images

## Components

### SkipToContent.jsx
```jsx
// Allows keyboard users to skip navigation
<SkipToContent targetId="main-content" />
```

### AccessibleButton.jsx
```jsx
// Button with proper ARIA labels
<AccessibleButton
  onClick={handleClick}
  ariaLabel="Book Terra Natura Zoo tickets"
  ariaDescribedBy="price-info"
>
  Book Now
</AccessibleButton>
```

### FocusTrap.jsx
```jsx
// Trap focus within modal/dialog
<Dialog open={open}>
  <FocusTrap>
    <DialogContent>
      {/* Content */}
    </DialogContent>
  </FocusTrap>
</Dialog>
```

### AccessibilityProvider.jsx
```jsx
// Global accessibility context
<AccessibilityProvider>
  <App />
</AccessibilityProvider>

// Provides:
// - High contrast mode
// - Font size adjustment
// - Reduced motion
// - Keyboard navigation mode
```

## Testing Tools

### Automated Testing
```bash
npm install --save-dev @axe-core/react eslint-plugin-jsx-a11y
```

```javascript
// App.jsx (development only)
if (process.env.NODE_ENV !== 'production') {
  const axe = require('@axe-core/react');
  axe(React, ReactDOM, 1000);
}
```

### Manual Testing
- **Keyboard:** Tab through entire application
- **Screen Reader:** NVDA (Windows), VoiceOver (Mac)
- **Zoom:** Test up to 200% zoom
- **Color Blindness:** Chrome DevTools simulator

## WCAG 2.1 Level AA Checklist

### Perceivable
- [x] 1.1.1 Non-text Content (Alt text)
- [x] 1.3.1 Info and Relationships
- [ ] 1.4.3 Contrast (Minimum) - **TO FIX**
- [ ] 1.4.11 Non-text Contrast - **TO FIX**
- [x] 1.4.12 Text Spacing

### Operable
- [x] 2.1.1 Keyboard
- [ ] 2.4.1 Bypass Blocks - **TO ADD (Skip link)**
- [x] 2.4.2 Page Titled
- [ ] 2.4.3 Focus Order - **TO TEST**
- [ ] 2.4.7 Focus Visible - **TO ENHANCE**
- [x] 2.5.5 Target Size (48x48px minimum)

### Understandable
- [ ] 3.1.1 Language of Page - **TO ADD (lang attr)**
- [x] 3.1.2 Language of Parts
- [x] 3.2.3 Consistent Navigation
- [x] 3.3.1 Error Identification
- [x] 3.3.2 Labels or Instructions

### Robust
- [ ] 4.1.2 Name, Role, Value - **TO ADD (ARIA)**
- [x] 4.1.3 Status Messages

## Implementation Priority

**Week 1:**
1. SkipToContent component
2. Focus visible styles
3. ARIA labels on all interactive elements

**Week 2:**
4. Color contrast fixes
5. Screen reader testing
6. Keyboard navigation audit

**Week 3:**
7. Automated testing setup
8. Documentation
9. Team training

## Code Examples

### Add Skip Link
```jsx
// App.jsx
import { SkipToContent } from './components/accessibility';

function App() {
  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content">
        {/* Main content */}
      </main>
    </>
  );
}
```

### Enhance Button Accessibility
```jsx
// Before
<Button onClick={handleBook}>
  Book Now
</Button>

// After
<AccessibleButton
  onClick={handleBook}
  ariaLabel="Book Terra Natura Zoo tickets for Saturday, November 20th"
>
  Book Now
</AccessibleButton>
```

### Add Focus Styles
```javascript
// theme.js
components: {
  MuiButton: {
    styleOverrides: {
      root: {
        '&:focus-visible': {
          outline: '3px solid',
          outlineColor: theme.palette.primary.main,
          outlineOffset: '2px',
        },
      },
    },
  },
},
```

## Benefits

✅ **Legal Compliance:** Avoid lawsuits (EU Accessibility Directive)
✅ **Larger Audience:** +15% users (elderly, disabled)
✅ **Better SEO:** Semantic HTML improves rankings
✅ **Better UX:** Accessibility benefits everyone

## Penalties for Non-Compliance

**EU Accessibility Directive (2025):**
- Fines up to €10,000
- Mandatory remediation
- Reputation damage

**Prevention is cheaper than remediation!**
