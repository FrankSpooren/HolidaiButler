/**
 * OnboardingFlow - 4-Step Personalization Flow
 *
 * Route: /onboarding
 * Layout: None (custom header)
 * Auth: After signup only
 *
 * Steps:
 * 1. Travel companion (single select)
 * 2. Interests (multi-select)
 * 3. Trip context (form fields)
 * 4. Optional preferences (dietary, accessibility)
 *
 * After completion: Redirect to /pois
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import './Onboarding.css';

// Types
interface OnboardingData {
  travelCompanion: string | null;
  interests: string[];
  stayType: string | null;
  visitStatus: string | null;
  tripDate: string | null;
  duration: string | null;
  dietary: string[];
  accessibility: string[];
}

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';

  const [currentStep, setCurrentStep] = useState(1);

  // Load existing preferences if available
  const loadExistingPreferences = (): OnboardingData => {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return {
      travelCompanion: null,
      interests: [],
      stayType: null,
      visitStatus: null,
      tripDate: null,
      duration: null,
      dietary: [],
      accessibility: [],
    };
  };

  const [formData, setFormData] = useState<OnboardingData>(loadExistingPreferences());

  // Load existing preferences when in edit mode
  useEffect(() => {
    if (isEditMode) {
      const existing = loadExistingPreferences();
      setFormData(existing);
      console.log('Loaded existing preferences for editing:', existing);
    }
  }, [isEditMode]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Step 1: Travel Companion
  const companions = [
    { id: 'couple', icon: '💑', title: 'Couple', subtitle: 'Enjoying a romantic trip' },
    { id: 'family', icon: '👨‍👩‍👧‍👦', title: 'Family', subtitle: 'Great for family fun and bonding' },
    { id: 'solo', icon: '👤', title: 'Solo', subtitle: 'Explore at your own pace' },
    { id: 'group', icon: '👥', title: 'Group', subtitle: 'Perfect for friends and colleagues' },
  ];

  // Step 2: Interests
  const interests = [
    { id: 'relax', icon: '🏖️', title: 'Relax', subtitle: 'Unwind and recharge' },
    { id: 'active', icon: '⚡', title: 'Active', subtitle: 'Adventure and sports' },
    { id: 'culture', icon: '🎭', title: 'Culture', subtitle: 'Local arts & creative experiences' },
    { id: 'food', icon: '🍽️', title: 'Food', subtitle: 'Culinary adventures' },
    { id: 'nature', icon: '🌲', title: 'Nature', subtitle: 'Outdoor exploration' },
    { id: 'nightlife', icon: '🌙', title: 'Nightlife', subtitle: 'Evening entertainment' },
    { id: 'history', icon: '🏛️', title: 'History', subtitle: 'Discover the past' },
    { id: 'shopping', icon: '🛍️', title: 'Shopping', subtitle: 'Retail therapy' },
  ];

  // Step 3: Duration options
  const durations = [
    { id: '1-3-days', label: '1-3 days (weekend)' },
    { id: '4-7-days', label: '4-7 days (week)' },
    { id: '1-2-weeks', label: '1-2 weeks' },
    { id: '2+-weeks', label: '2+ weeks' },
    { id: 'flexible', label: 'Flexible/Not sure' },
  ];

  // Step 4: Dietary options
  const dietaryOptions = [
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'gluten-free', label: 'Gluten-free' },
    { id: 'halal', label: 'Halal' },
    { id: 'kosher', label: 'Kosher' },
    { id: 'lactose-free', label: 'Lactose-free' },
    { id: 'nut-allergies', label: 'Nut allergies' },
  ];

  // Step 4: Accessibility options
  const accessibilityOptions = [
    { id: 'wheelchair-accessible', label: 'Wheelchair accessible' },
    { id: 'mobility-assistance', label: 'Mobility assistance' },
    { id: 'visual-impairment', label: 'Visual impairment' },
    { id: 'hearing-impairment', label: 'Hearing impairment' },
  ];

  // Handlers
  const selectCompanion = (id: string) => {
    setFormData({ ...formData, travelCompanion: id });
  };

  const toggleInterest = (id: string) => {
    const newInterests = formData.interests.includes(id)
      ? formData.interests.filter((i) => i !== id)
      : [...formData.interests, id];
    setFormData({ ...formData, interests: newInterests });
  };

  const toggleDietary = (id: string) => {
    const newDietary = formData.dietary.includes(id)
      ? formData.dietary.filter((d) => d !== id)
      : [...formData.dietary, id];
    setFormData({ ...formData, dietary: newDietary });
  };

  const toggleAccessibility = (id: string) => {
    const newAccessibility = formData.accessibility.includes(id)
      ? formData.accessibility.filter((a) => a !== id)
      : [...formData.accessibility, id];
    setFormData({ ...formData, accessibility: newAccessibility });
  };

  const goNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    const message = isEditMode
      ? 'Cancel editing preferences and return to your account?'
      : 'Skip onboarding? You can set preferences later in your account.';

    if (confirm(message)) {
      navigate(isEditMode ? '/account' : '/pois');
    }
  };

  const handleComplete = async () => {
    // TODO: Save to backend API (POST /api/v1/users/preferences)
    console.log('Preferences saved:', formData);

    // Save to localStorage as backup
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('userPreferences', JSON.stringify(formData));

    // Redirect based on mode
    if (isEditMode) {
      navigate('/account');
    } else {
      navigate('/pois');
    }
  };

  // Validation
  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return formData.travelCompanion !== null;
      case 2:
        return formData.interests.length > 0;
      case 3:
        // In edit mode, allow continuing even without all fields
        // In new user mode, require at least duration
        return isEditMode || (formData.duration !== null);
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  return (
    <div className="onboarding">
      {/* Header */}
      <div className="onboarding-header">
        {currentStep > 1 && (
          <button className="back-btn" onClick={goBack}>
            <ArrowLeft size={24} />
          </button>
        )}
        {currentStep === 1 && <span className="menu-icon">☰</span>}
        <button className="skip-btn" onClick={skipOnboarding}>
          <X size={16} /> Skip
        </button>
      </div>

      {/* Container */}
      <div className="onboarding-container">
        {/* Edit Mode Indicator */}
        {isEditMode && (
          <div style={{
            background: 'linear-gradient(135deg, #4f766b, #608379)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            ✏️ Editing your preferences - Your current selections are shown below
          </div>
        )}

        {/* Progress Indicator */}
        <div className="progress-section">
          <div className="step-text">Step {currentStep} of 4</div>
          <div className="progress-dots">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`dot ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Travel Companion */}
        {currentStep === 1 && (
          <>
            <div className="onboarding-heading">
              <div className="heading-icon">👥</div>
              Who are you traveling with?
            </div>

            <div className="option-grid">
              {companions.map((companion) => (
                <div
                  key={companion.id}
                  className={`option-card ${formData.travelCompanion === companion.id ? 'selected' : ''}`}
                  onClick={() => selectCompanion(companion.id)}
                >
                  <span className="option-icon">{companion.icon}</span>
                  <div className="option-content">
                    <div className="option-title">{companion.title}</div>
                    <div className="option-subtitle">{companion.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Interests */}
        {currentStep === 2 && (
          <>
            <div className="onboarding-heading">
              <div className="heading-icon">🎯</div>
              What are you looking for in Calpe?
            </div>
            <div className="onboarding-subheading">(Select all that apply)</div>

            <div className="category-grid">
              {interests.map((interest) => (
                <div
                  key={interest.id}
                  className={`category-card ${formData.interests.includes(interest.id) ? 'selected' : ''}`}
                  onClick={() => toggleInterest(interest.id)}
                >
                  <span className="category-icon">{interest.icon}</span>
                  <div className="option-content">
                    <div className="category-title">{interest.title}</div>
                    <div className="category-subtitle">{interest.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="selection-count">
              Selected: <strong>{formData.interests.length}</strong> {formData.interests.length === 1 ? 'option' : 'options'}
            </div>
          </>
        )}

        {/* Step 3: Trip Context */}
        {currentStep === 3 && (
          <>
            <div className="onboarding-heading">
              <div className="heading-icon">📅</div>
              Tell us about your trip
            </div>

            {/* Type of Stay */}
            <div className="form-section">
              <label className="form-label">Type of stay</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="pleasure"
                    name="stayType"
                    value="pleasure"
                    checked={formData.stayType === 'pleasure'}
                    onChange={(e) => setFormData({ ...formData, stayType: e.target.value })}
                  />
                  <label htmlFor="pleasure">Pleasure</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="business"
                    name="stayType"
                    value="business"
                    checked={formData.stayType === 'business'}
                    onChange={(e) => setFormData({ ...formData, stayType: e.target.value })}
                  />
                  <label htmlFor="business">Business</label>
                </div>
              </div>
            </div>

            {/* Visit Status */}
            <div className="form-section">
              <label className="form-label">Visit status</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="first-time"
                    name="visitStatus"
                    value="first-time"
                    checked={formData.visitStatus === 'first-time'}
                    onChange={(e) => setFormData({ ...formData, visitStatus: e.target.value })}
                  />
                  <label htmlFor="first-time">First time</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="returning"
                    name="visitStatus"
                    value="returning"
                    checked={formData.visitStatus === 'returning'}
                    onChange={(e) => setFormData({ ...formData, visitStatus: e.target.value })}
                  />
                  <label htmlFor="returning">Returning visitor</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="local"
                    name="visitStatus"
                    value="local"
                    checked={formData.visitStatus === 'local'}
                    onChange={(e) => setFormData({ ...formData, visitStatus: e.target.value })}
                  />
                  <label htmlFor="local">Local resident</label>
                </div>
              </div>
            </div>

            {/* Trip Date */}
            <div className="form-section">
              <label className="form-label">When are you visiting?</label>
              <div className="input-wrapper">
                <span className="input-icon">📅</span>
                <input
                  type="date"
                  className="input-field"
                  value={formData.tripDate || ''}
                  onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="form-section">
              <label className="form-label">Trip duration</label>
              <div className="radio-group">
                {durations.map((duration) => (
                  <div className="radio-option" key={duration.id}>
                    <input
                      type="radio"
                      id={duration.id}
                      name="duration"
                      value={duration.id}
                      checked={formData.duration === duration.id}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                    <label htmlFor={duration.id}>{duration.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 4: Optional Preferences */}
        {currentStep === 4 && (
          <>
            <div className="optional-header">
              <div className="onboarding-heading" style={{ marginBottom: 0 }}>Optional</div>
              <a className="skip-link" onClick={goNext}>
                Skip <span>→</span>
              </a>
            </div>

            {/* Dietary */}
            <div className="form-section">
              <label className="form-label">Any dietary requirements?</label>
              <span className="form-sublabel">(Select multiple)</span>
              <div className="checkbox-group">
                {dietaryOptions.map((option) => (
                  <div className="checkbox-option" key={option.id}>
                    <input
                      type="checkbox"
                      id={option.id}
                      checked={formData.dietary.includes(option.id)}
                      onChange={() => toggleDietary(option.id)}
                    />
                    <label htmlFor={option.id}>{option.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Accessibility */}
            <div className="form-section">
              <label className="form-label">Accessibility needs?</label>
              <span className="form-sublabel">(Select multiple)</span>
              <div className="checkbox-group">
                {accessibilityOptions.map((option) => (
                  <div className="checkbox-option" key={option.id}>
                    <input
                      type="checkbox"
                      id={option.id}
                      checked={formData.accessibility.includes(option.id)}
                      onChange={() => toggleAccessibility(option.id)}
                    />
                    <label htmlFor={option.id}>{option.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CTA Button */}
        <button
          className="onboarding-cta"
          disabled={!canContinue()}
          onClick={goNext}
        >
          {currentStep === 4
            ? (isEditMode ? 'Save Preferences →' : 'Finish & Explore →')
            : 'Continue →'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
