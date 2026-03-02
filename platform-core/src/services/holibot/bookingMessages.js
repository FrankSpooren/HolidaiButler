/**
 * Booking Response Templates — Fase III Blok D
 *
 * All booking flow messages in 5 languages (NL/EN/DE/ES/FR).
 * FR included for WarreWijzer preparation.
 *
 * Template variables use {variable_name} format, replaced at runtime.
 * GDPR: No PII in any template — personal data collected only on form/payment pages.
 */

// === BOOKING RESPONSE TEMPLATES ===
export const BOOKING_MESSAGES = {

  // === FRIENDLY FALLBACKS ===
  booking_not_available: {
    nl: 'Op dit moment is online boeken nog niet beschikbaar {destination_preposition} {destination_name}. Je kunt contact opnemen via {contact_email} voor hulp bij het boeken.',
    en: 'Online booking is not yet available {destination_preposition} {destination_name}. You can contact us at {contact_email} for booking assistance.',
    de: 'Online-Buchungen sind {destination_preposition} {destination_name} noch nicht verfügbar. Kontaktieren Sie uns unter {contact_email} für Buchungshilfe.',
    es: 'Las reservas en línea aún no están disponibles {destination_preposition} {destination_name}. Puede contactarnos en {contact_email} para ayuda con reservas.',
    fr: 'La réservation en ligne n\'est pas encore disponible {destination_preposition} {destination_name}. Contactez-nous à {contact_email} pour assistance.'
  },

  module_not_available: {
    nl: '{module_name} is momenteel niet beschikbaar {destination_preposition} {destination_name}. Neem contact op via {contact_email}.',
    en: '{module_name} is currently not available {destination_preposition} {destination_name}. Please contact {contact_email}.',
    de: '{module_name} ist derzeit {destination_preposition} {destination_name} nicht verfügbar. Bitte kontaktieren Sie {contact_email}.',
    es: '{module_name} no está disponible actualmente {destination_preposition} {destination_name}. Contacte {contact_email}.',
    fr: '{module_name} n\'est pas disponible actuellement {destination_preposition} {destination_name}. Contactez {contact_email}.'
  },

  // === TICKET FLOW ===
  ticket_poi_select: {
    nl: 'Leuk dat je tickets wilt kopen! Voor welke locatie wil je tickets? Hier zijn enkele opties:',
    en: 'Great that you want to buy tickets! Which location are you interested in? Here are some options:',
    de: 'Toll, dass Sie Tickets kaufen möchten! Für welchen Ort möchten Sie Tickets? Hier sind einige Optionen:',
    es: '¡Genial que quieras comprar entradas! ¿Para qué lugar te interesan? Aquí tienes algunas opciones:',
    fr: 'Super que vous vouliez acheter des billets ! Pour quel endroit souhaitez-vous des billets ?'
  },

  ticket_date_select: {
    nl: 'Voor {poi_name} heb ik de volgende tickets beschikbaar:\n{ticket_list}\n\nVoor welke datum wil je tickets?',
    en: 'For {poi_name} I have the following tickets available:\n{ticket_list}\n\nFor which date would you like tickets?',
    de: 'Für {poi_name} habe ich folgende Tickets:\n{ticket_list}\n\nFür welches Datum möchten Sie Tickets?',
    es: 'Para {poi_name} tengo las siguientes entradas disponibles:\n{ticket_list}\n\n¿Para qué fecha quieres entradas?',
    fr: 'Pour {poi_name} j\'ai les billets suivants disponibles :\n{ticket_list}\n\nPour quelle date souhaitez-vous des billets ?'
  },

  ticket_tier_select: {
    nl: 'Welk type ticket wil je?\n{tier_list}',
    en: 'Which ticket type would you like?\n{tier_list}',
    de: 'Welche Ticketart möchten Sie?\n{tier_list}',
    es: '¿Qué tipo de entrada prefieres?\n{tier_list}',
    fr: 'Quel type de billet souhaitez-vous ?\n{tier_list}'
  },

  ticket_quantity: {
    nl: 'Hoeveel {tier_name} tickets wil je?',
    en: 'How many {tier_name} tickets would you like?',
    de: 'Wie viele {tier_name} Tickets möchten Sie?',
    es: '¿Cuántas entradas {tier_name} quieres?',
    fr: 'Combien de billets {tier_name} souhaitez-vous ?'
  },

  ticket_confirm: {
    nl: 'Prima! Hier is je samenvatting:\n📅 {date}\n🎫 {items}\n💰 Totaal: €{total}\n\nKlopt dit? Dan stuur ik je door naar de betaalpagina.',
    en: 'Great! Here\'s your summary:\n📅 {date}\n🎫 {items}\n💰 Total: €{total}\n\nIs this correct? I\'ll send you to the payment page.',
    de: 'Super! Hier ist Ihre Zusammenfassung:\n📅 {date}\n🎫 {items}\n💰 Gesamt: €{total}\n\nStimmt das? Dann leite ich Sie zur Zahlungsseite weiter.',
    es: '¡Perfecto! Aquí tienes el resumen:\n📅 {date}\n🎫 {items}\n💰 Total: €{total}\n\n¿Es correcto? Te envío a la página de pago.',
    fr: 'Parfait ! Voici votre résumé :\n📅 {date}\n🎫 {items}\n💰 Total : €{total}\n\nEst-ce correct ? Je vous redirige vers la page de paiement.'
  },

  ticket_payment_link: {
    nl: 'Top! Hier is je bestelling klaar:\n👉 [{link_text}]({checkout_url})\n\nJe hebt 15 minuten om de betaling te voltooien.',
    en: 'Great! Your order is ready:\n👉 [{link_text}]({checkout_url})\n\nYou have 15 minutes to complete the payment.',
    de: 'Toll! Ihre Bestellung ist fertig:\n👉 [{link_text}]({checkout_url})\n\nSie haben 15 Minuten, um die Zahlung abzuschließen.',
    es: '¡Genial! Tu pedido está listo:\n👉 [{link_text}]({checkout_url})\n\nTienes 15 minutos para completar el pago.',
    fr: 'Super ! Votre commande est prête :\n👉 [{link_text}]({checkout_url})\n\nVous avez 15 minutes pour effectuer le paiement.'
  },

  // === RESERVATION FLOW ===
  reservation_poi_select: {
    nl: 'Leuk dat je wilt reserveren! Bij welk restaurant of welke locatie wil je een plek boeken?',
    en: 'Great that you want to make a reservation! At which restaurant or location would you like to book?',
    de: 'Toll, dass Sie reservieren möchten! In welchem Restaurant oder an welchem Ort möchten Sie buchen?',
    es: '¡Genial que quieras reservar! ¿En qué restaurante o lugar te gustaría hacer la reserva?',
    fr: 'Super que vous vouliez réserver ! Dans quel restaurant ou à quel endroit souhaitez-vous réserver ?'
  },

  reservation_date_select: {
    nl: 'Voor welke datum wil je reserveren bij {poi_name}?',
    en: 'For which date would you like to reserve at {poi_name}?',
    de: 'Für welches Datum möchten Sie bei {poi_name} reservieren?',
    es: '¿Para qué fecha quieres reservar en {poi_name}?',
    fr: 'Pour quelle date souhaitez-vous réserver à {poi_name} ?'
  },

  reservation_time_select: {
    nl: 'Welke tijd past je? Beschikbare tijdsloten op {date}:\n{slot_list}',
    en: 'What time works for you? Available time slots on {date}:\n{slot_list}',
    de: 'Welche Zeit passt Ihnen? Verfügbare Zeitfenster am {date}:\n{slot_list}',
    es: '¿Qué hora te conviene? Horarios disponibles el {date}:\n{slot_list}',
    fr: 'Quel horaire vous convient ? Créneaux disponibles le {date} :\n{slot_list}'
  },

  reservation_party_size: {
    nl: 'Met hoeveel personen kom je?',
    en: 'How many people will be dining?',
    de: 'Wie viele Personen werden es sein?',
    es: '¿Cuántas personas serán?',
    fr: 'Combien de personnes serez-vous ?'
  },

  reservation_details: {
    nl: 'Heb je speciale wensen? (dieetwensen, allergieën, kinderstoel, etc.) Je kunt ook "nee" zeggen om door te gaan.',
    en: 'Do you have any special requests? (dietary needs, allergies, high chair, etc.) You can also say "no" to continue.',
    de: 'Haben Sie besondere Wünsche? (Ernährung, Allergien, Kinderstuhl, etc.) Sie können auch "nein" sagen.',
    es: '¿Tienes alguna petición especial? (dieta, alergias, silla alta, etc.) También puedes decir "no" para continuar.',
    fr: 'Avez-vous des demandes spéciales ? (régime, allergies, chaise haute, etc.) Vous pouvez aussi dire "non".'
  },

  reservation_confirm: {
    nl: 'Perfect! Hier is je reservering:\n📍 {poi_name}\n📅 {date} om {time}\n👥 {party_size} personen\n{special_requests}\n\nKlopt dit? Dan maak ik de reservering aan.',
    en: 'Perfect! Here\'s your reservation:\n📍 {poi_name}\n📅 {date} at {time}\n👥 {party_size} people\n{special_requests}\n\nIs this correct? I\'ll create the reservation.',
    de: 'Perfekt! Hier ist Ihre Reservierung:\n📍 {poi_name}\n📅 {date} um {time}\n👥 {party_size} Personen\n{special_requests}\n\nStimmt das? Dann erstelle ich die Reservierung.',
    es: '¡Perfecto! Aquí tienes tu reserva:\n📍 {poi_name}\n📅 {date} a las {time}\n👥 {party_size} personas\n{special_requests}\n\n¿Es correcto? Creo la reserva.',
    fr: 'Parfait ! Voici votre réservation :\n📍 {poi_name}\n📅 {date} à {time}\n👥 {party_size} personnes\n{special_requests}\n\nEst-ce correct ? Je crée la réservation.'
  },

  reservation_link: {
    nl: 'Top! Vul je gegevens in om de reservering te bevestigen:\n👉 [{link_text}]({reservation_url})\n\nDe plek is 30 minuten voor je vastgehouden.',
    en: 'Great! Fill in your details to confirm the reservation:\n👉 [{link_text}]({reservation_url})\n\nYour spot is held for 30 minutes.',
    de: 'Toll! Geben Sie Ihre Daten ein, um die Reservierung zu bestätigen:\n👉 [{link_text}]({reservation_url})\n\nIhr Platz ist 30 Minuten reserviert.',
    es: '¡Genial! Completa tus datos para confirmar la reserva:\n👉 [{link_text}]({reservation_url})\n\nTu lugar está reservado por 30 minutos.',
    fr: 'Super ! Remplissez vos coordonnées pour confirmer la réservation :\n👉 [{link_text}]({reservation_url})\n\nVotre place est réservée pendant 30 minutes.'
  },

  // === BOOKING STATUS ===
  booking_status_ask: {
    nl: 'Ik kan je helpen met de status van je boeking. Heb je een bestelnummer (bijv. HB-T-260315-0042) of reserveringsnummer (bijv. HB-R-260315-0001)?',
    en: 'I can help you check your booking status. Do you have an order number (e.g. HB-T-260315-0042) or reservation number (e.g. HB-R-260315-0001)?',
    de: 'Ich kann Ihnen beim Buchungsstatus helfen. Haben Sie eine Bestellnummer (z.B. HB-T-260315-0042) oder Reservierungsnummer (z.B. HB-R-260315-0001)?',
    es: 'Puedo ayudarte a verificar el estado de tu reserva. ¿Tienes un número de pedido (ej. HB-T-260315-0042) o de reserva (ej. HB-R-260315-0001)?',
    fr: 'Je peux vous aider à vérifier le statut de votre réservation. Avez-vous un numéro de commande (ex. HB-T-260315-0042) ou de réservation (ex. HB-R-260315-0001) ?'
  },

  // === ERRORS & EDGE CASES ===
  booking_timeout: {
    nl: 'Je boekingsessie is verlopen (15 minuten). Wil je opnieuw beginnen?',
    en: 'Your booking session has expired (15 minutes). Would you like to start again?',
    de: 'Ihre Buchungssitzung ist abgelaufen (15 Minuten). Möchten Sie neu beginnen?',
    es: 'Tu sesión de reserva ha expirado (15 minutos). ¿Quieres empezar de nuevo?',
    fr: 'Votre session de réservation a expiré (15 minutes). Voulez-vous recommencer ?'
  },

  no_availability: {
    nl: 'Helaas is er geen beschikbaarheid op {date} bij {poi_name}. Wil je een andere datum proberen?',
    en: 'Unfortunately there\'s no availability on {date} at {poi_name}. Would you like to try another date?',
    de: 'Leider gibt es am {date} bei {poi_name} keine Verfügbarkeit. Möchten Sie ein anderes Datum versuchen?',
    es: 'Lamentablemente no hay disponibilidad el {date} en {poi_name}. ¿Quieres probar otra fecha?',
    fr: 'Malheureusement il n\'y a pas de disponibilité le {date} à {poi_name}. Voulez-vous essayer une autre date ?'
  },

  invalid_input: {
    nl: 'Ik heb je niet helemaal begrepen. {hint}',
    en: 'I didn\'t quite understand. {hint}',
    de: 'Das habe ich nicht ganz verstanden. {hint}',
    es: 'No he entendido del todo. {hint}',
    fr: 'Je n\'ai pas bien compris. {hint}'
  },

  cancel_booking_flow: {
    nl: 'Geen probleem! Ik heb de boeking geannuleerd. Waarmee kan ik je nog meer helpen?',
    en: 'No problem! I\'ve cancelled the booking. What else can I help you with?',
    de: 'Kein Problem! Ich habe die Buchung abgebrochen. Wie kann ich Ihnen noch helfen?',
    es: '¡Sin problema! He cancelado la reserva. ¿En qué más puedo ayudarte?',
    fr: 'Pas de problème ! J\'ai annulé la réservation. Comment puis-je encore vous aider ?'
  }
};

