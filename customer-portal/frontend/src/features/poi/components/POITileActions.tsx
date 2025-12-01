import { useState } from 'react';
import { Share2, Calendar, MapPin, Info } from 'lucide-react';
import type { POI } from '../types/poi.types';
import { shareContent, generatePOIShareURL } from '../../../shared/utils/share';
import { addPOIToCalendar } from '../../../shared/utils/calendar';
import { POIMapModal } from './POIMapModal';

interface POITileActionsProps {
  poi: POI;
  /** Callback when Details button is clicked */
  onDetailsClick: () => void;
  /** Translation strings */
  labels: {
    share: string;
    agenda: string;
    map: string;
    details: string;
  };
}

/**
 * POITileActions - Action button bar for POI tiles
 *
 * Features:
 * - Share button (Web Share API + clipboard fallback)
 * - Agenda button (.ics calendar download)
 * - Map button (opens modal with Leaflet map)
 * - Details button (navigates to detail page)
 * - Toast notifications for user feedback
 * - Responsive design
 */
export function POITileActions({ poi, onDetailsClick, labels }: POITileActionsProps) {
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  /**
   * Show toast notification
   */
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Handle share button click
   */
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const url = generatePOIShareURL(poi.id);
    const result = await shareContent({
      title: poi.name,
      text: poi.description || `Check out ${poi.name} in Calpe!`,
      url
    });

    if (result.success) {
      if (result.method === 'clipboard') {
        showToast('Link copied to clipboard!', 'info');
      }
    } else if (result.error !== 'cancelled') {
      showToast('Failed to share', 'info');
    }
  };

  /**
   * Handle agenda button click
   */
  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();

    const url = generatePOIShareURL(poi.id);
    addPOIToCalendar(
      poi.name,
      poi.address,
      poi.description,
      url
    );

    showToast('Calendar event downloaded!', 'success');
  };

  /**
   * Handle map button click
   */
  const handleShowMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMapModalOpen(true);
  };

  /**
   * Handle details button click
   */
  const handleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetailsClick();
  };

  return (
    <>
      <div
        className="poi-tile-actions"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          padding: '8px 12px',
          borderTop: '1px solid #E5E7EB'
        }}
      >
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="action-btn"
          style={actionButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label={labels.share}
          title={labels.share}
        >
          <Share2 size={16} color="#0273ae" />
          <span style={labelStyle}>{labels.share}</span>
        </button>

        {/* Agenda Button */}
        <button
          onClick={handleAddToCalendar}
          className="action-btn"
          style={actionButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label={labels.agenda}
          title={labels.agenda}
        >
          <Calendar size={16} color="#0273ae" />
          <span style={labelStyle}>{labels.agenda}</span>
        </button>

        {/* Map Button */}
        <button
          onClick={handleShowMap}
          className="action-btn"
          style={actionButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label={labels.map}
          title={labels.map}
        >
          <MapPin size={16} color="#0273ae" />
          <span style={labelStyle}>{labels.map}</span>
        </button>

        {/* Details Button */}
        <button
          onClick={handleDetails}
          className="action-btn"
          style={actionButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label={labels.details}
          title={labels.details}
        >
          <Info size={16} color="#0273ae" />
          <span style={labelStyle}>{labels.details}</span>
        </button>
      </div>

      {/* Map Modal */}
      <POIMapModal
        poi={poi}
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.type === 'success' ? '#10B981' : '#0273ae',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            animation: 'slideInUp 0.3s ease-out',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {toast.message}
        </div>
      )}

      <style>
        {`
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

          @media (max-width: 640px) {
            .poi-tile-actions {
              gap: 4px !important;
            }

            .action-btn span {
              font-size: 11px !important;
            }
          }
        `}
      </style>
    </>
  );
}

// Shared styles
const actionButtonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  padding: '6px 4px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  fontFamily: 'Inter, sans-serif'
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: '#4B5563',
  lineHeight: 1.2,
  textAlign: 'center'
};
