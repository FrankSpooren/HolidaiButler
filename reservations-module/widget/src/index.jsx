import React from 'react';
import { createRoot } from 'react-dom/client';
import BookingWidget from './BookingWidget';

// Auto-initialize on DOM ready
function init() {
  const containers = document.querySelectorAll('[data-holidaibutler-booking]');

  containers.forEach((container) => {
    const config = {
      restaurantId: container.dataset.restaurantId,
      apiUrl: container.dataset.apiUrl || 'https://api.holidaibutler.com/reservations',
      theme: container.dataset.theme || 'light',
      primaryColor: container.dataset.primaryColor || '#667eea',
      locale: container.dataset.locale || 'en'
    };

    const root = createRoot(container);
    root.render(<BookingWidget {...config} />);
  });
}

// Expose for manual initialization
window.HolidaiButlerBooking = {
  init,
  render: (containerId, config) => {
    const container = document.getElementById(containerId);
    if (container) {
      const root = createRoot(container);
      root.render(<BookingWidget {...config} />);
    }
  }
};

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Also render in the demo container
const demoContainer = document.getElementById('booking-widget');
if (demoContainer) {
  const root = createRoot(demoContainer);
  root.render(
    <BookingWidget
      restaurantId="demo"
      apiUrl="http://localhost:3006/api"
      theme="light"
      primaryColor="#667eea"
    />
  );
}

export { BookingWidget };
export default BookingWidget;
