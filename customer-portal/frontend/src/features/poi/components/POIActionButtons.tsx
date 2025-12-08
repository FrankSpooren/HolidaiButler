/**
 * POIActionButtons - Primary action buttons for POI Detail Page
 *
 * Sprint 7.7: Advanced POI Features
 *
 * Features:
 * - Reservation Button (Primary CTA)
 *   - "Reserve Now" if website available
 *   - "Contact Directly" fallback with phone/email
 *   - Opens in new tab with security attributes
 * - Share Button
 *   - Web Share API for mobile
 *   - Clipboard fallback for desktop
 *   - Success toast notifications
 * - Responsive design
 */

import { useState } from 'react';
import { Share2, ExternalLink, Phone, Mail } from 'lucide-react';
import type { POI } from '../types/poi.types';
import { shareContent, generatePOIShareURL } from '../../../shared/utils/share';

interface POIActionButtonsProps {
  poi: POI;
}

export function POIActionButtons({ poi }: POIActionButtonsProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  /**
   * Show toast notification
   */
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Handle reservation/website button click
   */
  const handleReservation = () => {
    if (poi.website) {
      window.open(poi.website, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * Handle contact directly - opens contact modal or performs action
   */
  const handleContactDirectly = () => {
    if (poi.phone) {
      window.location.href = `tel:${poi.phone.replace(/\s/g, '')}`;
    } else if (poi.email) {
      window.location.href = `mailto:${poi.email}`;
    }
  };

  /**
   * Handle share button click
   */
  const handleShare = async () => {
    const url = generatePOIShareURL(poi.id);
    const result = await shareContent({
      title: poi.name,
      text: poi.description || `Check out ${poi.name} in Calpe!`,
      url
    });

    if (result.success) {
      if (result.method === 'clipboard') {
        showToast('Link copied to clipboard!', 'info');
      } else {
        showToast('Shared successfully!', 'success');
      }
    } else if (result.error !== 'cancelled') {
      showToast('Failed to share', 'info');
    }
  };

  // Determine reservation button config
  const hasWebsite = !!poi.website;
  const hasContact = !!poi.phone || !!poi.email;

  return (
    <>
      <div className="poi-action-buttons-container" style={containerStyle}>
        {/* Reservation/Website Button */}
        {hasWebsite && (
          <button
            onClick={handleReservation}
            className="poi-reservation-btn"
            style={primaryButtonStyle}
            aria-label={`Visit ${poi.name} website`}
          >
            <ExternalLink size={18} />
            <span>Visit Website</span>
          </button>
        )}

        {/* Contact Directly Button (fallback if no website) */}
        {!hasWebsite && hasContact && (
          <button
            onClick={handleContactDirectly}
            className="poi-contact-btn"
            style={primaryButtonStyle}
            aria-label={`Contact ${poi.name}`}
          >
            {poi.phone ? <Phone size={18} /> : <Mail size={18} />}
            <span>Contact Directly</span>
          </button>
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="poi-share-btn"
          style={secondaryButtonStyle}
          aria-label={`Share ${poi.name}`}
        >
          <Share2 size={18} />
          <span>Share</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={toastStyle(toast.type)}>
          {toast.message}
        </div>
      )}

      <style>
        {`
          .poi-reservation-btn:hover,
          .poi-contact-btn:hover {
            background-color: #025a85 !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(2, 115, 174, 0.2);
          }

          .poi-share-btn:hover {
            background-color: #F3F4F6 !important;
            border-color: #9CA3AF !important;
          }

          .poi-action-buttons-container button {
            transition: all 0.2s ease;
          }

          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Mobile responsive */
          @media (max-width: 768px) {
            .poi-action-buttons-container {
              flex-direction: column !important;
              gap: 12px !important;
            }

            .poi-action-buttons-container button {
              width: 100% !important;
            }
          }
        `}
      </style>
    </>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  alignItems: 'center',
  marginTop: '24px'
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '14px 28px',
  backgroundColor: '#0273ae',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: '600',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(2, 115, 174, 0.15)'
};

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '14px 28px',
  backgroundColor: 'white',
  color: '#374151',
  border: '2px solid #E5E7EB',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: '600',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer'
};

const toastStyle = (type: 'success' | 'info'): React.CSSProperties => ({
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  backgroundColor: type === 'success' ? '#10B981' : '#0273ae',
  color: 'white',
  padding: '12px 20px',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  zIndex: 10000,
  animation: 'slideInUp 0.3s ease-out',
  fontFamily: 'Inter, sans-serif',
  fontSize: '14px',
  fontWeight: 500
});
