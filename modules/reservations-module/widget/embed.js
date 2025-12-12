/**
 * HolidaiButler Booking Widget - Embed Script
 *
 * Usage:
 * 1. Add a container element with data attributes:
 *    <div
 *      id="booking-widget"
 *      data-holidaibutler-booking
 *      data-restaurant-id="YOUR_RESTAURANT_ID"
 *      data-api-url="https://api.holidaibutler.com/reservations"
 *      data-primary-color="#667eea"
 *      data-theme="light"
 *      data-locale="en"
 *    ></div>
 *
 * 2. Include this script:
 *    <script src="https://cdn.holidaibutler.com/booking-widget.js"></script>
 *
 * Or load dynamically:
 *    window.HolidaiButlerBooking.render('booking-widget', {
 *      restaurantId: 'YOUR_RESTAURANT_ID',
 *      apiUrl: 'https://api.holidaibutler.com/reservations',
 *      primaryColor: '#667eea'
 *    });
 */

(function() {
  'use strict';

  const WIDGET_VERSION = '1.0.0';
  const CDN_BASE = 'https://cdn.holidaibutler.com/booking-widget';

  // Check if already loaded
  if (window.HolidaiButlerBookingLoaded) {
    return;
  }
  window.HolidaiButlerBookingLoaded = true;

  // Load the React widget bundle
  function loadWidget() {
    const script = document.createElement('script');
    script.src = `${CDN_BASE}/booking-widget.umd.js?v=${WIDGET_VERSION}`;
    script.async = true;
    script.onload = function() {
      if (window.HolidaiButlerBooking && window.HolidaiButlerBooking.init) {
        window.HolidaiButlerBooking.init();
      }
    };
    document.head.appendChild(script);
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget);
  } else {
    loadWidget();
  }
})();
