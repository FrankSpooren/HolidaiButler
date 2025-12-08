import { createContext, useContext, useState, useEffect } from 'react';

// All translations for the Admin Module
const translations = {
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      pois: 'POIs',
      events: 'Events',
      tickets: 'Tickets',
      reservations: 'Reservations',
      restaurants: 'Restaurants',
      bookings: 'Bookings',
      transactions: 'Transactions',
      users: 'Users',
      analytics: 'Analytics',
      agenda: 'Agenda',
      platform: 'Platform',
      settings: 'Settings',
      profile: 'Profile',
      logout: 'Logout'
    },
    // Common actions
    actions: {
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      search: 'Search',
      filter: 'Filter',
      refresh: 'Refresh',
      export: 'Export',
      import: 'Import',
      view: 'View',
      create: 'Create',
      update: 'Update',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      reset: 'Reset',
      close: 'Close',
      clear: 'Clear'
    },
    // Common labels
    labels: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      country: 'Country',
      status: 'Status',
      date: 'Date',
      time: 'Time',
      price: 'Price',
      total: 'Total',
      description: 'Description',
      category: 'Category',
      type: 'Type',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      completed: 'Completed',
      all: 'All',
      yes: 'Yes',
      no: 'No',
      loading: 'Loading...',
      noData: 'No data found',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information'
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome back',
      overview: 'Overview',
      recentActivity: 'Recent Activity',
      quickStats: 'Quick Stats',
      totalPois: 'Total POIs',
      totalUsers: 'Total Users',
      totalBookings: 'Total Bookings',
      totalRevenue: 'Total Revenue',
      todayBookings: "Today's Bookings",
      pendingReservations: 'Pending Reservations'
    },
    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'Configure your application preferences',
      language: 'Language & Region',
      languageDesc: 'Select your preferred language',
      notifications: 'Notifications',
      notificationsDesc: 'Manage notification preferences',
      emailNotifications: 'Email Notifications',
      emailNotificationsDesc: 'Receive updates via email',
      pushNotifications: 'Push Notifications',
      pushNotificationsDesc: 'Browser push notifications',
      bookingAlerts: 'Booking Alerts',
      bookingAlertsDesc: 'Alerts for new reservations',
      appearance: 'Appearance',
      appearanceDesc: 'Customize the look and feel',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Use dark theme',
      compactMode: 'Compact Mode',
      compactModeDesc: 'Reduce spacing in lists',
      save: 'Save Settings',
      reset: 'Reset to Default',
      saved: 'Settings saved successfully',
      resetted: 'Settings reset to default'
    },
    // Users
    users: {
      title: 'User Management',
      addUser: 'Add User',
      editUser: 'Edit User',
      firstName: 'First Name',
      lastName: 'Last Name',
      role: 'Role',
      lastLogin: 'Last Login',
      createdAt: 'Created At'
    },
    // POIs
    pois: {
      title: 'POI Management',
      addPoi: 'Add POI',
      editPoi: 'Edit POI',
      location: 'Location',
      rating: 'Rating',
      views: 'Views'
    },
    // Events
    events: {
      title: 'Event Management',
      addEvent: 'Add Event',
      editEvent: 'Edit Event',
      startDate: 'Start Date',
      endDate: 'End Date',
      venue: 'Venue',
      capacity: 'Capacity',
      ticketsSold: 'Tickets Sold'
    },
    // Reservations
    reservations: {
      title: 'Reservations',
      newReservation: 'New Reservation',
      guest: 'Guest',
      restaurant: 'Restaurant',
      partySize: 'Party Size',
      table: 'Table',
      seated: 'Seated',
      noShow: 'No Show'
    },
    // Profile
    profile: {
      title: 'Profile',
      subtitle: 'Manage your account information',
      personalInfo: 'Personal Information',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password'
    },
    // Tickets
    tickets: {
      title: 'Ticket Management',
      addTicket: 'Add Ticket',
      editTicket: 'Edit Ticket',
      event: 'Event',
      quantity: 'Quantity',
      buyer: 'Buyer',
      ticketType: 'Ticket Type',
      purchaseDate: 'Purchase Date',
      validUntil: 'Valid Until'
    },
    // Bookings
    bookings: {
      title: 'Bookings',
      addBooking: 'Add Booking',
      editBooking: 'Edit Booking',
      customer: 'Customer',
      service: 'Service',
      bookingDate: 'Booking Date',
      amount: 'Amount',
      paymentStatus: 'Payment Status',
      paid: 'Paid',
      unpaid: 'Unpaid',
      refunded: 'Refunded'
    },
    // Transactions
    transactions: {
      title: 'Transactions',
      transactionId: 'Transaction ID',
      method: 'Payment Method',
      gateway: 'Gateway',
      reference: 'Reference',
      creditCard: 'Credit Card',
      bankTransfer: 'Bank Transfer',
      paypal: 'PayPal',
      ideal: 'iDEAL',
      cash: 'Cash'
    },
    // Analytics
    analytics: {
      title: 'Analytics',
      subtitle: 'Monitor your business performance',
      overview: 'Overview',
      revenue: 'Revenue',
      visitors: 'Visitors',
      conversions: 'Conversions',
      bookingsChart: 'Bookings Over Time',
      revenueChart: 'Revenue Over Time',
      topPois: 'Top POIs',
      period: 'Period',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      thisYear: 'This Year',
      custom: 'Custom Range'
    },
    // Platform
    platform: {
      title: 'Platform Settings',
      subtitle: 'Manage platform configuration',
      general: 'General Settings',
      integrations: 'Integrations',
      apiKeys: 'API Keys',
      webhooks: 'Webhooks',
      maintenance: 'Maintenance Mode',
      backups: 'Backups'
    },
    // Table columns
    table: {
      id: 'ID',
      actions: 'Actions',
      createdAt: 'Created',
      updatedAt: 'Updated',
      noResults: 'No results found',
      rowsPerPage: 'Rows per page',
      of: 'of',
      showing: 'Showing',
      results: 'results'
    }
  },
  nl: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      pois: "POI's",
      events: 'Evenementen',
      tickets: 'Tickets',
      reservations: 'Reserveringen',
      restaurants: 'Restaurants',
      bookings: 'Boekingen',
      transactions: 'Transacties',
      users: 'Gebruikers',
      analytics: 'Analyses',
      agenda: 'Agenda',
      platform: 'Platform',
      settings: 'Instellingen',
      profile: 'Profiel',
      logout: 'Uitloggen'
    },
    // Common actions
    actions: {
      add: 'Toevoegen',
      edit: 'Bewerken',
      delete: 'Verwijderen',
      save: 'Opslaan',
      cancel: 'Annuleren',
      search: 'Zoeken',
      filter: 'Filteren',
      refresh: 'Vernieuwen',
      export: 'Exporteren',
      import: 'Importeren',
      view: 'Bekijken',
      create: 'Aanmaken',
      update: 'Bijwerken',
      confirm: 'Bevestigen',
      back: 'Terug',
      next: 'Volgende',
      submit: 'Verzenden',
      reset: 'Herstellen',
      close: 'Sluiten',
      clear: 'Wissen'
    },
    // Common labels
    labels: {
      name: 'Naam',
      email: 'E-mail',
      phone: 'Telefoon',
      address: 'Adres',
      city: 'Stad',
      country: 'Land',
      status: 'Status',
      date: 'Datum',
      time: 'Tijd',
      price: 'Prijs',
      total: 'Totaal',
      description: 'Beschrijving',
      category: 'Categorie',
      type: 'Type',
      active: 'Actief',
      inactive: 'Inactief',
      pending: 'In afwachting',
      confirmed: 'Bevestigd',
      cancelled: 'Geannuleerd',
      completed: 'Voltooid',
      all: 'Alle',
      yes: 'Ja',
      no: 'Nee',
      loading: 'Laden...',
      noData: 'Geen gegevens gevonden',
      error: 'Fout',
      success: 'Succes',
      warning: 'Waarschuwing',
      info: 'Informatie'
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welkom terug',
      overview: 'Overzicht',
      recentActivity: 'Recente Activiteit',
      quickStats: 'Snelle Statistieken',
      totalPois: "Totaal POI's",
      totalUsers: 'Totaal Gebruikers',
      totalBookings: 'Totaal Boekingen',
      totalRevenue: 'Totale Omzet',
      todayBookings: 'Boekingen Vandaag',
      pendingReservations: 'Openstaande Reserveringen'
    },
    // Settings
    settings: {
      title: 'Instellingen',
      subtitle: 'Configureer uw applicatievoorkeuren',
      language: 'Taal & Regio',
      languageDesc: 'Selecteer uw voorkeurstaal',
      notifications: 'Meldingen',
      notificationsDesc: 'Beheer meldingsvoorkeuren',
      emailNotifications: 'E-mailmeldingen',
      emailNotificationsDesc: 'Ontvang updates via e-mail',
      pushNotifications: 'Push Meldingen',
      pushNotificationsDesc: 'Browser pushmeldingen',
      bookingAlerts: 'Boekingswaarschuwingen',
      bookingAlertsDesc: 'Waarschuwingen voor nieuwe reserveringen',
      appearance: 'Weergave',
      appearanceDesc: 'Pas het uiterlijk aan',
      darkMode: 'Donkere Modus',
      darkModeDesc: 'Gebruik donker thema',
      compactMode: 'Compacte Modus',
      compactModeDesc: 'Verminder ruimte in lijsten',
      save: 'Instellingen Opslaan',
      reset: 'Standaardwaarden Herstellen',
      saved: 'Instellingen succesvol opgeslagen',
      resetted: 'Instellingen hersteld naar standaard'
    },
    // Users
    users: {
      title: 'Gebruikersbeheer',
      addUser: 'Gebruiker Toevoegen',
      editUser: 'Gebruiker Bewerken',
      firstName: 'Voornaam',
      lastName: 'Achternaam',
      role: 'Rol',
      lastLogin: 'Laatste Login',
      createdAt: 'Aangemaakt Op'
    },
    // POIs
    pois: {
      title: 'POI Beheer',
      addPoi: 'POI Toevoegen',
      editPoi: 'POI Bewerken',
      location: 'Locatie',
      rating: 'Beoordeling',
      views: 'Weergaven'
    },
    // Events
    events: {
      title: 'Evenementenbeheer',
      addEvent: 'Evenement Toevoegen',
      editEvent: 'Evenement Bewerken',
      startDate: 'Startdatum',
      endDate: 'Einddatum',
      venue: 'Locatie',
      capacity: 'Capaciteit',
      ticketsSold: 'Verkochte Tickets'
    },
    // Reservations
    reservations: {
      title: 'Reserveringen',
      newReservation: 'Nieuwe Reservering',
      guest: 'Gast',
      restaurant: 'Restaurant',
      partySize: 'Aantal Personen',
      table: 'Tafel',
      seated: 'Gezeten',
      noShow: 'Niet Verschenen'
    },
    // Profile
    profile: {
      title: 'Profiel',
      subtitle: 'Beheer uw accountgegevens',
      personalInfo: 'Persoonlijke Informatie',
      changePassword: 'Wachtwoord Wijzigen',
      currentPassword: 'Huidig Wachtwoord',
      newPassword: 'Nieuw Wachtwoord',
      confirmPassword: 'Bevestig Wachtwoord'
    },
    // Tickets
    tickets: {
      title: 'Ticketbeheer',
      addTicket: 'Ticket Toevoegen',
      editTicket: 'Ticket Bewerken',
      event: 'Evenement',
      quantity: 'Aantal',
      buyer: 'Koper',
      ticketType: 'Tickettype',
      purchaseDate: 'Aankoopdatum',
      validUntil: 'Geldig Tot'
    },
    // Bookings
    bookings: {
      title: 'Boekingen',
      addBooking: 'Boeking Toevoegen',
      editBooking: 'Boeking Bewerken',
      customer: 'Klant',
      service: 'Dienst',
      bookingDate: 'Boekingsdatum',
      amount: 'Bedrag',
      paymentStatus: 'Betaalstatus',
      paid: 'Betaald',
      unpaid: 'Onbetaald',
      refunded: 'Terugbetaald'
    },
    // Transactions
    transactions: {
      title: 'Transacties',
      transactionId: 'Transactie ID',
      method: 'Betaalmethode',
      gateway: 'Gateway',
      reference: 'Referentie',
      creditCard: 'Creditcard',
      bankTransfer: 'Bankoverschrijving',
      paypal: 'PayPal',
      ideal: 'iDEAL',
      cash: 'Contant'
    },
    // Analytics
    analytics: {
      title: 'Analyses',
      subtitle: 'Monitor uw bedrijfsprestaties',
      overview: 'Overzicht',
      revenue: 'Omzet',
      visitors: 'Bezoekers',
      conversions: 'Conversies',
      bookingsChart: 'Boekingen in de Tijd',
      revenueChart: 'Omzet in de Tijd',
      topPois: "Top POI's",
      period: 'Periode',
      today: 'Vandaag',
      thisWeek: 'Deze Week',
      thisMonth: 'Deze Maand',
      thisYear: 'Dit Jaar',
      custom: 'Aangepast'
    },
    // Platform
    platform: {
      title: 'Platform Instellingen',
      subtitle: 'Beheer platformconfiguratie',
      general: 'Algemene Instellingen',
      integrations: 'Integraties',
      apiKeys: 'API Sleutels',
      webhooks: 'Webhooks',
      maintenance: 'Onderhoudsmodus',
      backups: 'Back-ups'
    },
    // Table columns
    table: {
      id: 'ID',
      actions: 'Acties',
      createdAt: 'Aangemaakt',
      updatedAt: 'Bijgewerkt',
      noResults: 'Geen resultaten gevonden',
      rowsPerPage: 'Rijen per pagina',
      of: 'van',
      showing: 'Tonen',
      results: 'resultaten'
    }
  },
  es: {
    // Navigation
    nav: {
      dashboard: 'Panel',
      pois: 'POIs',
      events: 'Eventos',
      tickets: 'Entradas',
      reservations: 'Reservas',
      restaurants: 'Restaurantes',
      bookings: 'Reservas',
      transactions: 'Transacciones',
      users: 'Usuarios',
      analytics: 'Analíticas',
      agenda: 'Agenda',
      platform: 'Plataforma',
      settings: 'Configuración',
      profile: 'Perfil',
      logout: 'Cerrar Sesión'
    },
    // Common actions
    actions: {
      add: 'Añadir',
      edit: 'Editar',
      delete: 'Eliminar',
      save: 'Guardar',
      cancel: 'Cancelar',
      search: 'Buscar',
      filter: 'Filtrar',
      refresh: 'Actualizar',
      export: 'Exportar',
      import: 'Importar',
      view: 'Ver',
      create: 'Crear',
      update: 'Actualizar',
      confirm: 'Confirmar',
      back: 'Atrás',
      next: 'Siguiente',
      submit: 'Enviar',
      reset: 'Restablecer',
      close: 'Cerrar',
      clear: 'Limpiar'
    },
    // Common labels
    labels: {
      name: 'Nombre',
      email: 'Correo',
      phone: 'Teléfono',
      address: 'Dirección',
      city: 'Ciudad',
      country: 'País',
      status: 'Estado',
      date: 'Fecha',
      time: 'Hora',
      price: 'Precio',
      total: 'Total',
      description: 'Descripción',
      category: 'Categoría',
      type: 'Tipo',
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      completed: 'Completado',
      all: 'Todos',
      yes: 'Sí',
      no: 'No',
      loading: 'Cargando...',
      noData: 'No se encontraron datos',
      error: 'Error',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información'
    },
    // Dashboard
    dashboard: {
      title: 'Panel',
      welcome: 'Bienvenido de nuevo',
      overview: 'Resumen',
      recentActivity: 'Actividad Reciente',
      quickStats: 'Estadísticas Rápidas',
      totalPois: 'Total POIs',
      totalUsers: 'Total Usuarios',
      totalBookings: 'Total Reservas',
      totalRevenue: 'Ingresos Totales',
      todayBookings: 'Reservas de Hoy',
      pendingReservations: 'Reservas Pendientes'
    },
    // Settings
    settings: {
      title: 'Configuración',
      subtitle: 'Configure sus preferencias de aplicación',
      language: 'Idioma y Región',
      languageDesc: 'Seleccione su idioma preferido',
      notifications: 'Notificaciones',
      notificationsDesc: 'Gestione las preferencias de notificación',
      emailNotifications: 'Notificaciones por Email',
      emailNotificationsDesc: 'Recibir actualizaciones por email',
      pushNotifications: 'Notificaciones Push',
      pushNotificationsDesc: 'Notificaciones del navegador',
      bookingAlerts: 'Alertas de Reservas',
      bookingAlertsDesc: 'Alertas para nuevas reservas',
      appearance: 'Apariencia',
      appearanceDesc: 'Personalice el aspecto visual',
      darkMode: 'Modo Oscuro',
      darkModeDesc: 'Usar tema oscuro',
      compactMode: 'Modo Compacto',
      compactModeDesc: 'Reducir espaciado en listas',
      save: 'Guardar Configuración',
      reset: 'Restablecer por Defecto',
      saved: 'Configuración guardada correctamente',
      resetted: 'Configuración restablecida'
    },
    // Users
    users: {
      title: 'Gestión de Usuarios',
      addUser: 'Añadir Usuario',
      editUser: 'Editar Usuario',
      firstName: 'Nombre',
      lastName: 'Apellido',
      role: 'Rol',
      lastLogin: 'Último Acceso',
      createdAt: 'Creado El'
    },
    // POIs
    pois: {
      title: 'Gestión de POIs',
      addPoi: 'Añadir POI',
      editPoi: 'Editar POI',
      location: 'Ubicación',
      rating: 'Valoración',
      views: 'Vistas'
    },
    // Events
    events: {
      title: 'Gestión de Eventos',
      addEvent: 'Añadir Evento',
      editEvent: 'Editar Evento',
      startDate: 'Fecha de Inicio',
      endDate: 'Fecha de Fin',
      venue: 'Lugar',
      capacity: 'Capacidad',
      ticketsSold: 'Entradas Vendidas'
    },
    // Reservations
    reservations: {
      title: 'Reservas',
      newReservation: 'Nueva Reserva',
      guest: 'Huésped',
      restaurant: 'Restaurante',
      partySize: 'Número de Personas',
      table: 'Mesa',
      seated: 'Sentado',
      noShow: 'No Presentado'
    },
    // Profile
    profile: {
      title: 'Perfil',
      subtitle: 'Gestione la información de su cuenta',
      personalInfo: 'Información Personal',
      changePassword: 'Cambiar Contraseña',
      currentPassword: 'Contraseña Actual',
      newPassword: 'Nueva Contraseña',
      confirmPassword: 'Confirmar Contraseña'
    },
    // Tickets
    tickets: {
      title: 'Gestión de Entradas',
      addTicket: 'Añadir Entrada',
      editTicket: 'Editar Entrada',
      event: 'Evento',
      quantity: 'Cantidad',
      buyer: 'Comprador',
      ticketType: 'Tipo de Entrada',
      purchaseDate: 'Fecha de Compra',
      validUntil: 'Válido Hasta'
    },
    // Bookings
    bookings: {
      title: 'Reservas',
      addBooking: 'Añadir Reserva',
      editBooking: 'Editar Reserva',
      customer: 'Cliente',
      service: 'Servicio',
      bookingDate: 'Fecha de Reserva',
      amount: 'Importe',
      paymentStatus: 'Estado del Pago',
      paid: 'Pagado',
      unpaid: 'Sin Pagar',
      refunded: 'Reembolsado'
    },
    // Transactions
    transactions: {
      title: 'Transacciones',
      transactionId: 'ID de Transacción',
      method: 'Método de Pago',
      gateway: 'Pasarela',
      reference: 'Referencia',
      creditCard: 'Tarjeta de Crédito',
      bankTransfer: 'Transferencia Bancaria',
      paypal: 'PayPal',
      ideal: 'iDEAL',
      cash: 'Efectivo'
    },
    // Analytics
    analytics: {
      title: 'Analíticas',
      subtitle: 'Monitoree el rendimiento de su negocio',
      overview: 'Resumen',
      revenue: 'Ingresos',
      visitors: 'Visitantes',
      conversions: 'Conversiones',
      bookingsChart: 'Reservas en el Tiempo',
      revenueChart: 'Ingresos en el Tiempo',
      topPois: 'POIs Principales',
      period: 'Período',
      today: 'Hoy',
      thisWeek: 'Esta Semana',
      thisMonth: 'Este Mes',
      thisYear: 'Este Año',
      custom: 'Rango Personalizado'
    },
    // Platform
    platform: {
      title: 'Configuración de Plataforma',
      subtitle: 'Gestione la configuración de la plataforma',
      general: 'Configuración General',
      integrations: 'Integraciones',
      apiKeys: 'Claves API',
      webhooks: 'Webhooks',
      maintenance: 'Modo Mantenimiento',
      backups: 'Copias de Seguridad'
    },
    // Table columns
    table: {
      id: 'ID',
      actions: 'Acciones',
      createdAt: 'Creado',
      updatedAt: 'Actualizado',
      noResults: 'No se encontraron resultados',
      rowsPerPage: 'Filas por página',
      of: 'de',
      showing: 'Mostrando',
      results: 'resultados'
    }
  },
  de: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      pois: 'POIs',
      events: 'Veranstaltungen',
      tickets: 'Tickets',
      reservations: 'Reservierungen',
      restaurants: 'Restaurants',
      bookings: 'Buchungen',
      transactions: 'Transaktionen',
      users: 'Benutzer',
      analytics: 'Analysen',
      agenda: 'Agenda',
      platform: 'Plattform',
      settings: 'Einstellungen',
      profile: 'Profil',
      logout: 'Abmelden'
    },
    // Common actions
    actions: {
      add: 'Hinzufügen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      save: 'Speichern',
      cancel: 'Abbrechen',
      search: 'Suchen',
      filter: 'Filtern',
      refresh: 'Aktualisieren',
      export: 'Exportieren',
      import: 'Importieren',
      view: 'Ansehen',
      create: 'Erstellen',
      update: 'Aktualisieren',
      confirm: 'Bestätigen',
      back: 'Zurück',
      next: 'Weiter',
      submit: 'Absenden',
      reset: 'Zurücksetzen',
      close: 'Schließen',
      clear: 'Löschen'
    },
    // Common labels
    labels: {
      name: 'Name',
      email: 'E-Mail',
      phone: 'Telefon',
      address: 'Adresse',
      city: 'Stadt',
      country: 'Land',
      status: 'Status',
      date: 'Datum',
      time: 'Zeit',
      price: 'Preis',
      total: 'Gesamt',
      description: 'Beschreibung',
      category: 'Kategorie',
      type: 'Typ',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      pending: 'Ausstehend',
      confirmed: 'Bestätigt',
      cancelled: 'Storniert',
      completed: 'Abgeschlossen',
      all: 'Alle',
      yes: 'Ja',
      no: 'Nein',
      loading: 'Laden...',
      noData: 'Keine Daten gefunden',
      error: 'Fehler',
      success: 'Erfolg',
      warning: 'Warnung',
      info: 'Information'
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Willkommen zurück',
      overview: 'Übersicht',
      recentActivity: 'Letzte Aktivität',
      quickStats: 'Schnelle Statistiken',
      totalPois: 'Gesamt POIs',
      totalUsers: 'Gesamt Benutzer',
      totalBookings: 'Gesamt Buchungen',
      totalRevenue: 'Gesamtumsatz',
      todayBookings: 'Heutige Buchungen',
      pendingReservations: 'Ausstehende Reservierungen'
    },
    // Settings
    settings: {
      title: 'Einstellungen',
      subtitle: 'Konfigurieren Sie Ihre Anwendungseinstellungen',
      language: 'Sprache & Region',
      languageDesc: 'Wählen Sie Ihre bevorzugte Sprache',
      notifications: 'Benachrichtigungen',
      notificationsDesc: 'Verwalten Sie die Benachrichtigungseinstellungen',
      emailNotifications: 'E-Mail-Benachrichtigungen',
      emailNotificationsDesc: 'Erhalten Sie Updates per E-Mail',
      pushNotifications: 'Push-Benachrichtigungen',
      pushNotificationsDesc: 'Browser-Push-Benachrichtigungen',
      bookingAlerts: 'Buchungsbenachrichtigungen',
      bookingAlertsDesc: 'Benachrichtigungen für neue Reservierungen',
      appearance: 'Erscheinungsbild',
      appearanceDesc: 'Passen Sie das Aussehen an',
      darkMode: 'Dunkler Modus',
      darkModeDesc: 'Dunkles Design verwenden',
      compactMode: 'Kompakter Modus',
      compactModeDesc: 'Abstände in Listen reduzieren',
      save: 'Einstellungen Speichern',
      reset: 'Auf Standard Zurücksetzen',
      saved: 'Einstellungen erfolgreich gespeichert',
      resetted: 'Einstellungen auf Standard zurückgesetzt'
    },
    // Users
    users: {
      title: 'Benutzerverwaltung',
      addUser: 'Benutzer Hinzufügen',
      editUser: 'Benutzer Bearbeiten',
      firstName: 'Vorname',
      lastName: 'Nachname',
      role: 'Rolle',
      lastLogin: 'Letzter Login',
      createdAt: 'Erstellt Am'
    },
    // POIs
    pois: {
      title: 'POI-Verwaltung',
      addPoi: 'POI Hinzufügen',
      editPoi: 'POI Bearbeiten',
      location: 'Standort',
      rating: 'Bewertung',
      views: 'Aufrufe'
    },
    // Events
    events: {
      title: 'Veranstaltungsverwaltung',
      addEvent: 'Veranstaltung Hinzufügen',
      editEvent: 'Veranstaltung Bearbeiten',
      startDate: 'Startdatum',
      endDate: 'Enddatum',
      venue: 'Veranstaltungsort',
      capacity: 'Kapazität',
      ticketsSold: 'Verkaufte Tickets'
    },
    // Reservations
    reservations: {
      title: 'Reservierungen',
      newReservation: 'Neue Reservierung',
      guest: 'Gast',
      restaurant: 'Restaurant',
      partySize: 'Personenzahl',
      table: 'Tisch',
      seated: 'Platziert',
      noShow: 'Nicht Erschienen'
    },
    // Profile
    profile: {
      title: 'Profil',
      subtitle: 'Verwalten Sie Ihre Kontoinformationen',
      personalInfo: 'Persönliche Informationen',
      changePassword: 'Passwort Ändern',
      currentPassword: 'Aktuelles Passwort',
      newPassword: 'Neues Passwort',
      confirmPassword: 'Passwort Bestätigen'
    },
    // Tickets
    tickets: {
      title: 'Ticketverwaltung',
      addTicket: 'Ticket Hinzufügen',
      editTicket: 'Ticket Bearbeiten',
      event: 'Veranstaltung',
      quantity: 'Anzahl',
      buyer: 'Käufer',
      ticketType: 'Tickettyp',
      purchaseDate: 'Kaufdatum',
      validUntil: 'Gültig Bis'
    },
    // Bookings
    bookings: {
      title: 'Buchungen',
      addBooking: 'Buchung Hinzufügen',
      editBooking: 'Buchung Bearbeiten',
      customer: 'Kunde',
      service: 'Dienstleistung',
      bookingDate: 'Buchungsdatum',
      amount: 'Betrag',
      paymentStatus: 'Zahlungsstatus',
      paid: 'Bezahlt',
      unpaid: 'Unbezahlt',
      refunded: 'Erstattet'
    },
    // Transactions
    transactions: {
      title: 'Transaktionen',
      transactionId: 'Transaktions-ID',
      method: 'Zahlungsmethode',
      gateway: 'Gateway',
      reference: 'Referenz',
      creditCard: 'Kreditkarte',
      bankTransfer: 'Banküberweisung',
      paypal: 'PayPal',
      ideal: 'iDEAL',
      cash: 'Bargeld'
    },
    // Analytics
    analytics: {
      title: 'Analysen',
      subtitle: 'Überwachen Sie Ihre Geschäftsleistung',
      overview: 'Übersicht',
      revenue: 'Umsatz',
      visitors: 'Besucher',
      conversions: 'Conversions',
      bookingsChart: 'Buchungen im Zeitverlauf',
      revenueChart: 'Umsatz im Zeitverlauf',
      topPois: 'Top POIs',
      period: 'Zeitraum',
      today: 'Heute',
      thisWeek: 'Diese Woche',
      thisMonth: 'Dieser Monat',
      thisYear: 'Dieses Jahr',
      custom: 'Benutzerdefiniert'
    },
    // Platform
    platform: {
      title: 'Plattform-Einstellungen',
      subtitle: 'Verwalten Sie die Plattformkonfiguration',
      general: 'Allgemeine Einstellungen',
      integrations: 'Integrationen',
      apiKeys: 'API-Schlüssel',
      webhooks: 'Webhooks',
      maintenance: 'Wartungsmodus',
      backups: 'Backups'
    },
    // Table columns
    table: {
      id: 'ID',
      actions: 'Aktionen',
      createdAt: 'Erstellt',
      updatedAt: 'Aktualisiert',
      noResults: 'Keine Ergebnisse gefunden',
      rowsPerPage: 'Zeilen pro Seite',
      of: 'von',
      showing: 'Zeige',
      results: 'Ergebnisse'
    }
  }
};

// Language options
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

// Default settings
export const defaultSettings = {
  language: 'nl',
  emailNotifications: true,
  pushNotifications: true,
  bookingAlerts: true,
  darkMode: true,
  compactMode: true
};

// Create context
const LanguageContext = createContext(null);

// Provider component
export function LanguageProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('adminSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  // Get current translations
  const t = translations[settings.language] || translations.en;

  // Update settings
  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('adminSettings', JSON.stringify(updated));
  };

  // Change language
  const setLanguage = (langCode) => {
    updateSettings({ language: langCode });
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  // Toggle compact mode
  const toggleCompactMode = () => {
    updateSettings({ compactMode: !settings.compactMode });
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('adminSettings', JSON.stringify(defaultSettings));
  };

  const value = {
    // Current settings
    settings,
    // Translations
    t,
    // Language helpers
    language: settings.language,
    setLanguage,
    languages: LANGUAGES,
    // Theme helpers
    darkMode: settings.darkMode,
    toggleDarkMode,
    compactMode: settings.compactMode,
    toggleCompactMode,
    // Settings management
    updateSettings,
    resetSettings
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
