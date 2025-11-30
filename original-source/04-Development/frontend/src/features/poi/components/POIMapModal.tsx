import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { X, Navigation } from 'lucide-react';
import type { POI } from '../types/poi.types';
import 'leaflet/dist/leaflet.css';

interface POIMapModalProps {
  poi: POI;
  isOpen: boolean;
  onClose: () => void;
}

// Fix Leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * POIMapModal - Modal showing POI location on interactive map
 *
 * Features:
 * - Centered on POI location
 * - Marker with POI name
 * - "Get Directions" button (opens Google/Apple Maps)
 * - Responsive and accessible
 * - ESC key to close
 */
export function POIMapModal({ poi, isOpen, onClose }: POIMapModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  /**
   * Open directions in native maps app
   * - iOS: Apple Maps
   * - Android: Google Maps
   * - Desktop: Google Maps in browser
   */
  const handleGetDirections = () => {
    const { latitude, longitude } = poi;
    const destination = `${latitude},${longitude}`;

    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      // Apple Maps
      window.open(`maps://maps.apple.com/?daddr=${destination}&dirflg=d`, '_blank');
    } else if (isAndroid) {
      // Google Maps (native app on Android)
      window.open(`google.navigation:q=${destination}`, '_blank');
    } else {
      // Google Maps (web)
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: '#1F2937',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {poi.name}
            </h2>
            {poi.address && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: '#6B7280',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {poi.address}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close map"
          >
            <X size={24} color="#6B7280" />
          </button>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>
          <MapContainer
            center={[poi.latitude, poi.longitude]}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[poi.latitude, poi.longitude]}>
              <Popup>
                <strong>{poi.name}</strong>
                {poi.address && <p style={{ margin: '4px 0 0 0' }}>{poi.address}</p>}
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Footer with Get Directions Button */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#6B7280',
              backgroundColor: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.borderColor = '#9CA3AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#D1D5DB';
            }}
          >
            Close
          </button>
          <button
            onClick={handleGetDirections}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#0273ae',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#016193';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0273ae';
            }}
          >
            <Navigation size={16} />
            Get Directions
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
