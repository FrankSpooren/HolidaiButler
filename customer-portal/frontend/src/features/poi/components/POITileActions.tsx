import { useState } from 'react';
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
 * Updated to match Agenda Card styling with emoji icons
 */
export function POITileActions({ poi, onDetailsClick, labels }: POITileActionsProps) {
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generatePOIShareURL(poi.id);
    const result = await shareContent({
      title: poi.name,
      text: poi.description || `Check out ${poi.name} in Calpe!`,
      url
    });
    if (result.success && result.method === 'clipboard') {
      showToast('Link copied to clipboard!', 'info');
    } else if (!result.success && result.error !== 'cancelled') {
      showToast('Failed to share', 'info');
    }
  };

  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generatePOIShareURL(poi.id);
    addPOIToCalendar(poi.name, poi.address, poi.description, url);
    showToast('Calendar event downloaded!', 'success');
  };

  const handleShowMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMapModalOpen(true);
  };

  const handleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetailsClick();
  };

  return (
    <>
      {/* Action Buttons - EMOJI ICONS matching Agenda Card */}
      <div className="poi-actions">
        <button className="poi-action-btn" title={labels.share} onClick={handleShare}>
          <span>↗️</span>
          <span>{labels.share}</span>
        </button>
        <button className="poi-action-btn" title={labels.agenda} onClick={handleAddToCalendar}>
          <span>📅</span>
          <span>{labels.agenda}</span>
        </button>
        <button className="poi-action-btn" title={labels.map} onClick={handleShowMap}>
          <span>📍</span>
          <span>{labels.map}</span>
        </button>
        <button className="poi-action-btn poi-action-primary" title={labels.details} onClick={handleDetails}>
          <span>ℹ️</span>
          <span>{labels.details}</span>
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
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
