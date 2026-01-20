/**
 * AccountDashboard - User account management
 *
 * Route: /account
 * Layout: RootLayout
 * Auth: Protected (requires authentication)
 *
 * Features:
 * - 6-tab navigation (Profile, Preferences, AI, Privacy, Export, Settings)
 * - GDPR compliant (Art. 7, 15, 17, 20)
 * - EU AI Act transparency
 * - Profile management
 * - Privacy controls
 * - Data export
 * - Account deletion flow
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useFavorites } from '../shared/contexts/FavoritesContext';
import { useLanguage } from '../i18n/LanguageContext';
import './AccountDashboard.css';

type TabType = 'profile' | 'preferences' | 'ai' | 'privacy' | 'export' | 'settings';

interface UserPreferences {
  travelCompanion: string | null;
  interests: string[];
  dietary: string[];
}

export default function AccountDashboard() {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load user preferences from localStorage
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return { travelCompanion: 'couple', interests: ['food', 'culture', 'relax'], dietary: ['vegetarian'] };
  });

  const [aiToggles, setAiToggles] = useState({
    personalized: true,
    smartFilters: true,
    behavioralLearning: false,
  });
  const [privacyToggles, setPrivacyToggles] = useState({
    analytics: true,
    personalization: true,
    marketing: false,
  });
  const [notificationToggles, setNotificationToggles] = useState({
    email: true,
    push: false,
  });
  const [exportFormat, setExportFormat] = useState<'json' | 'pdf' | 'both'>('pdf');

  // Reload preferences when returning from onboarding
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('userPreferences');
        if (saved) {
          setUserPreferences(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error reloading preferences:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check on focus (when returning to this tab)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAiSetting = (setting: keyof typeof aiToggles) => {
    setAiToggles(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const togglePrivacySetting = (setting: keyof typeof privacyToggles) => {
    setPrivacyToggles(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const toggleNotification = (setting: keyof typeof notificationToggles) => {
    setNotificationToggles(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result as string);
        // TODO: Upload to backend API
        // const formData = new FormData();
        // formData.append('avatar', file);
        // uploadAvatar(formData);
      };
      reader.readAsDataURL(file);
    }
  };

  const favoritesCount = favorites.size;

  // Helper functions to display preference labels
  const getCompanionLabel = (id: string | null) => {
    const labels: Record<string, string> = {
      couple: t.account.preferences.asCouple,
      family: 'Family',
      solo: 'Solo',
      group: 'Group',
    };
    return id ? labels[id] || id : 'Not set';
  };

  const getInterestLabel = (id: string) => {
    const labels: Record<string, string> = {
      food: t.account.preferences.foodDrinks,
      relax: t.account.preferences.beaches,
      culture: t.account.preferences.culture,
      active: 'Active',
      nature: 'Nature',
      nightlife: 'Nightlife',
      history: 'History',
      shopping: 'Shopping',
    };
    return labels[id] || id;
  };

  const getDietaryLabel = (id: string) => {
    const labels: Record<string, string> = {
      vegetarian: t.account.preferences.vegetarian,
      vegan: 'Vegan',
      'gluten-free': 'Gluten-free',
      halal: 'Halal',
      kosher: 'Kosher',
    };
    return labels[id] || id;
  };

  return (
    <div className="account-container">
      {/* Tab 1: Profile */}
      <div className={`tab-content ${activeTab === 'profile' ? 'active' : ''}`}>
        <div className="profile-card">
          <div className="avatar" onClick={handleAvatarClick} title={t.account.profile.clickAvatarHint}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              '👤'
            )}
            <div className="avatar-overlay">📷 {t.account.profile.changePhoto}</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div className="profile-name">Frank Jansen</div>
          <div className="profile-email">frank@email.com</div>
          <div className="profile-since">{t.account.profile.memberSince}: Oct 27, 2025</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
            💡 {t.account.profile.clickAvatarHint}
          </div>
        </div>

        <div className="section-title">{t.account.profile.quickActions}</div>
        <div className="quick-actions">
          <div className="action-card" onClick={() => switchTab('preferences')}>
            <div className="action-icon">💾</div>
            <div className="action-label">{t.account.profile.savedPOIs}</div>
            <div className="action-value">12</div>
          </div>
          <div className="action-card" onClick={() => navigate('/favorites')}>
            <div className="action-icon">❤️</div>
            <div className="action-label">{t.account.profile.favorites}</div>
            <div className="action-value">{favoritesCount}</div>
          </div>
          <div
            className="action-card"
            onClick={() => alert('📊 Visits Tracking\n\nDeze feature is nog in ontwikkeling.\n\nWat komt er:\n✓ Automatische tracking van bezochte POIs\n✓ Visit history met datums\n✓ Statistieken en insights\n✓ Exporteren van visit data\n\nBack-end monitoring wordt binnenkort toegevoegd!')}
            style={{ opacity: 0.7 }}
          >
            <div className="action-icon">🗺️</div>
            <div className="action-label">{t.account.profile.visits}</div>
            <div className="action-value" style={{ fontSize: '16px' }}>🚧</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>{t.account.profile.comingSoon}</div>
          </div>
          <div className="action-card">
            <div className="action-icon">⭐</div>
            <div className="action-label">{t.account.profile.reviews}</div>
            <div className="action-value">3</div>
          </div>
        </div>
      </div>

      {/* Tab 2: Preferences */}
      <div className={`tab-content ${activeTab === 'preferences' ? 'active' : ''}`}>
        <div className="section-title">{t.account.preferences.title}</div>
        <div className="profile-card">
          <div style={{ textAlign: 'left' }}>
            {/* Traveling As */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                {t.account.preferences.travelingAs}
              </div>
              <div
                className="pill"
                style={{ background: 'linear-gradient(135deg, #4f766b, #608379)', display: 'inline-flex' }}
              >
                {userPreferences.travelCompanion === 'couple' && '💑'}
                {userPreferences.travelCompanion === 'family' && '👨‍👩‍👧‍👦'}
                {userPreferences.travelCompanion === 'solo' && '👤'}
                {userPreferences.travelCompanion === 'group' && '👥'}
                {' '}{getCompanionLabel(userPreferences.travelCompanion)}
              </div>
            </div>

            {/* Interests */}
            {userPreferences.interests.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  {t.account.preferences.interests}
                </div>
                <div className="preference-pills">
                  {userPreferences.interests.map((interest, index) => (
                    <div
                      key={interest}
                      className="pill"
                      style={{
                        background: index % 3 === 0
                          ? 'linear-gradient(135deg, #4f766b, #608379)'
                          : index % 3 === 1
                          ? 'linear-gradient(135deg, #b4942e, #bb9e42)'
                          : 'linear-gradient(135deg, #253444, #3a4856)'
                      }}
                    >
                      {interest === 'food' && '🍴'}
                      {interest === 'relax' && '🏖️'}
                      {interest === 'culture' && '🏛️'}
                      {interest === 'active' && '⚡'}
                      {interest === 'nature' && '🌲'}
                      {interest === 'nightlife' && '🌙'}
                      {interest === 'history' && '🏛️'}
                      {interest === 'shopping' && '🛍️'}
                      {' '}{getInterestLabel(interest)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dietary */}
            {userPreferences.dietary.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  {t.account.preferences.dietary}
                </div>
                <div className="preference-pills">
                  {userPreferences.dietary.map((diet) => (
                    <div key={diet} className="pill" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      🌱 {getDietaryLabel(diet)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button className="primary-button" onClick={() => navigate('/onboarding?mode=edit')}>{t.account.preferences.editButton}</button>
      </div>

      {/* Tab 3: AI Settings */}
      <div className={`tab-content ${activeTab === 'ai' ? 'active' : ''}`}>
        <div className="section-title">💚 {t.account.ai.title}</div>

        <div className="info-box">
          <div className="info-text">
            ℹ️ {t.account.ai.infoText}
          </div>
        </div>

        <div className="section-title">{t.account.ai.features}</div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.ai.personalizedRecs}</div>
            <div className="toggle-desc">{t.account.ai.personalizedRecsDesc}</div>
          </div>
          <div
            className={`toggle-switch ${aiToggles.personalized ? 'on' : ''}`}
            onClick={() => toggleAiSetting('personalized')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.ai.smartFilters}</div>
            <div className="toggle-desc">{t.account.ai.smartFiltersDesc}</div>
          </div>
          <div
            className={`toggle-switch ${aiToggles.smartFilters ? 'on' : ''}`}
            onClick={() => toggleAiSetting('smartFilters')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.ai.behavioralLearning}</div>
            <div className="toggle-desc">{t.account.ai.behavioralLearningDesc}</div>
          </div>
          <div
            className={`toggle-switch ${aiToggles.behavioralLearning ? 'on' : ''}`}
            onClick={() => toggleAiSetting('behavioralLearning')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <button className="secondary-button">ℹ️ {t.account.ai.howItWorks}</button>
      </div>

      {/* Tab 4: Privacy */}
      <div className={`tab-content ${activeTab === 'privacy' ? 'active' : ''}`}>
        <div className="section-title">🔐 {t.account.privacy.title}</div>

        <div className="info-box">
          <div className="info-text">
            ℹ️ {t.account.privacy.subtitle}
          </div>
        </div>

        <div className="section-title" style={{ marginTop: '16px' }}>
          {t.account.privacy.dataCollection}
        </div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.privacy.essentialCookies}</div>
            <div className="toggle-desc">{t.account.privacy.essentialCookiesDesc}</div>
          </div>
          <div
            style={{
              padding: '8px 12px',
              background: '#E5E7EB',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6B7280',
            }}
          >
            {t.account.privacy.required}
          </div>
        </div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.privacy.analytics}</div>
            <div className="toggle-desc">{t.account.privacy.analyticsDesc}</div>
          </div>
          <div
            className={`toggle-switch ${privacyToggles.analytics ? 'on' : ''}`}
            onClick={() => togglePrivacySetting('analytics')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.privacy.personalization}</div>
            <div className="toggle-desc">{t.account.privacy.personalizationDesc}</div>
          </div>
          <div
            className={`toggle-switch ${privacyToggles.personalization ? 'on' : ''}`}
            onClick={() => togglePrivacySetting('personalization')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.privacy.marketing}</div>
            <div className="toggle-desc">{t.account.privacy.marketingDesc}</div>
          </div>
          <div
            className={`toggle-switch ${privacyToggles.marketing ? 'on' : ''}`}
            onClick={() => togglePrivacySetting('marketing')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <button className="primary-button">{t.account.privacy.updateButton}</button>
      </div>

      {/* Tab 5: Export */}
      <div className={`tab-content ${activeTab === 'export' ? 'active' : ''}`}>
        <div className="section-title">📥 {t.account.export.title}</div>

        <div className="info-box">
          <div className="info-text">
            ℹ️ {t.account.export.infoText}
          </div>
        </div>

        <div className="section-title">{t.account.export.whatIncluded}</div>
        <div className="data-export-list">
          <ul>
            <li>✓ {t.account.export.includeList.profile}</li>
            <li>✓ {t.account.export.includeList.preferences}</li>
            <li>✓ {t.account.export.includeList.savedPOIs}</li>
            <li>✓ {t.account.export.includeList.reviews}</li>
            <li>✓ {t.account.export.includeList.visitHistory}</li>
            <li>✓ {t.account.export.includeList.activityLog}</li>
            <li>✓ {t.account.export.includeList.consentSettings}</li>
          </ul>
        </div>

        <div className="section-title">{t.account.export.format}</div>
        <div className="export-format-box">
          <label>
            <input
              type="radio"
              name="format"
              value="json"
              checked={exportFormat === 'json'}
              onChange={() => setExportFormat('json')}
            />
            <span style={{ fontSize: '14px' }}>{t.account.export.formatJSON}</span>
          </label>
          <label>
            <input
              type="radio"
              name="format"
              value="pdf"
              checked={exportFormat === 'pdf'}
              onChange={() => setExportFormat('pdf')}
            />
            <span style={{ fontSize: '14px' }}>{t.account.export.formatPDF}</span>
          </label>
          <label style={{ marginBottom: 0 }}>
            <input
              type="radio"
              name="format"
              value="both"
              checked={exportFormat === 'both'}
              onChange={() => setExportFormat('both')}
            />
            <span style={{ fontSize: '14px' }}>{t.account.export.formatBoth}</span>
          </label>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            alert(
              'Data export requested!\n\nYou will receive an email when your data is ready (typically 2-5 minutes).\n\nDownload link will be valid for 7 days.'
            )
          }
        >
          {t.account.export.requestButton}
        </button>

        <div style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
          ℹ️ {t.account.export.validityNote}
        </div>
      </div>

      {/* Tab 6: Settings */}
      <div className={`tab-content ${activeTab === 'settings' ? 'active' : ''}`}>
        <div className="section-title">{t.account.settings.security}</div>
        <div className="nav-items">
          <div className="nav-item">
            <div className="nav-left">
              <span className="nav-icon">🔑</span>
              <span className="nav-text">{t.account.settings.changePassword}</span>
            </div>
            <span className="nav-arrow">→</span>
          </div>
          <div className="nav-item">
            <div className="nav-left">
              <span className="nav-icon">🔐</span>
              <div>
                <div className="nav-text">{t.account.settings.twoFactor}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>{t.account.settings.twoFactorStatus}</div>
              </div>
            </div>
            <span className="nav-arrow">→</span>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: '16px' }}>
          {t.account.settings.notifications}
        </div>
        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.settings.emailNotifications}</div>
          </div>
          <div
            className={`toggle-switch ${notificationToggles.email ? 'on' : ''}`}
            onClick={() => toggleNotification('email')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <div className="toggle-item">
          <div className="toggle-left">
            <div className="toggle-title">{t.account.settings.pushNotifications}</div>
          </div>
          <div
            className={`toggle-switch ${notificationToggles.push ? 'on' : ''}`}
            onClick={() => toggleNotification('push')}
          >
            <div className="toggle-circle"></div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: '16px', color: '#1F2937' }}>
          {t.account.settings.dangerZone}
        </div>

        {/* Delete Personal Data (Orange) */}
        <div
          className="nav-item"
          style={{ border: '1px solid #FED7AA', background: '#FFF7ED', marginBottom: '10px' }}
          onClick={() =>
            alert(
              'Data deletion flow:\n\n1. Confirmation modal\n2. Explain account remains\n3. Type DELETE DATA to confirm\n4. Delete personal data\n5. Reset to standard settings\n\nAccount remains active.'
            )
          }
        >
          <div className="nav-left">
            <span className="nav-icon">🗑️</span>
            <div>
              <div className="nav-text" style={{ color: '#F97316', fontWeight: 600 }}>
                {t.account.settings.deleteData}
              </div>
              <div style={{ fontSize: '12px', color: '#C2410C' }}>{t.account.settings.deleteDataDesc}</div>
            </div>
          </div>
          <span className="nav-arrow" style={{ color: '#F97316' }}>
            →
          </span>
        </div>

        {/* Delete Account (Red) */}
        <div
          className="nav-item"
          style={{ border: '1px solid #FEE2E2', background: '#FEF2F2' }}
          onClick={() =>
            alert(
              'Account deletion flow:\n\n1. Confirmation modal\n2. Reason survey (optional)\n3. Type DELETE to confirm\n4. 30-day grace period\n5. Permanent deletion\n\nSee wireframe docs for full flow.'
            )
          }
        >
          <div className="nav-left">
            <span className="nav-icon">⚠️</span>
            <div>
              <div className="nav-text" style={{ color: '#DC2626', fontWeight: 600 }}>
                {t.account.settings.deleteAccount}
              </div>
              <div style={{ fontSize: '12px', color: '#B91C1C' }}>{t.account.settings.deleteAccountDesc}</div>
            </div>
          </div>
          <span className="nav-arrow" style={{ color: '#DC2626' }}>
            →
          </span>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => switchTab('profile')}>
          <span className="tab-icon">👤</span>
          <span className="tab-label">{t.account.tabs.profile}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => switchTab('preferences')}
        >
          <span className="tab-icon">🎯</span>
          <span className="tab-label">{t.account.tabs.preferences}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => switchTab('ai')}>
          <span className="tab-icon">💚</span>
          <span className="tab-label">{t.account.tabs.ai}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => switchTab('privacy')}>
          <span className="tab-icon">🔐</span>
          <span className="tab-label">{t.account.tabs.privacy}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => switchTab('export')}>
          <span className="tab-icon">📥</span>
          <span className="tab-label">{t.account.tabs.export}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => switchTab('settings')}
        >
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">{t.account.tabs.settings}</span>
        </button>
      </div>
    </div>
  );
}
