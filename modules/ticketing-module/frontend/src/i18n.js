import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  nl: {
    translation: {
      common: {
        loading: 'Laden...',
        error: 'Er is een fout opgetreden',
        save: 'Opslaan',
        cancel: 'Annuleren',
        continue: 'Doorgaan',
        back: 'Terug',
        confirm: 'Bevestigen',
        total: 'Totaal',
        currency: '€',
      },
      events: {
        title: 'Kies een evenement',
        noEvents: 'Geen evenementen beschikbaar',
        searchPlaceholder: 'Zoek evenementen...',
        selectDate: 'Selecteer datum',
        availableTickets: 'Beschikbare tickets',
      },
      tickets: {
        selectTickets: 'Selecteer tickets',
        ticketType: 'Ticket type',
        price: 'Prijs',
        quantity: 'Aantal',
        available: 'beschikbaar',
        soldOut: 'Uitverkocht',
        subtotal: 'Subtotaal',
        fees: 'Servicekosten',
        vat: 'BTW',
      },
      visitor: {
        title: 'Bezoekersinformatie',
        firstName: 'Voornaam',
        lastName: 'Achternaam',
        email: 'E-mailadres',
        phone: 'Telefoonnummer',
        required: 'Dit veld is verplicht',
        invalidEmail: 'Ongeldig e-mailadres',
      },
      payment: {
        title: 'Betaling',
        selectMethod: 'Selecteer betaalmethode',
        processing: 'Betaling verwerken...',
        failed: 'Betaling mislukt',
        success: 'Betaling geslaagd',
        secure: 'Veilige betaling via Adyen',
      },
      booking: {
        confirmation: 'Bevestiging',
        reference: 'Referentie',
        orderSummary: 'Bestelling overzicht',
        downloadTickets: 'Download tickets',
        emailSent: 'Een bevestigingsmail is verstuurd',
        thankYou: 'Bedankt voor uw bestelling!',
      },
    },
  },
  en: {
    translation: {
      common: {
        loading: 'Loading...',
        error: 'An error occurred',
        save: 'Save',
        cancel: 'Cancel',
        continue: 'Continue',
        back: 'Back',
        confirm: 'Confirm',
        total: 'Total',
        currency: '€',
      },
      events: {
        title: 'Choose an event',
        noEvents: 'No events available',
        searchPlaceholder: 'Search events...',
        selectDate: 'Select date',
        availableTickets: 'Available tickets',
      },
      tickets: {
        selectTickets: 'Select tickets',
        ticketType: 'Ticket type',
        price: 'Price',
        quantity: 'Quantity',
        available: 'available',
        soldOut: 'Sold out',
        subtotal: 'Subtotal',
        fees: 'Service fees',
        vat: 'VAT',
      },
      visitor: {
        title: 'Visitor information',
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email address',
        phone: 'Phone number',
        required: 'This field is required',
        invalidEmail: 'Invalid email address',
      },
      payment: {
        title: 'Payment',
        selectMethod: 'Select payment method',
        processing: 'Processing payment...',
        failed: 'Payment failed',
        success: 'Payment successful',
        secure: 'Secure payment via Adyen',
      },
      booking: {
        confirmation: 'Confirmation',
        reference: 'Reference',
        orderSummary: 'Order summary',
        downloadTickets: 'Download tickets',
        emailSent: 'A confirmation email has been sent',
        thankYou: 'Thank you for your order!',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'nl',
  fallbackLng: 'nl',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
