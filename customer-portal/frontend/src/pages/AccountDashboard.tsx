/**
 * AccountDashboard - User account management
 *
 * Route: /account
 * Layout: RootLayout
 * Auth: Protected (requires authentication)
 *
 * Features:
 * - 8-tab navigation (Profiel, Instellingen, Privacy, Favorieten, Bezochte, Reviews, AI, Export)
 * - GDPR compliant (Art. 7, 15, 17, 20)
 * - EU AI Act transparency
 * - Profile management with integrated preferences
 * - Privacy controls
 * - Favorites & Visited tracking
 * - Reviews management
 * - Data export
 * - Account deletion flow
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { authService } from '../features/auth/services/authService';
import { useFavorites } from '../shared/contexts/FavoritesContext';
import { useAgendaFavorites } from '../shared/contexts/AgendaFavoritesContext';
import { useVisited } from '../shared/contexts/VisitedContext';
import { useUserReviews, type UserReview } from '../shared/contexts/UserReviewsContext';
import { useLanguage } from '../i18n/LanguageContext';
import { usePOIsByIds } from '../features/poi/hooks/usePOIs';
import { useEventsByIds, getEventTitle, getEventImage } from '../features/agenda/hooks/useEvents';
import { AgendaDetailModal } from '../features/agenda/components/AgendaDetailModal';
import { POIDetailModal } from '../features/poi/components/POIDetailModal';
import {
  ChangePasswordModal,
  TwoFactorSetupModal,
  DeleteDataModal,
  DeleteAccountModal,
  ReviewEditModal,
} from '../features/account/components';
import './AccountDashboard.css';

type TabType = 'profiel' | 'instellingen' | 'privacy' | 'favorieten' | 'bezochte' | 'reviews' | 'ai' | 'export';

interface UserPreferences {
  travelCompanion: string | null;
  interests: string[];
  dietary: string[];
  accessibility: string[];
}

export default function AccountDashboard() {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { agendaFavorites } = useAgendaFavorites();
  const { visitedPOIs, visitedEvents, getVisitedPOIIds, getVisitedEventIds } = useVisited();
  const { reviews, isLoading: loadingReviews, updateReview, deleteReview, totalReviewsCount } = useUserReviews();
  const { t, language } = useLanguage();

  // Get IDs for data fetching
  const favoritePoiIds = useMemo(() => Array.from(favorites || []), [favorites]);
  const favoriteEventIds = useMemo(() => Array.from(agendaFavorites || []), [agendaFavorites]);
  const visitedPoiIds = useMemo(() => getVisitedPOIIds(), [visitedPOIs]);
  const visitedEventIds = useMemo(() => getVisitedEventIds(), [visitedEvents]);

  // Fetch actual POI and Event data
  const { data: favoritePOIs, isLoading: loadingFavPOIs } = usePOIsByIds(favoritePoiIds.slice(0, 10));
  const { data: favoriteEvents, isLoading: loadingFavEvents } = useEventsByIds(favoriteEventIds.slice(0, 10));
  const { data: visitedPOIData, isLoading: loadingVisPOIs } = usePOIsByIds(visitedPoiIds.slice(0, 10));
  const { data: visitedEventData, isLoading: loadingVisEvents } = useEventsByIds(visitedEventIds.slice(0, 10));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profiel');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('userAvatar');
    } catch (error) {
      console.error('Error loading avatar:', error);
      return null;
    }
  });

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || 'Naam invoeren',
          email: parsed.email || 'email@voorbeeld.nl',
          registrationDate: parsed.registrationDate || '27 oktober 2025',
        };
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    return {
      name: 'Naam invoeren',
      email: 'email@voorbeeld.nl',
      registrationDate: '27 oktober 2025',
    };
  });
  const [editedProfile, setEditedProfile] = useState({ ...profileData });

  // Address state (optional NAW) - load from localStorage
  const [showAddress, setShowAddress] = useState(false);
  const [addressData, setAddressData] = useState(() => {
    try {
      const saved = localStorage.getItem('userAddress');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          street: parsed.street || '',
          postalCode: parsed.postalCode || '',
          city: parsed.city || '',
        };
      }
    } catch (error) {
      console.error('Error loading address:', error);
    }
    return { street: '', postalCode: '', city: '' };
  });

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
    return { travelCompanion: 'couple', interests: ['food', 'culture', 'relax'], dietary: ['vegetarian'], accessibility: [] };
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

  // Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(() => {
    try {
      return localStorage.getItem('user2FAEnabled') === 'true';
    } catch {
      return false;
    }
  });
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(null);

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

  // Profile editing handlers
  const handleEditProfile = () => {
    setEditedProfile({ ...profileData });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    setProfileData({ ...editedProfile });
    setIsEditing(false);
    setShowAddress(false);
    // Save profile data to localStorage
    try {
      localStorage.setItem('userProfile', JSON.stringify(editedProfile));
    } catch (error) {
      console.error('Error saving profile:', error);
    }
    // Save address to localStorage
    if (addressData.street || addressData.postalCode || addressData.city) {
      localStorage.setItem('userAddress', JSON.stringify(addressData));
    }
    // TODO: Save to backend
  };

  const handleCancelEdit = () => {
    setEditedProfile({ ...profileData });
    setIsEditing(false);
    setShowAddress(false);
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

      // Create preview URL and save to localStorage
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAvatarUrl(dataUrl);
        // Save to localStorage for persistence
        try {
          localStorage.setItem('userAvatar', dataUrl);
        } catch (error) {
          console.error('Error saving avatar:', error);
        }
        // TODO: Upload to backend API
        // const formData = new FormData();
        // formData.append('avatar', file);
        // uploadAvatar(formData);
      };
      reader.readAsDataURL(file);
    }
  };

  const favoritesCount = (favorites?.size || 0) + (agendaFavorites?.size || 0);

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

  const getAccessibilityLabel = (id: string) => {
    const labels: Record<string, string> = {
      wheelchair: 'Rolstoelvriendelijk',
      'visual-impaired': 'Visueel beperkt',
      'hearing-impaired': 'Auditief beperkt',
      'reduced-mobility': 'Beperkte mobiliteit',
      stroller: 'Kinderwagen',
    };
    return labels[id] || id;
  };

  // Modal handlers
  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    // TODO: Implement API call
    console.log('Changing password...', { currentPassword, newPassword });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    // For now, just close the modal on success
    // In production, this would call: await api.put('/users/me/password', { currentPassword, newPassword });
  };

  const handleEnable2FA = async (verificationCode: string) => {
    // TODO: Implement API call
    console.log('Enabling 2FA with code:', verificationCode);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIs2FAEnabled(true);
    // Save to localStorage
    localStorage.setItem('user2FAEnabled', 'true');
    // Return mock backup codes
    return {
      backupCodes: [
        'ABCD-1234-EFGH',
        'IJKL-5678-MNOP',
        'QRST-9012-UVWX',
        'YZ12-3456-7890',
        'BCDE-FGHI-JKLM',
        'NOPQ-RSTU-VWXY',
      ],
    };
  };

  const handleDisable2FA = async () => {
    // TODO: Implement API call
    console.log('Disabling 2FA...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIs2FAEnabled(false);
    // Save to localStorage
    localStorage.setItem('user2FAEnabled', 'false');
  };

  const handleDeleteData = async () => {
    // TODO: Implement API call
    console.log('Deleting personal data...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Reset to default state
    setProfileData({
      name: '',
      email: profileData.email,
      registrationDate: profileData.registrationDate,
    });
    setAddressData({ street: '', postalCode: '', city: '' });
    setUserPreferences({ travelCompanion: null, interests: [], dietary: [] });
    localStorage.removeItem('userPreferences');
  };

  const handleDeleteAccount = async (reason?: string) => {
    // TODO: Implement API call
    console.log('Scheduling account deletion...', reason ? `Reason: ${reason}` : '');
    await new Promise(resolve => setTimeout(resolve, 1500));
    // In production, this would schedule the account for deletion
    // and send a confirmation email
  };

  return (
    <div className="account-container">
      {/* Tab Bar - At top for desktop, fixed bottom for mobile */}
      <div className="tab-bar">
        <div className="tab-bar-scroll">
          {/* Reordered: Profiel, Favorieten, Bezocht, Reviews, Instellingen, Privacy, Export, AI */}
          <button className={`tab-btn ${activeTab === 'profiel' ? 'active' : ''}`} onClick={() => switchTab('profiel')}>
            <span className="tab-icon">👤</span>
            <span className="tab-label">{t.account.tabs.profile}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'favorieten' ? 'active' : ''}`} onClick={() => switchTab('favorieten')}>
            <span className="tab-icon">❤️</span>
            <span className="tab-label">{t.account.tabs.favorites}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'bezochte' ? 'active' : ''}`} onClick={() => switchTab('bezochte')}>
            <span className="tab-icon">🗺️</span>
            <span className="tab-label">{t.account.tabs.visited}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => switchTab('reviews')}>
            <span className="tab-icon">⭐</span>
            <span className="tab-label">{t.account.tabs.reviews}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'instellingen' ? 'active' : ''}`} onClick={() => switchTab('instellingen')}>
            <span className="tab-icon">⚙️</span>
            <span className="tab-label">{t.account.tabs.settings}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => switchTab('privacy')}>
            <span className="tab-icon">🔐</span>
            <span className="tab-label">{t.account.tabs.privacy}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => switchTab('export')}>
            <span className="tab-icon">📥</span>
            <span className="tab-label">{t.account.tabs.export}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => switchTab('ai')}>
            <span className="tab-icon">🤖</span>
            <span className="tab-label">{t.account.tabs.ai}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Profiel (Profile + Preferences combined) */}
      <div className={`tab-content ${activeTab === 'profiel' ? 'active' : ''}`}>
        {/* Profile Card with Integrated Personal Details */}
        <div className="profile-card card-with-edit">
          {/* Edit button top-right */}
          {!isEditing && (
            <button className="card-edit-btn" onClick={handleEditProfile} title="Bewerken">✏️</button>
          )}

          <div className="profile-header">
            {/* Avatar */}
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
              <div className="avatar-overlay">
                <span>📷</span>
                <span>{t.account.profile.changePhoto}</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Profile Info */}
            <div className="profile-info">
              {isEditing ? (
                <>
                  <div className="profile-field" style={{ border: 'none', padding: '0 0 8px 0' }}>
                    <input
                      type="text"
                      className="field-input"
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      placeholder="Naam"
                    />
                  </div>
                  <div className="profile-field" style={{ border: 'none', padding: '0 0 8px 0' }}>
                    <input
                      type="email"
                      className="field-input"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                      placeholder="E-mail"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="profile-name-row">
                    <span className="profile-name">{profileData.name}</span>
                  </div>
                  <div className="profile-email-row">
                    <span className="profile-email">{profileData.email}</span>
                  </div>
                  {/* Display NAW data when available */}
                  {(addressData.street || addressData.city) && (
                    <div className="profile-address">
                      {addressData.street && <span>{addressData.street}</span>}
                      {addressData.postalCode && addressData.city && (
                        <span>{addressData.postalCode}, {addressData.city}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Butler fan since - centered at bottom */}
          {!isEditing && (
            <div className="butler-fan-since-centered">
              <span className="butler-fan-icon">🎩</span>
              <span>{t.account.profile.butlerFanSince}: <strong>{profileData.registrationDate}</strong></span>
            </div>
          )}

          {/* Editable Address Section (optional NAW) */}
          {isEditing && (
            <div className="profile-fields">
              {!showAddress ? (
                <button className="add-address-btn" onClick={() => setShowAddress(true)}>
                  <span>➕</span>
                  <span>Adres toevoegen (optioneel)</span>
                </button>
              ) : (
                <div className="address-fields">
                  <div className="address-field">
                    <label>Straat + huisnummer</label>
                    <input
                      type="text"
                      value={addressData.street}
                      onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                      placeholder="Bijv. Hoofdstraat 123"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="address-field" style={{ flex: '0 0 120px' }}>
                      <label>Postcode</label>
                      <input
                        type="text"
                        value={addressData.postalCode}
                        onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                        placeholder="1234 AB"
                      />
                    </div>
                    <div className="address-field" style={{ flex: 1 }}>
                      <label>Plaats</label>
                      <input
                        type="text"
                        value={addressData.city}
                        onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                        placeholder="Amsterdam"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="profile-actions">
                <button className="btn-cancel" onClick={handleCancelEdit}>Annuleren</button>
                <button className="btn-save" onClick={handleSaveProfile}>Opslaan</button>
              </div>
            </div>
          )}
        </div>

        {/* Preferences Section */}
        <div className="section-title">{t.account.preferences.title}</div>
        <div className="profile-card preferences-card card-with-edit">
          {/* Edit button top-right */}
          <button className="card-edit-btn" onClick={() => navigate('/onboarding?mode=edit')} title="Bewerk voorkeuren">✏️</button>

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
              <div style={{ marginBottom: '16px' }}>
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

            {/* Accessibility */}
            {userPreferences.accessibility && userPreferences.accessibility.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  Toegankelijkheid
                </div>
                <div className="preference-pills">
                  {userPreferences.accessibility.map((access) => (
                    <div key={access} className="pill" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                      ♿ {getAccessibilityLabel(access)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab 2: Instellingen (Settings) */}
      <div className={`tab-content ${activeTab === 'instellingen' ? 'active' : ''}`}>
        <div className="section-title">{t.account.settings.security}</div>
        <div className="nav-items">
          <div className="nav-item" onClick={() => setShowPasswordModal(true)}>
            <div className="nav-left">
              <span className="nav-icon">🔑</span>
              <span className="nav-text">{t.account.settings.changePassword}</span>
            </div>
            <span className="nav-arrow">→</span>
          </div>
          <div className="nav-item" onClick={() => setShowTwoFactorModal(true)}>
            <div className="nav-left">
              <span className="nav-icon">🔐</span>
              <div>
                <div className="nav-text">{t.account.settings.twoFactor}</div>
                <div style={{ fontSize: '12px', color: is2FAEnabled ? '#10B981' : '#6B7280' }}>
                  {is2FAEnabled ? '✓ Actief' : t.account.settings.twoFactorStatus}
                </div>
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

        {/* Logout Section */}
        <div className="section-title" style={{ marginTop: '24px' }}>
          Sessie
        </div>
        <div
          className="nav-item logout-item"
          onClick={() => {
            // Use authService to properly logout (clears tokens, auth store, and redirects)
            authService.logout();
          }}
        >
          <div className="nav-left">
            <span className="nav-icon">🚪</span>
            <div>
              <div className="nav-text">Uitloggen</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Beëindig je huidige sessie</div>
            </div>
          </div>
          <span className="nav-arrow">→</span>
        </div>

        <div className="section-title" style={{ marginTop: '24px', color: '#1F2937' }}>
          {t.account.settings.dangerZone}
        </div>

        {/* Delete Personal Data (Orange) */}
        <div
          className="nav-item"
          style={{ border: '1px solid #FED7AA', background: '#FFF7ED', marginBottom: '10px' }}
          onClick={() => setShowDeleteDataModal(true)}
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
          onClick={() => setShowDeleteAccountModal(true)}
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

      {/* Tab 3: Privacy */}
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

      {/* Tab 4: Favorieten */}
      <div className={`tab-content ${activeTab === 'favorieten' ? 'active' : ''}`}>
        <div className="section-title">❤️ {t.account.favorites.title}</div>

        <div className="info-box">
          <div className="info-text">
            ℹ️ {t.account.favorites.infoText}
          </div>
        </div>

        {/* POI Favorites */}
        <div className="section-title" style={{ marginTop: '16px' }}>
          📍 {t.account.favorites.poiTitle} ({favorites?.size || 0})
        </div>
        {loadingFavPOIs ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Laden...</span>
          </div>
        ) : favorites && favorites.size > 0 ? (
          <div className="favorites-list">
            {favoritePOIs.slice(0, 5).map((poi) => (
              <div key={poi.id} className="favorite-list-item" onClick={() => setSelectedPoiId(poi.id)}>
                <div className="favorite-item-left">
                  {poi.thumbnail_url ? (
                    <img src={poi.thumbnail_url} alt={poi.name} className="favorite-item-image" />
                  ) : (
                    <span className="favorite-item-icon">📍</span>
                  )}
                  <div className="favorite-item-info">
                    <div className="favorite-item-title">{poi.name}</div>
                    <div className="favorite-item-subtitle">
                      {poi.city || 'Costa Blanca'} • {poi.category}
                    </div>
                    {poi.rating && (
                      <div className="favorite-item-rating">
                        ⭐ {poi.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="nav-arrow">→</span>
              </div>
            ))}
            {favorites.size > 5 && (
              <button className="secondary-button" onClick={() => navigate('/favorites')}>
                {t.account.favorites.viewAll} {favorites.size} POIs →
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💔</div>
            <div className="empty-state-text">{t.account.favorites.emptyPois}</div>
            <button className="secondary-button" onClick={() => navigate('/explore')}>
              {t.account.favorites.discoverPois}
            </button>
          </div>
        )}

        {/* Event Favorites */}
        <div className="section-title" style={{ marginTop: '24px' }}>
          🎉 {t.account.favorites.eventsTitle} ({agendaFavorites?.size || 0})
        </div>
        {loadingFavEvents ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Laden...</span>
          </div>
        ) : agendaFavorites && agendaFavorites.size > 0 ? (
          <div className="favorites-list">
            {favoriteEvents.slice(0, 5).map((event) => (
              <div key={event._id} className="favorite-list-item" onClick={() => setSelectedEventId(event._id)}>
                <div className="favorite-item-left">
                  {getEventImage(event) ? (
                    <img src={getEventImage(event)} alt={getEventTitle(event, language)} className="favorite-item-image" />
                  ) : (
                    <span className="favorite-item-icon">🎉</span>
                  )}
                  <div className="favorite-item-info">
                    <div className="favorite-item-title">{getEventTitle(event, language)}</div>
                    <div className="favorite-item-subtitle">
                      {event.location?.name || 'Costa Blanca'} • {new Date(event.startDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </div>
                    {event.pricing && (
                      <div className="favorite-item-price">
                        {event.pricing.isFree ? '🎟️ Gratis' : `€${event.pricing.minPrice}`}
                      </div>
                    )}
                  </div>
                </div>
                <span className="nav-arrow">→</span>
              </div>
            ))}
            {agendaFavorites.size > 5 && (
              <button className="secondary-button" onClick={() => navigate('/agenda')}>
                {t.account.favorites.viewAll} {agendaFavorites.size} Events →
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-text">{t.account.favorites.emptyEvents}</div>
            <button className="secondary-button" onClick={() => navigate('/agenda')}>
              {t.account.favorites.viewAgenda}
            </button>
          </div>
        )}
      </div>

      {/* Tab 5: Bezochte */}
      <div className={`tab-content ${activeTab === 'bezochte' ? 'active' : ''}`}>
        <div className="section-title">🗺️ {t.account.visited.title}</div>

        <div className="info-box">
          <div className="info-text">
            ℹ️ {t.account.visited.infoText}
          </div>
        </div>

        {/* Visited POIs */}
        <div className="section-title" style={{ marginTop: '16px' }}>
          📍 {t.account.visited.poisTitle} ({visitedPOIs.size})
        </div>
        {loadingVisPOIs ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Laden...</span>
          </div>
        ) : visitedPOIs.size > 0 ? (
          <div className="favorites-list">
            {visitedPOIData.slice(0, 5).map((poi) => {
              const visitDate = visitedPOIs.get(poi.id);
              return (
                <div key={poi.id} className="favorite-list-item" onClick={() => setSelectedPoiId(poi.id)}>
                  <div className="favorite-item-left">
                    {poi.thumbnail_url ? (
                      <img src={poi.thumbnail_url} alt={poi.name} className="favorite-item-image" />
                    ) : (
                      <span className="favorite-item-icon">📍</span>
                    )}
                    <div className="favorite-item-info">
                      <div className="favorite-item-title">{poi.name}</div>
                      <div className="favorite-item-subtitle">
                        {poi.city || 'Costa Blanca'} • {poi.category}
                      </div>
                      {visitDate && (
                        <div className="favorite-item-date">
                          🕐 {new Date(visitDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="nav-arrow">→</span>
                </div>
              );
            })}
            {visitedPOIs.size > 5 && (
              <button className="secondary-button" onClick={() => navigate('/visited')}>
                {t.account.favorites.viewAll} {visitedPOIs.size} POIs →
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <div className="empty-state-text">
              {t.account.visited.emptyPois}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
              {t.account.visited.trackingInfo}
            </div>
            <button className="secondary-button" onClick={() => navigate('/explore')}>
              {t.account.favorites.discoverPois}
            </button>
          </div>
        )}

        {/* Visited Events */}
        <div className="section-title" style={{ marginTop: '24px' }}>
          🎉 {t.account.visited.eventsTitle} ({visitedEvents.size})
        </div>
        {loadingVisEvents ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Laden...</span>
          </div>
        ) : visitedEvents.size > 0 ? (
          <div className="favorites-list">
            {visitedEventData.slice(0, 5).map((event) => {
              const visitDate = visitedEvents.get(event._id);
              return (
                <div key={event._id} className="favorite-list-item" onClick={() => setSelectedEventId(event._id)}>
                  <div className="favorite-item-left">
                    {getEventImage(event) ? (
                      <img src={getEventImage(event)} alt={getEventTitle(event, language)} className="favorite-item-image" />
                    ) : (
                      <span className="favorite-item-icon">🎉</span>
                    )}
                    <div className="favorite-item-info">
                      <div className="favorite-item-title">{getEventTitle(event, language)}</div>
                      <div className="favorite-item-subtitle">
                        {event.location?.name || 'Costa Blanca'}
                      </div>
                      {visitDate && (
                        <div className="favorite-item-date">
                          🕐 {new Date(visitDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="nav-arrow">→</span>
                </div>
              );
            })}
            {visitedEvents.size > 5 && (
              <button className="secondary-button" onClick={() => navigate('/agenda')}>
                {t.account.favorites.viewAll} {visitedEvents.size} Events →
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-text">
              {t.account.visited.emptyEvents}
            </div>
            <button className="secondary-button" onClick={() => navigate('/agenda')}>
              {t.account.favorites.viewAgenda}
            </button>
          </div>
        )}
      </div>

      {/* Tab 6: Reviews */}
      <div className={`tab-content ${activeTab === 'reviews' ? 'active' : ''}`}>
        <div className="section-title">⭐ {t.account.reviews.title} ({totalReviewsCount})</div>

        <div className="info-box">
          <div className="info-text">
            ℹ️ {t.account.reviews.infoText}
          </div>
        </div>

        {loadingReviews ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Laden...</span>
          </div>
        ) : reviews.length > 0 ? (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-card-header">
                  <div className="review-target-info">
                    {review.targetImage ? (
                      <img src={review.targetImage} alt={review.targetName} className="review-target-image" />
                    ) : (
                      <div className="review-target-placeholder">
                        {review.type === 'poi' ? '📍' : '🎉'}
                      </div>
                    )}
                    <div className="review-target-details">
                      <div className="review-target-name">{review.targetName}</div>
                      <div className="review-target-category">{review.targetCategory}</div>
                    </div>
                  </div>
                  <div className="review-actions">
                    <button
                      className="review-edit-btn"
                      onClick={() => setEditingReview(review)}
                      title="Bewerken"
                    >
                      ✏️
                    </button>
                    <button
                      className="review-delete-btn"
                      onClick={() => {
                        if (window.confirm('Weet je zeker dat je deze review wilt verwijderen?')) {
                          deleteReview(review.id);
                        }
                      }}
                      title="Verwijderen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="review-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= review.rating ? 'star-filled' : 'star-empty'}>
                      ★
                    </span>
                  ))}
                  <span className="review-date">
                    {new Date(review.visitDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <p className="review-text">{review.reviewText}</p>
                <div className="review-meta">
                  <span className="review-written-date">
                    Geschreven op {new Date(review.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {review.updatedAt !== review.createdAt && ' (bewerkt)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '24px' }}>
            <div className="empty-state-icon">✍️</div>
            <div className="empty-state-text">
              {t.account.reviews.empty}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
              {t.account.reviews.emptyHint}
            </div>
            <button className="secondary-button" onClick={() => navigate('/explore')}>
              {t.account.reviews.discoverToReview}
            </button>
          </div>
        )}
      </div>

      {/* Tab 7: AI Settings */}
      <div className={`tab-content ${activeTab === 'ai' ? 'active' : ''}`}>
        <div className="section-title">🤖 {t.account.ai.title}</div>

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

      {/* Tab 8: Export */}
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

      {/* Modals */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleChangePassword}
      />

      <TwoFactorSetupModal
        isOpen={showTwoFactorModal}
        onClose={() => setShowTwoFactorModal(false)}
        onEnable={handleEnable2FA}
        onDisable={handleDisable2FA}
        isEnabled={is2FAEnabled}
        qrCodeUrl="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/HolidaiButler:frank@email.com?secret=JBSWY3DPEHPK3PXP&issuer=HolidaiButler"
        secretKey="JBSWY 3DPE HPK3 PXP"
      />

      <DeleteDataModal
        isOpen={showDeleteDataModal}
        onClose={() => setShowDeleteDataModal(false)}
        onConfirm={handleDeleteData}
      />

      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        userEmail={profileData.email}
      />

      <ReviewEditModal
        isOpen={!!editingReview}
        review={editingReview}
        onClose={() => setEditingReview(null)}
        onSave={(id, updates) => {
          updateReview(id, updates);
          setEditingReview(null);
        }}
      />

      {/* Event Detail Modal */}
      {selectedEventId && (
        <AgendaDetailModal
          eventId={selectedEventId}
          isOpen={!!selectedEventId}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {/* POI Detail Modal */}
      {selectedPoiId && (
        <POIDetailModal
          poiId={selectedPoiId}
          isOpen={!!selectedPoiId}
          onClose={() => setSelectedPoiId(null)}
        />
      )}
    </div>
  );
}
