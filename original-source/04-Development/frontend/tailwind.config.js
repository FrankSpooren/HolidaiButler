/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Header & Backgrounds (from DESIGN_SYSTEM.md)
        'holibot-header-start': '#4A7066',  // Dark Mediterranean Teal
        'holibot-header-mid': '#5E8B7E',    // Medium Teal (PRIMARY BRAND)
        'holibot-header-end': '#7FA594',    // Light Sage Green

        // Aliases for easier use
        'holibot-primary': '#7FA594',       // Light Sage Green (PRIMARY)
        'holibot-secondary': '#5E8B7E',     // Medium Teal (SECONDARY)
        'holibot-dark': '#4A7066',          // Dark Mediterranean Teal

        // Accents
        'holibot-accent': '#D4AF37',        // Compass Gold (PRIMARY ACCENT)
        'accent-gold': '#D4AF37',           // Alias for consistency
        'holibot-accent-hover': '#C19A2E',  // Darker Gold

        // Ratings
        'rating-gold': '#FFC107',           // Bright Gold (star icons)

        // Trust Badges
        'verified-navy': '#2C3E50',         // Verified badges
        'trust-gold': '#D4AF37',            // Top-rated (90+)
        'trust-green': '#10B981',           // Excellent (80-89)
        'trust-blue': '#3B82F6',            // Highly-rated (70-79)

        // Text Hierarchy
        'text-primary': '#1F2937',          // Near Black
        'text-secondary': '#6B7280',        // Medium Gray
        'text-tertiary': '#9CA3AF',         // Light Gray

        // Backgrounds
        'bg-gray': '#F9FAFB',               // Page background
        'bg-hover': '#F3F4F6',              // Hover states

        // Borders
        'border-light': '#E5E7EB',
        'border-medium': '#D1D5DB',

        // Category Gradients (8 main categories)
        'category-active-start': '#016193',
        'category-active-end': '#1a709d',
        'category-beaches-start': '#b4942e',
        'category-beaches-end': '#bb9e42',
        'category-culture-start': '#253444',
        'category-culture-end': '#3a4856',
        'category-recreation-start': '#354f48',
        'category-recreation-end': '#49605a',
        'category-food-start': '#4f766b',
        'category-food-end': '#608379',
        'category-health-start': '#004568',
        'category-health-end': '#195777',
        'category-shopping-start': '#b4892e',
        'category-shopping-end': '#bb9442',
        'category-practical-start': '#016193',
        'category-practical-end': '#1a709d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Mobile-first typography (from DESIGN_SYSTEM.md)
        'xs': '12px',
        'sm': '14px',
        'base': '16px',    // WCAG minimum
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
      },
      spacing: {
        // Mobile-first spacing
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        'card': '12px',
        'button': '24px',
        'chip': '20px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'modal': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      minHeight: {
        'touch': '44px',      // WCAG 2.1 AA minimum
        'touch-lg': '48px',   // Recommended
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
    },
  },
  plugins: [],
}
