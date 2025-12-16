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
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
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
  const { t } = useLanguage();
  const ob = (t as any).onboarding || {};
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

  // Step 1: Travel Companion (Solo stays "Solo" in all languages)
  const companions = [
    { id: 'couple', icon: '💑', title: ob.couple || 'Couple', subtitle: ob.coupleDesc || 'Enjoying a romantic trip' },
    { id: 'family', icon: '👨‍👩‍👧‍👦', title: ob.family || 'Family', subtitle: ob.familyDesc || 'Great for family fun and bonding' },
    { id: 'solo', icon: '👤', title: 'Solo', subtitle: ob.soloDesc || 'Explore at your own pace' },
    { id: 'group', icon: '👥', title: ob.group || 'Group', subtitle: ob.groupDesc || 'Perfect for friends and colleagues' },
  ];

  // Step 2: Interests
  const interests = [
    { id: 'relax', icon: '🏖️', title: ob.relax || 'Relax', subtitle: ob.relaxDesc || 'Unwind and recharge' },
    { id: 'active', icon: '⚡', title: ob.active || 'Active', subtitle: ob.activeDesc || 'Adventure and sports' },
    { id: 'culture', icon: '🎭', title: ob.culture || 'Culture', subtitle: ob.cultureDesc || 'Local arts & creative experiences' },
    { id: 'food', icon: '🍽️', title: ob.food || 'Food', subtitle: ob.foodDesc || 'Culinary adventures' },
    { id: 'nature', icon: '🌲', title: ob.nature || 'Nature', subtitle: ob.natureDesc || 'Outdoor exploration' },
    { id: 'nightlife', icon: '🌙', title: ob.nightlife || 'Nightlife', subtitle: ob.nightlifeDesc || 'Evening entertainment' },
    { id: 'history', icon: '🏛️', title: ob.history || 'History', subtitle: ob.historyDesc || 'Discover the past' },
    { id: 'shopping', icon: '🛍️', title: ob.shopping || 'Shopping', subtitle: ob.shoppingDesc || 'Retail therapy' },
  ];

  // Step 3: Duration options
  const durations = [
    { id: '1-3-days', label: ob.duration1 || '1-3 days (weekend)' },
    { id: '4-7-days', label: ob.duration2 || '4-7 days (week)' },
    { id: '1-2-weeks', label: ob.duration3 || '1-2 weeks' },
    { id: '2+-weeks', label: ob.duration4 || '2+ weeks' },
    { id: 'flexible', label: ob.durationFlex || 'Flexible/Not sure' },
  ];

  // Step 4: Dietary options
  const dietaryOptions = [
    { id: 'vegetarian', label: ob.vegetarian || 'Vegetarian' },
    { id: 'vegan', label: ob.vegan || 'Vegan' },
    { id: 'gluten-free', label: ob.glutenFree || 'Gluten-free' },
    { id: 'halal', label: ob.halal || 'Halal' },
    { id: 'kosher', label: ob.kosher || 'Kosher' },
    { id: 'lactose-free', label: ob.lactoseFree || 'Lactose-free' },
    { id: 'nut-allergies', label: ob.nutAllergies || 'Nut allergies' },
  ];

  // Step 4: Accessibility options
  const accessibilityOptions = [
    { id: 'wheelchair-accessible', label: ob.wheelchair || 'Wheelchair accessible' },
    { id: 'mobility-assistance', label: ob.mobility || 'Mobility assistance' },
    { id: 'visual-impairment', label: ob.visual || 'Visual impairment' },
    { id: 'hearing-impairment', label: ob.hearing || 'Hearing impairment' },
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
      ? (ob.cancelEdit || 'Cancel editing preferences and return to your account?')
      : (ob.skipConfirm || 'Skip onboarding? You can set preferences later in your account.');

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
      {/* Navigation Bar */}
      <div className="onboarding-nav">
        {currentStep > 1 && (
          <button className="onboarding-back-btn" onClick={goBack}>
            <ArrowLeft size={20} /> {ob.back || 'Back'}
          </button>
        )}
        <div className="onboarding-nav-spacer" />
        <button className="onboarding-skip-btn" onClick={skipOnboarding}>
          {ob.skip || 'Skip'} <X size={16} />
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
            ✏️ {ob.editMode || 'Editing your preferences - Your current selections are shown below'}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="progress-section">
          <div className="step-text">{ob.stepOf || 'Step'} {currentStep} {ob.of || 'of'} 4</div>
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
              {ob.step1Title || 'Who are you traveling with?'}
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
              {ob.step2Title || 'What are you looking for in Calpe?'}
            </div>
            <div className="onboarding-subheading">{ob.selectAll || '(Select all that apply)'}</div>

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
              {ob.selected || 'Selected'}: <strong>{formData.interests.length}</strong> {formData.interests.length === 1 ? (ob.option || 'option') : (ob.options || 'options')}
            </div>
          </>
        )}

        {/* Step 3: Trip Context */}
        {currentStep === 3 && (
          <>
            <div className="onboarding-heading">
              <div className="heading-icon">📅</div>
              {ob.step3Title || 'Tell us about your trip'}
            </div>

            {/* Type of Stay */}
            <div className="form-section">
              <label className="form-label">{ob.stayType || 'Type of stay'}</label>
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
                  <label htmlFor="pleasure">{ob.pleasure || 'Pleasure'}</label>
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
                  <label htmlFor="business">{ob.business || 'Business'}</label>
                </div>
              </div>
            </div>

            {/* Visit Status */}
            <div className="form-section">
              <label className="form-label">{ob.visitStatus || 'Visit status'}</label>
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
                  <label htmlFor="first-time">{ob.firstTime || 'First time'}</label>
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
                  <label htmlFor="returning">{ob.returning || 'Returning visitor'}</label>
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
                  <label htmlFor="local">{ob.localResident || 'Local resident'}</label>
                </div>
              </div>
            </div>

            {/* Trip Date */}
            <div className="form-section">
              <label className="form-label">{ob.whenVisiting || 'When are you visiting?'}</label>
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
              <label className="form-label">{ob.tripDuration || 'Trip duration'}</label>
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
              <div className="onboarding-heading" style={{ marginBottom: 0 }}>{ob.optional || 'Optional'}</div>
              <a className="skip-link" onClick={goNext}>
                {ob.skip || 'Skip'} <span>→</span>
              </a>
            </div>

            {/* Dietary */}
            <div className="form-section">
              <label className="form-label">{ob.dietaryTitle || 'Any dietary requirements?'}</label>
              <span className="form-sublabel">{ob.selectMultiple || '(Select multiple)'}</span>
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
              <label className="form-label">{ob.accessibilityTitle || 'Accessibility needs?'}</label>
              <span className="form-sublabel">{ob.selectMultiple || '(Select multiple)'}</span>
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
            ? (isEditMode ? (ob.savePreferences || 'Save Preferences →') : (ob.finishExplore || 'Finish & Explore →'))
            : (ob.continue || 'Continue →')}
        </button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
