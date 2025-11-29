import React, { useState, useEffect } from 'react';

const STYLES = {
  widget: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '100%',
    margin: '0 auto'
  },
  header: {
    padding: '24px',
    textAlign: 'center',
    borderBottom: '1px solid #eee'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#333'
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#666'
  },
  form: {
    padding: '24px'
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px'
  },
  step: (active, completed, primaryColor) => ({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: completed || active ? primaryColor : '#e0e0e0',
    color: completed || active ? 'white' : '#666',
    transition: 'all 0.3s'
  }),
  fieldGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none'
  },
  row: {
    display: 'flex',
    gap: '16px'
  },
  col: {
    flex: 1
  },
  timeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginTop: '8px'
  },
  timeSlot: (selected, available, primaryColor) => ({
    padding: '10px 8px',
    fontSize: '14px',
    fontWeight: '500',
    border: selected ? `2px solid ${primaryColor}` : '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: selected ? `${primaryColor}15` : 'white',
    color: available ? (selected ? primaryColor : '#333') : '#ccc',
    cursor: available ? 'pointer' : 'not-allowed',
    textAlign: 'center',
    transition: 'all 0.2s'
  }),
  button: (primaryColor, variant = 'primary', disabled = false) => ({
    width: variant === 'primary' ? '100%' : 'auto',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    border: variant === 'secondary' ? `1px solid ${primaryColor}` : 'none',
    borderRadius: '8px',
    backgroundColor: disabled ? '#ccc' : (variant === 'primary' ? primaryColor : 'white'),
    color: disabled ? '#666' : (variant === 'primary' ? 'white' : primaryColor),
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s'
  }),
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px'
  },
  confirmation: {
    textAlign: 'center',
    padding: '40px 24px'
  },
  confirmIcon: (primaryColor) => ({
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: `${primaryColor}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    fontSize: '40px'
  }),
  summary: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '24px',
    textAlign: 'left'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee'
  },
  summaryLabel: {
    color: '#666',
    fontSize: '14px'
  },
  summaryValue: {
    fontWeight: '500',
    color: '#333',
    fontSize: '14px'
  },
  error: {
    backgroundColor: '#fee',
    color: '#c00',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#666'
  }
};

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 12; hour <= 21; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 21) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

export default function BookingWidget({
  restaurantId,
  apiUrl = 'http://localhost:3006/api',
  theme = 'light',
  primaryColor = '#667eea',
  locale = 'en'
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    partySize: 2,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: ''
  });

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (restaurantId && restaurantId !== 'demo') {
      fetchRestaurant();
    }
  }, [restaurantId]);

  useEffect(() => {
    if (formData.date && formData.partySize) {
      fetchAvailability();
    }
  }, [formData.date, formData.partySize]);

  const fetchRestaurant = async () => {
    try {
      const response = await fetch(`${apiUrl}/restaurants/${restaurantId}`);
      const data = await response.json();
      if (data.success) {
        setRestaurant(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch restaurant:', err);
    }
  };

  const fetchAvailability = async () => {
    if (restaurantId === 'demo') {
      // Demo mode - all slots available
      setAvailableSlots(timeSlots);
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/availability/${restaurantId}/slots?date=${formData.date}&party_size=${formData.partySize}`
      );
      const data = await response.json();
      if (data.success) {
        setAvailableSlots(data.data.available_slots || []);
      }
    } catch (err) {
      console.error('Failed to fetch availability:', err);
      setAvailableSlots(timeSlots); // Fallback to all slots
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleTimeSelect = (time) => {
    if (availableSlots.includes(time)) {
      setFormData(prev => ({ ...prev, time }));
    }
  };

  const validateStep1 = () => {
    if (!formData.date) return 'Please select a date';
    if (!formData.time) return 'Please select a time';
    if (formData.partySize < 1) return 'Party size must be at least 1';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.firstName.trim()) return 'Please enter your first name';
    if (!formData.lastName.trim()) return 'Please enter your last name';
    if (!formData.email.trim()) return 'Please enter your email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email';
    if (!formData.phone.trim()) return 'Please enter your phone number';
    return null;
  };

  const handleNext = () => {
    const validationError = step === 1 ? validateStep1() : validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (restaurantId === 'demo') {
        // Demo mode - simulate success
        await new Promise(resolve => setTimeout(resolve, 1000));
        setConfirmationData({
          reference: 'DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          ...formData
        });
        setBookingComplete(true);
        setLoading(false);
        return;
      }

      const response = await fetch(`${apiUrl}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          reservation_date: formData.date,
          reservation_time: formData.time,
          party_size: formData.partySize,
          guest: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone
          },
          special_requests: formData.specialRequests
        })
      });

      const data = await response.json();

      if (data.success) {
        setConfirmationData({
          reference: data.data.reservation_reference,
          ...formData
        });
        setBookingComplete(true);
      } else {
        setError(data.message || 'Failed to create reservation');
      }
    } catch (err) {
      setError('Failed to submit reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (bookingComplete) {
    return (
      <div style={STYLES.widget}>
        <div style={STYLES.confirmation}>
          <div style={STYLES.confirmIcon(primaryColor)}>
            &#10003;
          </div>
          <h2 style={{ margin: '0 0 8px', color: '#333' }}>Reservation Confirmed!</h2>
          <p style={{ margin: '0 0 24px', color: '#666' }}>
            Your booking reference is:
          </p>
          <p style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: primaryColor,
            fontFamily: 'monospace',
            letterSpacing: '2px'
          }}>
            {confirmationData.reference}
          </p>

          <div style={STYLES.summary}>
            <div style={STYLES.summaryRow}>
              <span style={STYLES.summaryLabel}>Date</span>
              <span style={STYLES.summaryValue}>{formatDate(confirmationData.date)}</span>
            </div>
            <div style={STYLES.summaryRow}>
              <span style={STYLES.summaryLabel}>Time</span>
              <span style={STYLES.summaryValue}>{confirmationData.time}</span>
            </div>
            <div style={STYLES.summaryRow}>
              <span style={STYLES.summaryLabel}>Party Size</span>
              <span style={STYLES.summaryValue}>{confirmationData.partySize} guests</span>
            </div>
            <div style={{ ...STYLES.summaryRow, borderBottom: 'none' }}>
              <span style={STYLES.summaryLabel}>Guest</span>
              <span style={STYLES.summaryValue}>
                {confirmationData.firstName} {confirmationData.lastName}
              </span>
            </div>
          </div>

          <p style={{ marginTop: '24px', fontSize: '14px', color: '#666' }}>
            A confirmation email has been sent to {confirmationData.email}
          </p>

          <button
            style={STYLES.button(primaryColor, 'secondary')}
            onClick={() => {
              setBookingComplete(false);
              setStep(1);
              setFormData({
                date: new Date().toISOString().split('T')[0],
                time: '',
                partySize: 2,
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                specialRequests: ''
              });
            }}
          >
            Make Another Reservation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={STYLES.widget}>
      <div style={STYLES.header}>
        <h2 style={STYLES.title}>
          {restaurant?.name || 'Book a Table'}
        </h2>
        <p style={STYLES.subtitle}>
          {restaurant?.cuisine_type || 'Reserve your dining experience'}
        </p>
      </div>

      <div style={STYLES.form}>
        {/* Step Indicator */}
        <div style={STYLES.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={STYLES.step(step === s, step > s, primaryColor)}>
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>

        {error && <div style={STYLES.error}>{error}</div>}

        {/* Step 1: Date, Time, Party Size */}
        {step === 1 && (
          <>
            <div style={STYLES.row}>
              <div style={STYLES.col}>
                <div style={STYLES.fieldGroup}>
                  <label style={STYLES.label}>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    style={STYLES.input}
                  />
                </div>
              </div>
              <div style={STYLES.col}>
                <div style={STYLES.fieldGroup}>
                  <label style={STYLES.label}>Party Size</label>
                  <select
                    name="partySize"
                    value={formData.partySize}
                    onChange={handleInputChange}
                    style={STYLES.select}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={STYLES.fieldGroup}>
              <label style={STYLES.label}>Select Time</label>
              <div style={STYLES.timeGrid}>
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleTimeSelect(slot)}
                    style={STYLES.timeSlot(
                      formData.time === slot,
                      availableSlots.includes(slot),
                      primaryColor
                    )}
                    disabled={!availableSlots.includes(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              style={STYLES.button(primaryColor, 'primary', !formData.time)}
              disabled={!formData.time}
            >
              Continue
            </button>
          </>
        )}

        {/* Step 2: Guest Details */}
        {step === 2 && (
          <>
            <div style={STYLES.row}>
              <div style={STYLES.col}>
                <div style={STYLES.fieldGroup}>
                  <label style={STYLES.label}>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    style={STYLES.input}
                  />
                </div>
              </div>
              <div style={STYLES.col}>
                <div style={STYLES.fieldGroup}>
                  <label style={STYLES.label}>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    style={STYLES.input}
                  />
                </div>
              </div>
            </div>

            <div style={STYLES.fieldGroup}>
              <label style={STYLES.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@example.com"
                style={STYLES.input}
              />
            </div>

            <div style={STYLES.fieldGroup}>
              <label style={STYLES.label}>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+31 6 12345678"
                style={STYLES.input}
              />
            </div>

            <div style={STYLES.fieldGroup}>
              <label style={STYLES.label}>Special Requests (optional)</label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                placeholder="Allergies, dietary requirements, celebrations..."
                rows={3}
                style={{ ...STYLES.input, resize: 'vertical' }}
              />
            </div>

            <div style={STYLES.buttonGroup}>
              <button
                type="button"
                onClick={handleBack}
                style={STYLES.button(primaryColor, 'secondary')}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{ ...STYLES.button(primaryColor), flex: 1 }}
              >
                Review Booking
              </button>
            </div>
          </>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <>
            <div style={STYLES.summary}>
              <div style={STYLES.summaryRow}>
                <span style={STYLES.summaryLabel}>Date</span>
                <span style={STYLES.summaryValue}>{formatDate(formData.date)}</span>
              </div>
              <div style={STYLES.summaryRow}>
                <span style={STYLES.summaryLabel}>Time</span>
                <span style={STYLES.summaryValue}>{formData.time}</span>
              </div>
              <div style={STYLES.summaryRow}>
                <span style={STYLES.summaryLabel}>Party Size</span>
                <span style={STYLES.summaryValue}>{formData.partySize} guests</span>
              </div>
              <div style={STYLES.summaryRow}>
                <span style={STYLES.summaryLabel}>Name</span>
                <span style={STYLES.summaryValue}>
                  {formData.firstName} {formData.lastName}
                </span>
              </div>
              <div style={STYLES.summaryRow}>
                <span style={STYLES.summaryLabel}>Email</span>
                <span style={STYLES.summaryValue}>{formData.email}</span>
              </div>
              <div style={STYLES.summaryRow}>
                <span style={STYLES.summaryLabel}>Phone</span>
                <span style={STYLES.summaryValue}>{formData.phone}</span>
              </div>
              {formData.specialRequests && (
                <div style={{ ...STYLES.summaryRow, borderBottom: 'none' }}>
                  <span style={STYLES.summaryLabel}>Special Requests</span>
                  <span style={STYLES.summaryValue}>{formData.specialRequests}</span>
                </div>
              )}
            </div>

            <p style={{ fontSize: '14px', color: '#666', marginTop: '16px' }}>
              By confirming, you agree to receive a confirmation email and SMS reminder.
            </p>

            <div style={STYLES.buttonGroup}>
              <button
                type="button"
                onClick={handleBack}
                style={STYLES.button(primaryColor, 'secondary')}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                style={{ ...STYLES.button(primaryColor, 'primary', loading), flex: 1 }}
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Reservation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