// === DESTINATION PREPOSITIONS (conform CLAUDE.md taalregels) ===
export const DESTINATION_PREPOSITIONS = {
  1: { nl: 'in', en: 'in', de: 'in', es: 'en', fr: 'à' },        // Calpe
  2: { nl: 'op', en: 'on', de: 'auf', es: 'en', fr: 'à' },        // Texel
  3: { nl: 'in', en: 'in', de: 'in', es: 'en', fr: 'à' },        // Alicante
  4: { nl: 'bij', en: 'at', de: 'bei', es: 'en', fr: 'chez' },    // WarreWijzer
};

// === MODULE NAME TRANSLATIONS ===
export const MODULE_NAMES = {
  ticketing: {
    nl: 'Ticketverkoop', en: 'Ticket sales', de: 'Ticketverkauf',
    es: 'Venta de entradas', fr: 'Vente de billets'
  },
  reservation: {
    nl: 'Reserveringen', en: 'Reservations', de: 'Reservierungen',
    es: 'Reservas', fr: 'Réservations'
  }
};

// === CONTACT EMAILS PER DESTINATION ===
export const DESTINATION_CONTACTS = {
  1: 'info@holidaibutler.com',      // Calpe
  2: 'info@texelmaps.nl',           // Texel
  3: 'info@holidaibutler.com',      // Alicante
  4: 'info@warrewijzer.be',         // WarreWijzer
};

/**
 * Get a localized booking message with variable substitution.
 * @param {string} key - Message key (e.g. 'booking_not_available')
 * @param {string} language - Language code
 * @param {object} vars - Variables to substitute (e.g. { destination_name: 'Texel' })
 * @returns {string} Formatted message
 */
export function getBookingMessage(key, language, vars = {}) {
  const template = BOOKING_MESSAGES[key];
  if (!template) return '';
  let msg = template[language] || template.en || '';
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), v || '');
  }
  return msg;
}
