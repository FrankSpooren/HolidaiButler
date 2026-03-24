/**
 * Translations for CalpeTrip Platform
 * Supported languages: nl, en, de, es, sv, pl
 */

export type Language = 'nl' | 'en' | 'de' | 'es' | 'sv' | 'pl';

export interface Translations {
  // Navigation
  nav: {
    home: string;
    explore: string;
    holibot: string;
    agenda: string;
    reservations: string;
    tickets: string;
    favorites: string;
    account: string;
    about: string;
    faq: string;
  };
  // Agenda Page
  agenda: {
    title: string;
    subtitle: string;
    categories: {
      all: string;
      festival: string;
      music: string;
      gastronomy: string;
      market: string;
      wellness: string;
      adventure: string;
    };
    noEvents: string;
    loadMore: string;
    moreInfo: string;
    newsletter: {
      title: string;
      description: string;
      placeholder: string;
      button: string;
    };
  };
  // Reservations Page
  reservations: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    persons: string;
    person: string;
    time: string;
    cuisines: {
      all: string;
      mediterranean: string;
      spanish: string;
      italian: string;
      japanese: string;
      seafood: string;
      vegan: string;
    };
    found: string;
    reserveNow: string;
    modal: {
      title: string;
      name: string;
      email: string;
      phone: string;
      guests: string;
      date: string;
      time: string;
      selectTime: string;
      specialRequests: string;
      submit: string;
    };
  };
  // Tickets Page
  tickets: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    available: string;
    buyTickets: string;
    selectTickets: string;
    orderSummary: string;
    total: string;
    continueToCheckout: string;
    guestInformation: string;
    name: string;
    email: string;
    phone: string;
    event: string;
    tickets: string;
    processing: string;
    proceedToPayment: string;
    payment: string;
    loadingPayment: string;
    bookingConfirmed: string;
    confirmationMessage: string;
    bookingReference: string;
    emailSent: string;
    browseMoreEvents: string;
  };
  // Homepage
  homepage: {
    hero: {
      title: string;
      payoff: string;
      subtitle: string;
    };
    why: {
      title: string;
    };
    usps: {
      partner: { title: string; description: string };
      ai: { title: string; description: string };
      local: { title: string; description: string };
      realtime: { title: string; description: string };
      trusted: { title: string; description: string };
    };
    cta: {
      explore: string;
      agenda: string;
    };
    features: {
      aiAssistant: { title: string; description: string };
      localPois: { title: string; description: string };
      tailored: { title: string; description: string };
      account: { title: string; description: string };
    };
    rating: {
      score: string;
      text: string;
      button: string;
    };
  };
  // POI Landing
  poi: {
    searchPlaceholder: string;
    filters: string;
    loadMore: string;
    noResults: string;
    noResultsDesc: string;
    noReviews: string;
    moreInfo: string;
    // Action buttons
    share: string;
    agenda: string;
    map: string;
    details: string;
    call: string;
    directions: string;
    save: string;
    saved: string;
    print: string;
    visitWebsite: string;
    // POI Detail sections
    about: string;
    openingHours: string;
    contact: string;
    highlights: string;
    perfectFor: string;
    readMore: string;
    readLess: string;
    // Share messages
    shareCopied: string;
    shareSuccess: string;
    addedToFavorites: string;
    removedFromFavorites: string;
    // Sprint 8.0: POI Detail Content i18n
    categoryHighlights: {
      active: [string, string, string];
      beaches: [string, string, string];
      culture: [string, string, string];
      recreation: [string, string, string];
      food: [string, string, string];
      health: [string, string, string];
      shopping: [string, string, string];
      practical: [string, string, string];
      default: [string, string, string];
    };
    categoryPerfectFor: {
      active: [string, string, string];
      beaches: [string, string, string];
      culture: [string, string, string];
      recreation: [string, string, string];
      food: [string, string, string];
      health: [string, string, string];
      shopping: [string, string, string];
      practical: [string, string, string];
      default: [string, string, string];
    };
    budgetLabels: {
      budget: string;
      midRange: string;
      upscale: string;
      luxury: string;
      priceLevel: string;
    };
    openingStatus: {
      open: string;
      closed: string;
      closesAt: string;
      closedToday: string;
      available: string;
    };
    amenities: {
      title: string;
      wheelchairAccessible: string;
      freeWifi: string;
      creditCards: string;
      noDetails: string;
      featureNames: Record<string, string>;
    };
    gallery: {
      noPhotos: string;
      showAllPhotos: string;
      allPhotos: string;
    };
    loadingStates: {
      loadingDetails: string;
      notFound: string;
      notFoundDescription: string;
    };
    comparison: {
      compare: string;
      comparing: string;
      addToCompare: string;
      removeFromCompare: string;
      compareTitle: string;
      selectedCount: string;
      maxReached: string;
      clearAll: string;
      noItemsSelected: string;
      selectToCompare: string;
      hint: string;
    };
  };
  // Categories (Calpe - English IDs, Texel - Dutch IDs)
  categories: {
    // Calpe categories
    active: string;
    beaches: string;
    culture: string;
    recreation: string;
    food: string;
    health: string;
    shopping: string;
    practical: string;
    // Texel categories (Dutch IDs)
    actief: string;
    cultuur: string;
    eten: string;
    gezondheid: string;
    natuur: string;
    praktisch: string;
    winkelen: string;
  };
  // Reviews (Sprint 7.6)
  reviews: {
    title: string;
    travelParty: {
      all: string;
      couples: string;
      families: string;
      solo: string;
      friends: string;
      business: string;
    };
    sort: {
      recent: string;
      helpful: string;
      highRating: string;
      lowRating: string;
    };
    sentiment: {
      positive: string;
      neutral: string;
      negative: string;
    };
    filterByTraveler: string;
    filterBySentiment: string;
    sortBy: string;
    helpful: string;
    noReviews: string;
    writeReview: string;
    readMore: string;
    showLess: string;
    visited: string;
    loadingReviews: string;
    loadMoreReviews: string;
    reviewCount: string;
    averageRating: string;
    review: string;
    allReviews: string;
    beFirstToShare: string;
    failedToLoad: string;
    tryAgain: string;
    noMatchFilters: string;
    adjustFilters: string;
    today: string;
    yesterday: string;
    daysAgo: string;
    weeksAgo: string;
    weekAgo: string;
    monthsAgo: string;
    monthAgo: string;
    yearsAgo: string;
    yearAgo: string;
    writeReviewModal: {
      title: string;
      close: string;
      yourRating: string;
      travelPartyLabel: string;
      solo: string;
      couple: string;
      family: string;
      friends: string;
      business: string;
      yourReview: string;
      placeholder: string;
      characters: string;
      minimum: string;
      addPhoto: string;
      uploadPhoto: string;
      submitting: string;
      submitReview: string;
      success: string;
      error: string;
      selectRating: string;
      selectTravelParty: string;
      minChars: string;
      uploadImageOnly: string;
      imageTooLarge: string;
    };
  };
  // Common
  common: {
    save: string;
    close: string;
    apply: string;
    reset: string;
    loading: string;
    back: string;
    optional: string;
  };
  // Auth Pages
  auth: {
    login: {
      title: string;
      subtitle: string;
      emailLabel: string;
      emailPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      forgotPassword: string;
      signInButton: string;
      signingIn: string;
      noAccount: string;
      signUp: string;
      backToHome: string;
      errorFillFields: string;
      errorInvalidCredentials: string;
      errorGeneric: string;
    };
    signup: {
      title: string;
      subtitle: string;
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      termsText: string;
      termsLink: string;
      and: string;
      privacyLink: string;
      signUpButton: string;
      signingUp: string;
      haveAccount: string;
      signIn: string;
      backToHome: string;
      errorFillFields: string;
      errorPasswordMismatch: string;
      errorPasswordTooShort: string;
      errorEmailExists: string;
      errorGeneric: string;
      // Password requirements
      passwordRequirements: {
        title: string;
        minLength: string;
        uppercase: string;
        lowercase: string;
        number: string;
        special: string;
      };
      // Verification success message
      verificationSent: {
        title: string;
        sentTo: string;
        instruction: string;
        goToLogin: string;
        noEmail: string;
      };
    };
    verifyEmail: {
      verifying: string;
      verifyingText: string;
      success: string;
      successMessage: string;
      alreadyVerified: string;
      alreadyVerifiedMessage: string;
      failed: string;
      failedMessage: string;
      goToLogin: string;
      requestNew: string;
      backToLogin: string;
    };
    resendVerification: {
      title: string;
      subtitle: string;
      emailLabel: string;
      emailPlaceholder: string;
      sendButton: string;
      sending: string;
      success: string;
      successMessage: string;
      backToLogin: string;
      errorEmpty: string;
      errorTooMany: string;
      errorGeneric: string;
    };
  };
  // Account Dashboard
  account: {
    tabs: {
      profile: string;
      preferences: string;
      ai: string;
      privacy: string;
      export: string;
      settings: string;
      favorites: string;
      visited: string;
      reviews: string;
    };
    profile: {
      memberSince: string;
      butlerFanSince: string;
      clickAvatarHint: string;
      changePhoto: string;
      quickActions: string;
      savedPOIs: string;
      favorites: string;
      visits: string;
      reviews: string;
      comingSoon: string;
    };
    favorites: {
      title: string;
      infoText: string;
      poiTitle: string;
      eventsTitle: string;
      emptyPois: string;
      emptyEvents: string;
      discoverPois: string;
      viewAgenda: string;
      viewAll: string;
    };
    visited: {
      title: string;
      infoText: string;
      poisTitle: string;
      eventsTitle: string;
      emptyPois: string;
      emptyEvents: string;
      trackingInfo: string;
    };
    reviews: {
      title: string;
      infoText: string;
      empty: string;
      emptyHint: string;
      discoverToReview: string;
    };
    preferences: {
      title: string;
      travelingAs: string;
      interests: string;
      dietary: string;
      editButton: string;
      asCouple: string;
      foodDrinks: string;
      beaches: string;
      culture: string;
      vegetarian: string;
    };
    ai: {
      title: string;
      subtitle: string;
      infoText: string;
      features: string;
      personalizedRecs: string;
      personalizedRecsDesc: string;
      smartFilters: string;
      smartFiltersDesc: string;
      behavioralLearning: string;
      behavioralLearningDesc: string;
      howItWorks: string;
    };
    privacy: {
      title: string;
      subtitle: string;
      dataCollection: string;
      essentialCookies: string;
      essentialCookiesDesc: string;
      required: string;
      analytics: string;
      analyticsDesc: string;
      personalization: string;
      personalizationDesc: string;
      marketing: string;
      marketingDesc: string;
      updateButton: string;
    };
    export: {
      title: string;
      infoText: string;
      whatIncluded: string;
      includeList: {
        profile: string;
        preferences: string;
        savedPOIs: string;
        reviews: string;
        visitHistory: string;
        activityLog: string;
        consentSettings: string;
      };
      format: string;
      formatJSON: string;
      formatPDF: string;
      formatBoth: string;
      requestButton: string;
      validityNote: string;
    };
    settings: {
      security: string;
      changePassword: string;
      twoFactor: string;
      twoFactorStatus: string;
      notifications: string;
      emailNotifications: string;
      pushNotifications: string;
      dangerZone: string;
      deleteData: string;
      deleteDataDesc: string;
      deleteAccount: string;
      deleteAccountDesc: string;
    };
    modals: {
      // Change Password Modal
      changePasswordTitle: string;
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      passwordWeak: string;
      passwordMedium: string;
      passwordStrong: string;
      passwordRequirements: string;
      passwordMismatch: string;
      passwordMatch: string;
      passwordError: string;
      changePassword: string;
      // 2FA Modal
      twoFactorTitle: string;
      twoFactorIntroTitle: string;
      twoFactorIntroText: string;
      twoFactorBenefit1: string;
      twoFactorBenefit2: string;
      twoFactorBenefit3: string;
      twoFactorScanInstructions: string;
      hideSecret: string;
      showSecret: string;
      recommendedApps: string;
      twoFactorVerifyInstructions: string;
      enterCodeFromApp: string;
      twoFactorEnabled: string;
      backupCodesTitle: string;
      backupCodesWarning: string;
      copied: string;
      copyAll: string;
      twoFactorActive: string;
      twoFactorActiveDesc: string;
      disableWarning: string;
      twoFactorError: string;
      twoFactorDisableError: string;
      startSetup: string;
      verify: string;
      verifying: string;
      done: string;
      keepEnabled: string;
      disable2FA: string;
      disabling: string;
      // Delete Data Modal
      deleteDataTitle: string;
      deleteDataWarningTitle: string;
      deleteDataWarningText: string;
      dataToBeDeleted: string;
      deleteDataItem1: string;
      deleteDataItem2: string;
      deleteDataItem3: string;
      deleteDataItem4: string;
      deleteDataItem5: string;
      dataKept: string;
      keepDataItem1: string;
      keepDataItem2: string;
      deleteDataInfo: string;
      confirmDeleteData: string;
      typeToConfirm: string;
      deleteDataError: string;
      deleting: string;
      deleteData: string;
      // Delete Account Modal
      deleteAccountTitle: string;
      deleteAccountWarningTitle: string;
      deleteAccountWarningText: string;
      gracePeriodTitle: string;
      gracePeriodText: string;
      scheduledDeletion: string;
      permanentlyDeleted: string;
      deleteAccountItem1: string;
      deleteAccountItem2: string;
      deleteAccountItem3: string;
      deleteAccountItem4: string;
      deleteAccountItem5: string;
      canCancelDeletion: string;
      whyLeaving: string;
      helpUsImprove: string;
      reasonNotUseful: string;
      reasonPrivacy: string;
      reasonEmails: string;
      reasonAlternative: string;
      reasonTemporary: string;
      reasonOther: string;
      tellUsMore: string;
      confirmDeleteAccount: string;
      typeDeleteToConfirm: string;
      accountToDelete: string;
      deleteAccountError: string;
      keepAccount: string;
      deleteMyAccount: string;
      processing: string;
      deletionScheduled: string;
      deletionScheduledText: string;
      cancelBeforeDate: string;
      confirmationEmailSent: string;
      understood: string;
      // Common
      cancel: string;
      back: string;
      next: string;
      continue: string;
      saving: string;
    };
  };
  // Footer
  footer: {
    about: string;
    privacy: string;
    terms: string;
    contact: string;
    copyright: string;
    // Extended footer properties
    platformTitle: string;
    supportTitle: string;
    legalTitle: string;
    howItWorks: string;
    pois: string;
    faq: string;
    help: string;
    cookies: string;
    tagline: string;
    allRights: string;
    madeWith: string;
    partners: string;
  };
  // Onboarding
  onboarding: {
    // Navigation
    back: string;
    skip: string;
    continue: string;
    // Progress
    stepOf: string;
    of: string;
    // Step 1: Travel Companion
    step1Title: string;
    couple: string;
    coupleDesc: string;
    family: string;
    familyDesc: string;
    soloDesc: string;
    group: string;
    groupDesc: string;
    // Step 2: Interests
    step2Title: string;
    selectAll: string;
    selected: string;
    option: string;
    options: string;
    relax: string;
    relaxDesc: string;
    active: string;
    activeDesc: string;
    culture: string;
    cultureDesc: string;
    food: string;
    foodDesc: string;
    nature: string;
    natureDesc: string;
    nightlife: string;
    nightlifeDesc: string;
    history: string;
    historyDesc: string;
    shopping: string;
    shoppingDesc: string;
    // Step 3: Trip Context
    step3Title: string;
    stayType: string;
    pleasure: string;
    business: string;
    visitStatus: string;
    firstTime: string;
    returning: string;
    localResident: string;
    whenVisiting: string;
    tripDuration: string;
    duration1: string;
    duration2: string;
    duration3: string;
    duration4: string;
    durationFlex: string;
    // Step 4: Optional
    optional: string;
    selectMultiple: string;
    dietaryTitle: string;
    vegetarian: string;
    vegan: string;
    glutenFree: string;
    halal: string;
    kosher: string;
    lactoseFree: string;
    nutAllergies: string;
    accessibilityTitle: string;
    wheelchair: string;
    mobility: string;
    visual: string;
    hearing: string;
    // Buttons
    finishExplore: string;
    savePreferences: string;
    // Edit mode
    editMode: string;
    cancelEdit: string;
        skipConfirm: string;
  };
  // HoliBot Chat Widget
  holibotChat: {
    welcome: string;
    welcomeSubtitle: string;
    inputPlaceholder: string;
    quickActions: {
      itinerary: string;
      locationInfo: string;
      directions: string;
      dailyTip: string;
    };
    prompts: {
      itinerary: string;
      locationInfo: string;
      directions: string;
    };
    responses: {
      loading: string;
      error: string;
      noResults: string;
      itineraryIntro: string;
      locationSearch: string;
      directionsHelp: string;
      yourItinerary: string;
      eventsAdded: string;
    };
  };
}

export const translations: Record<Language, Translations> = {
  nl: {
    nav: {
      home: 'Home',
      explore: 'Verkennen',
      holibot: 'CalpeChat',
      agenda: 'Agenda',
      reservations: 'Reserveren',
      tickets: 'Tickets',
      favorites: 'Favorieten',
      account: 'Account',
      about: 'Over',
      faq: 'FAQ',
    },
    agenda: {
      title: 'Agenda Calpe',
      subtitle: 'Ontdek alle evenementen, festivals en activiteiten in Calpe',
      categories: {
        all: 'Alle',
        festival: 'Festivals',
        music: 'Muziek',
        gastronomy: 'Gastronomie',
        market: 'Markten',
        wellness: 'Wellness',
        adventure: 'Avontuur',
      },
      noEvents: 'Geen evenementen gevonden voor deze categorie.',
      loadMore: 'Meer Events laden',
      moreInfo: 'Meer info',
      newsletter: {
        title: 'Mis geen enkel evenement!',
        description: 'Meld je aan voor onze nieuwsbrief en ontvang wekelijks de beste evenementen in Calpe.',
        placeholder: 'Je e-mailadres',
        button: 'Aanmelden',
      },
    },
    reservations: {
      title: 'Restaurant Reserveringen',
      subtitle: 'Ontdek en reserveer bij de beste restaurants in Calpe',
      searchPlaceholder: 'Zoek restaurant of keuken...',
      persons: 'personen',
      person: 'persoon',
      time: 'Tijd',
      cuisines: {
        all: 'Alle',
        mediterranean: 'Mediterraan',
        spanish: 'Spaans',
        italian: 'Italiaans',
        japanese: 'Japans',
        seafood: 'Visgerechten',
        vegan: 'Vegan',
      },
      found: 'restaurants gevonden',
      reserveNow: 'Reserveer Nu',
      modal: {
        title: 'Reserveer bij',
        name: 'Naam',
        email: 'E-mail',
        phone: 'Telefoon',
        guests: 'Aantal personen',
        date: 'Datum',
        time: 'Tijd',
        selectTime: 'Selecteer tijd',
        specialRequests: 'Speciale verzoeken',
        submit: 'Bevestig Reservering',
      },
    },
    tickets: {
      title: 'Tickets & Activiteiten',
      subtitle: 'Boek tickets voor de beste attracties en activiteiten in Calpe',
      searchPlaceholder: 'Zoek evenementen...',
      available: 'beschikbaar',
      buyTickets: 'Tickets kopen',
      selectTickets: 'Selecteer Tickets',
      orderSummary: 'Bestelling',
      total: 'Totaal',
      continueToCheckout: 'Doorgaan naar afrekenen',
      guestInformation: 'Gastgegevens',
      name: 'Volledige naam',
      email: 'E-mailadres',
      phone: 'Telefoonnummer',
      event: 'Evenement',
      tickets: 'tickets',
      processing: 'Verwerken...',
      proceedToPayment: 'Doorgaan naar betaling',
      payment: 'Betaling',
      loadingPayment: 'Betaalmethodes laden...',
      bookingConfirmed: 'Boeking bevestigd!',
      confirmationMessage: 'Je tickets zijn succesvol geboekt.',
      bookingReference: 'Boekingsreferentie',
      emailSent: 'Een bevestigingsmail is verzonden naar',
      browseMoreEvents: 'Meer evenementen bekijken',
    },
    homepage: {
      hero: {
        title: 'Jouw verblijf, jouw stijl.',
        payoff: 'Ontdek Calpe met jouw persoonlijke Calpe-Assistent',
        subtitle: 'Ervaar deze mediterrane juweel volledig op jou afgestemd',
      },
      why: {
        title: 'Waarom CalpeTrip?',
      },
      usps: {
        partner: { title: 'Official Partner', description: 'Official Partner Calpe Turismo' },
        ai: { title: 'Calpe AI-Assistent', description: 'HolidAIButler: Jouw (hyper) persoonlijke Butler' },
        local: { title: '100% Lokaal', description: 'Ondersteun de economie & identiteit van Calpe' },
        realtime: { title: 'Realtime accurate info', description: 'Over locaties, evenementen, activiteiten en weer' },
        trusted: { title: 'Vertrouwd & Veilig', description: 'Van data tot betaling: wij geven om jouw privacy' },
      },
      cta: {
        explore: '🗺️ Verken Calpe',
        agenda: '📅 Agenda',
      },
      features: {
        aiAssistant: {
          title: 'AI-Aangedreven Assistent',
          description: 'CalpeChat begrijpt jouw voorkeuren en geeft gepersonaliseerde aanbevelingen voor restaurants, activiteiten en verborgen pareltjes.'
        },
        localPois: {
          title: '1.600+ Lokale POI\'s',
          description: 'Ontdek authentieke ervaringen samengesteld door locals. Van stranden tot musea, restaurants tot uitgaan - wij hebben alles voor je.'
        },
        tailored: {
          title: 'Op Maat voor Jou',
          description: 'Vertel ons over jouw reisstijl, voorkeuren en interesses. Wij passen jouw ervaring aan om te passen bij jouw perfecte vakantie.'
        },
        account: {
          title: 'Jouw Reishub',
          description: 'Bewaar favorieten, houd bezoeken bij, beheer voorkeuren en controleer jouw privacy - allemaal op één plek.'
        },
      },
      rating: {
        score: 'Gebaseerd op 2.500+ reizigerbeoordelingen',
        text: '4.8 / 5.0',
        button: 'Lees Beoordelingen',
      },
    },
    poi: {
      searchPlaceholder: 'Zoek POI\'s, restaurants, stranden...',
      filters: 'Filters',
      loadMore: 'Meer POI\'s laden',
      noResults: 'Geen POI\'s gevonden',
      noResultsDesc: 'Probeer je zoekfilter of categorie aan te passen',
      noReviews: 'Geen reviews beschikbaar',
      moreInfo: 'Meer Info',
      share: 'Delen',
      agenda: 'Agenda',
      map: 'Kaart',
      details: 'Details',
      call: 'Bellen',
      directions: 'Routebeschrijving',
      save: 'Bewaren',
      saved: 'Bewaard',
      print: 'Printen',
      visitWebsite: 'Bezoek Website',
      about: 'Over',
      openingHours: 'Openingstijden',
      contact: 'Contact',
      highlights: 'Highlights',
      perfectFor: 'Perfect voor',
      readMore: 'Lees meer',
      readLess: 'Lees minder',
      shareCopied: 'Link gekopieerd naar klembord!',
      shareSuccess: 'Succesvol gedeeld!',
      addedToFavorites: 'Toegevoegd aan favorieten!',
      removedFromFavorites: 'Verwijderd uit favorieten',
      categoryHighlights: {
        active: ['Buitenactiviteiten', 'Avontuursport', 'Fysieke fitness'],
        beaches: ['Schilderachtig uitzicht', 'Ontspanning', 'Natuurlijke schoonheid'],
        culture: ['Historisch belang', 'Cultureel erfgoed', 'Educatief'],
        recreation: ['Vermaak', 'Gezinsvriendelijk', 'Leuke activiteiten'],
        food: ['Lokale keuken', 'Dineerervaring', 'Smaak & aroma'],
        health: ['Wellness', 'Zelfzorg', 'Gezondheidsdiensten'],
        shopping: ['Winkelbeleving', 'Lokale producten', 'Winkeltherapie'],
        practical: ['Essentiële diensten', 'Gemak', 'Praktische behoeften'],
        default: ['Geweldige ervaring', 'Bezoek waard', 'Populaire keuze'],
      },
      categoryPerfectFor: {
        active: ['Sportliefhebbers', 'Avonturiers', 'Fitnessliefhebbers'],
        beaches: ['Strandliefhebbers', 'Natuurliefhebbers', 'Fotografen'],
        culture: ['Geschiedenisliefhebbers', 'Cultuurliefhebbers', 'Educatieve reizen'],
        recreation: ['Gezinnen', 'Groepen', 'Entertainmentseekers'],
        food: ['Foodies', 'Culinaire verkenners', 'Sociaal dineren'],
        health: ['Wellnesszoekers', 'Spa-liefhebbers', 'Gezondheidsbewusten'],
        shopping: ['Shoppers', 'Souvenirjagers', 'Modefiefhebbers'],
        practical: ['Reizigers', 'Lokale bewoners', 'Iedereen die diensten nodig heeft'],
        default: ['Alle bezoekers', 'Reizigers', 'Lokale verkenners'],
      },
      budgetLabels: {
        budget: 'Budgetvriendelijk',
        midRange: 'Middencategorie',
        upscale: 'Luxe',
        luxury: 'Premium',
        priceLevel: 'Prijsniveau',
      },
      openingStatus: {
        open: 'Nu geopend',
        closed: 'Gesloten',
        closesAt: 'Sluit om',
        closedToday: 'Vandaag gesloten',
        available: 'Beschikbaar',
      },
      amenities: {
        title: 'Voorzieningen',
        wheelchairAccessible: 'Rolstoeltoegankelijk',
        freeWifi: 'Gratis WiFi Beschikbaar',
        creditCards: 'Accepteert Creditcards',
        noDetails: 'Geen aanvullende details beschikbaar',
        featureNames: {
          'Wheelchair accessible entrance': 'Rolstoeltoegankelijke ingang',
          'Wheelchair accessible parking lot': 'Rolstoeltoegankelijke parkeerplaats',
          'Wheelchair accessible restroom': 'Rolstoeltoegankelijk toilet',
          'Wheelchair accessible seating': 'Rolstoeltoegankelijke zitplaatsen',
          'Bar onsite': 'Bar aanwezig',
          'Restroom': 'Toilet',
          'Wi-Fi': 'Wi-Fi',
          'Free Wi-Fi': 'Gratis Wi-Fi',
          'Good for kids': 'Geschikt voor kinderen',
          'High chairs': 'Kinderstoelen',
          'Dogs allowed': 'Honden toegestaan',
          'Gender-neutral restroom': 'Genderneutraal toilet',
          'Free parking lot': 'Gratis parkeerplaats',
          'Free street parking': 'Gratis straatparkeren',
          'Paid parking lot': 'Betaald parkeren',
          'Paid street parking': 'Betaald straatparkeren',
          'Parking garage': 'Parkeergarage',
          'Valet parking': 'Valetparkeren',
          'Dine-in': 'Ter plaatse eten',
          'Takeout': 'Afhalen',
          'Delivery': 'Bezorging',
          'Outdoor seating': 'Terras',
          'Live music': 'Livemuziek',
          'Reservations': 'Reserveringen',
          'Private dining': 'Priv\u00e9-dineren',
          'Happy hour': 'Happy hour',
          'Brunch': 'Brunch',
          'Lunch': 'Lunch',
          'Dinner': 'Diner',
          'Breakfast': 'Ontbijt',
          'Dessert': 'Dessert',
          'Coffee': 'Koffie',
          'Cocktails': 'Cocktails',
          'Beer': 'Bier',
          'Wine': 'Wijn',
          'Organic': 'Biologisch',
          'Vegetarian options': 'Vegetarische opties',
          'Vegan options': 'Veganistische opties',
        },
      },
      gallery: {
        noPhotos: 'Geen foto\'s beschikbaar',
        showAllPhotos: 'Toon alle foto\'s',
        allPhotos: 'Alle',
      },
      loadingStates: {
        loadingDetails: 'POI details laden...',
        notFound: 'POI Niet Gevonden',
        notFoundDescription: 'De POI die u zoekt bestaat niet.',
      },
      comparison: {
        compare: 'Vergelijk',
        comparing: 'Vergelijken',
        addToCompare: 'Toevoegen aan vergelijking',
        removeFromCompare: 'Verwijderen uit vergelijking',
        compareTitle: 'POI Vergelijking',
        selectedCount: '{count} POI(s) geselecteerd',
        maxReached: 'Maximaal 3 POI\'s kunnen worden vergeleken',
        clearAll: 'Alles wissen',
        noItemsSelected: 'Geen POI\'s geselecteerd',
        selectToCompare: 'Selecteer 2-3 POI\'s om te vergelijken',
        hint: 'Klik op het vergelijkingsicoon bij POI\'s om ze toe te voegen',
      },
    },
    categories: {
      // Calpe categories
      active: 'Actief',
      beaches: 'Stranden & Natuur',
      culture: 'Cultuur & Geschiedenis',
      recreation: 'Recreatie',
      food: 'Eten & Drinken',
      health: 'Gezondheid & Welzijn',
      shopping: 'Winkelen',
      practical: 'Praktisch',
      // Texel categories
      actief: 'Actief',
      cultuur: 'Cultuur & Historie',
      eten: 'Eten & Drinken',
      gezondheid: 'Gezondheid & Verzorging',
      natuur: 'Natuur',
      praktisch: 'Praktisch',
      winkelen: 'Winkelen',
    },
    reviews: {
      title: 'Reviews',
      travelParty: {
        all: 'Alle Reizigers',
        couples: 'Stellen',
        families: 'Gezinnen',
        solo: 'Solo Reizigers',
        friends: 'Vrienden',
        business: 'Zakelijk',
      },
      sort: {
        recent: 'Meest Recente',
        helpful: 'Meest Helpvol',
        highRating: 'Hoogste Beoordeling',
        lowRating: 'Laagste Beoordeling',
      },
      sentiment: {
        positive: 'Positief',
        neutral: 'Neutraal',
        negative: 'Negatief',
      },
      filterByTraveler: 'Filter op Reizigerstype',
      filterBySentiment: 'Filter op Sentiment',
      sortBy: 'Sorteer op',
      helpful: 'Helpvol',
      noReviews: 'Nog geen reviews',
      writeReview: 'Schrijf een Review',
      readMore: 'Lees meer',
      showLess: 'Toon minder',
      visited: 'Bezocht',
      loadingReviews: 'Reviews laden...',
      loadMoreReviews: 'Meer Reviews Laden',
      reviewCount: 'reviews',
      averageRating: 'Gemiddelde beoordeling',
      review: 'review',
      allReviews: 'Alle Reviews',
      beFirstToShare: 'Wees de eerste die een ervaring deelt!',
      failedToLoad: 'Reviews laden mislukt. Probeer het opnieuw.',
      tryAgain: 'Opnieuw proberen',
      noMatchFilters: 'Geen reviews gevonden voor deze filters',
      adjustFilters: 'Pas je filterinstellingen aan om meer reviews te zien.',
      today: 'Vandaag',
      yesterday: 'Gisteren',
      daysAgo: '{n} dagen geleden',
      weeksAgo: '{n} weken geleden',
      weekAgo: '1 week geleden',
      monthsAgo: '{n} maanden geleden',
      monthAgo: '1 maand geleden',
      yearsAgo: '{n} jaar geleden',
      yearAgo: '1 jaar geleden',
      writeReviewModal: {
        title: 'Schrijf een Review',
        close: 'Sluiten',
        yourRating: 'Jouw Beoordeling',
        travelPartyLabel: 'Reisgezelschap',
        solo: 'Solo',
        couple: 'Stel',
        family: 'Gezin',
        friends: 'Vrienden',
        business: 'Zakelijk',
        yourReview: 'Jouw Review',
        placeholder: 'Deel je ervaring op deze plek... (minimaal 50 tekens)',
        characters: 'tekens',
        minimum: 'minimaal 50',
        addPhoto: 'Foto toevoegen (optioneel)',
        uploadPhoto: 'Upload Foto',
        submitting: 'Verzenden...',
        submitReview: 'Review Verzenden',
        success: 'Review succesvol ingediend!',
        error: 'Review verzenden mislukt. Probeer het opnieuw.',
        selectRating: 'Selecteer een beoordeling',
        selectTravelParty: 'Selecteer je reisgezelschap',
        minChars: 'Review moet minimaal 50 tekens bevatten',
        uploadImageOnly: 'Upload een afbeeldingsbestand',
        imageTooLarge: 'Afbeelding moet kleiner zijn dan 5MB',
      },
    },
    common: {
      save: 'Opslaan',
      close: 'Sluiten',
      apply: 'Toepassen',
      reset: 'Reset',
      loading: 'Laden...',
      back: 'Terug',
      optional: 'optioneel',
    },
    auth: {
      login: {
        title: 'CalpeTrip',
        subtitle: 'Welkom terug! Log in op je account',
        emailLabel: 'E-mailadres',
        emailPlaceholder: 'jouw.email@voorbeeld.nl',
        passwordLabel: 'Wachtwoord',
        passwordPlaceholder: 'Voer je wachtwoord in',
        forgotPassword: 'Wachtwoord vergeten?',
        signInButton: 'Inloggen',
        signingIn: 'Inloggen...',
        noAccount: 'Nog geen account?',
        signUp: 'Registreren',
        backToHome: 'Terug naar home',
        errorFillFields: 'Vul alle velden in',
        errorInvalidCredentials: 'Ongeldig e-mailadres of wachtwoord. Probeer het opnieuw.',
        errorGeneric: 'Inloggen mislukt. Probeer het later opnieuw.',
      },
      signup: {
        title: 'CalpeTrip',
        subtitle: 'Maak een account aan',
        nameLabel: 'Naam',
        namePlaceholder: 'Jouw naam',
        emailLabel: 'E-mailadres',
        emailPlaceholder: 'jouw.email@voorbeeld.nl',
        passwordLabel: 'Wachtwoord',
        passwordPlaceholder: 'Kies een wachtwoord',
        confirmPasswordLabel: 'Bevestig wachtwoord',
        confirmPasswordPlaceholder: 'Voer wachtwoord opnieuw in',
        termsText: 'Ik ga akkoord met de',
        termsLink: 'Servicevoorwaarden',
        and: 'en',
        privacyLink: 'Privacybeleid',
        signUpButton: 'Registreren',
        signingUp: 'Registreren...',
        haveAccount: 'Heb je al een account?',
        signIn: 'Inloggen',
        backToHome: 'Terug naar home',
        errorFillFields: 'Vul alle velden in',
        errorPasswordMismatch: 'Wachtwoorden komen niet overeen',
        errorPasswordTooShort: 'Wachtwoord moet minimaal 8 tekens bevatten',
        errorEmailExists: 'Er bestaat al een account met dit e-mailadres. Log alsjeblieft in.',
        errorGeneric: 'Registratie mislukt. Probeer het later opnieuw.',
        passwordRequirements: {
          title: 'Wachtwoord moet bevatten:',
          minLength: 'Minimaal 8 tekens',
          uppercase: 'Minimaal 1 hoofdletter',
          lowercase: 'Minimaal 1 kleine letter',
          number: 'Minimaal 1 cijfer',
          special: 'Minimaal 1 speciaal teken (!@#$%^&*)',
        },
        verificationSent: {
          title: 'Controleer je e-mail',
          sentTo: 'We hebben een verificatie-email gestuurd naar:',
          instruction: 'Klik op de link in de email om je account te activeren. Controleer ook je spam folder als je de email niet ziet.',
          goToLogin: 'Ga naar inloggen',
          noEmail: 'Geen email ontvangen?',
        },
      },
      verifyEmail: {
        verifying: 'E-mail verifiëren...',
        verifyingText: 'Even geduld, we controleren je verificatielink.',
        success: 'E-mail geverifieerd!',
        successMessage: 'Je e-mailadres is succesvol geverifieerd. Je kunt nu inloggen.',
        alreadyVerified: 'Al geverifieerd',
        alreadyVerifiedMessage: 'Dit e-mailadres is al geverifieerd. Je kunt inloggen.',
        failed: 'Verificatie mislukt',
        failedMessage: 'Er is een fout opgetreden bij de verificatie. Probeer het opnieuw of vraag een nieuwe verificatie-email aan.',
        goToLogin: 'Ga naar inloggen',
        requestNew: 'Nieuwe verificatie-email aanvragen',
        backToLogin: 'Terug naar inloggen',
      },
      resendVerification: {
        title: 'Verificatie-email opnieuw verzenden',
        subtitle: 'Voer je e-mailadres in om een nieuwe verificatie-email te ontvangen.',
        emailLabel: 'E-mailadres',
        emailPlaceholder: 'naam@voorbeeld.nl',
        sendButton: 'Verzend verificatie-email',
        sending: 'Verzenden...',
        success: 'Verificatie-email verzonden',
        successMessage: 'Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een verificatie-email. Controleer ook je spam folder.',
        backToLogin: 'Terug naar inloggen',
        errorEmpty: 'Voer je e-mailadres in',
        errorTooMany: 'Je hebt te veel verificatie-emails aangevraagd. Probeer het over een uur opnieuw.',
        errorGeneric: 'Er is een fout opgetreden',
      },
    },
    account: {
      tabs: {
        profile: 'Profiel',
        preferences: 'Voorkeuren',
        ai: 'AI',
        privacy: 'Privacy',
        export: 'Export',
        settings: 'Instellingen',
        favorites: 'Favorieten',
        visited: 'Bezocht',
        reviews: 'Reviews',
      },
      profile: {
        memberSince: 'Lid sinds',
        butlerFanSince: 'Butler-fan sinds',
        clickAvatarHint: 'Klik op avatar om foto te uploaden',
        changePhoto: 'Foto Wijzigen',
        quickActions: 'Snelle Acties',
        savedPOIs: 'Opgeslagen POI\'s',
        favorites: 'Favorieten',
        visits: 'Bezoeken',
        reviews: 'Reviews',
        comingSoon: 'Binnenkort',
      },
      favorites: {
        title: 'Favorieten',
        infoText: 'Je opgeslagen POIs en events op één plek.',
        poiTitle: 'Favoriete POIs',
        eventsTitle: 'Favoriete Events',
        emptyPois: 'Je hebt nog geen favoriete POIs opgeslagen.',
        emptyEvents: 'Je hebt nog geen favoriete events opgeslagen.',
        discoverPois: 'Ontdek POIs →',
        viewAgenda: 'Bekijk Agenda →',
        viewAll: 'Bekijk alle',
      },
      visited: {
        title: 'Bezochte Plekken',
        infoText: 'Automatisch bijgehouden wanneer je POIs en events bekijkt.',
        poisTitle: 'Bezochte POIs',
        eventsTitle: 'Bezochte Events',
        emptyPois: 'Bezochte POIs tracking wordt binnenkort geactiveerd.',
        emptyEvents: 'Bezochte events tracking wordt binnenkort geactiveerd.',
        trackingInfo: 'Je bezoekgeschiedenis wordt automatisch bijgehouden zodra je POIs bekijkt.',
      },
      reviews: {
        title: 'Mijn Reviews',
        infoText: 'Bekijk en bewerk je geschreven reviews.',
        empty: 'Je hebt nog geen reviews geschreven.',
        emptyHint: 'Deel je ervaringen en help andere reizigers!',
        discoverToReview: 'Ontdek POIs om te reviewen →',
      },
      preferences: {
        title: 'Reisvoorkeuren',
        travelingAs: 'Reizen als',
        interests: 'Interesses',
        dietary: 'Dieet',
        editButton: 'Voorkeuren Bewerken',
        asCouple: 'Als koppel',
        foodDrinks: 'Eten & Drinken',
        beaches: 'Stranden',
        culture: 'Cultuur',
        vegetarian: 'Vegetarisch',
      },
      ai: {
        title: 'AI-Aangedreven Personalisatie',
        subtitle: 'AI-functies',
        infoText: 'Wij gebruiken lokale data, maar ook AI om jouw aanbevelingen te personaliseren en optimaliseren. Je hebt 100% controle over hoe AI wordt gebruikt',
        features: 'AI-functies',
        personalizedRecs: 'Gepersonaliseerde Aanbevelingen',
        personalizedRecsDesc: 'Gebruik AI om POI\'s voor te stellen',
        smartFilters: 'Slimme Filters',
        smartFiltersDesc: 'AI-aangedreven zoekfilters',
        behavioralLearning: 'Gedragsleren',
        behavioralLearningDesc: 'Leer van jouw interacties',
        howItWorks: 'Hoe werkt AI-personalisatie?',
      },
      privacy: {
        title: 'Jouw privacy is belangrijk voor ons',
        subtitle: 'Data opgeslagen op jouw apparaat • Auto-verwijderen na 30 dagen • 100% veiligheid',
        dataCollection: 'Dataverzameling & Toestemming',
        essentialCookies: 'Essentiële Cookies',
        essentialCookiesDesc: 'Vereist voor de werking van de site',
        required: 'VEREIST',
        analytics: 'Analytics',
        analyticsDesc: 'Inzicht in sitegebruik',
        personalization: 'Personalisatie',
        personalizationDesc: 'Verbeter aanbevelingen',
        marketing: 'Marketing',
        marketingDesc: 'Promotionele e-mails',
        updateButton: 'Toestemmingsinstellingen Bijwerken',
      },
      export: {
        title: 'Download Jouw Data',
        infoText: 'Je hebt het recht om al jouw persoonlijke data te downloaden in een leesbaar formaat (AVG Art. 15).',
        whatIncluded: 'Wat is inbegrepen?',
        includeList: {
          profile: 'Profielinformatie',
          preferences: 'Reisvoorkeuren',
          savedPOIs: 'Opgeslagen POI\'s & favorieten',
          reviews: 'Reviews & beoordelingen',
          visitHistory: 'Bezoekgeschiedenis',
          activityLog: 'Activiteitenlog',
          consentSettings: 'Toestemming & privacy-instellingen',
        },
        format: 'Exportformaat',
        formatJSON: 'JSON (machine-leesbaar)',
        formatPDF: 'PDF (mens-leesbaar)',
        formatBoth: 'Beide formaten',
        requestButton: 'Data-export Aanvragen',
        validityNote: 'Exports zijn 7 dagen beschikbaar na generatie.',
      },
      settings: {
        security: 'Beveiliging',
        changePassword: 'Wachtwoord Wijzigen',
        twoFactor: 'Twee-Factor Authenticatie',
        twoFactorStatus: 'Niet ingeschakeld',
        notifications: 'Notificaties',
        emailNotifications: 'E-mailnotificaties',
        pushNotifications: 'Pushnotificaties',
        dangerZone: 'Punt van geen terugkeer',
        deleteData: 'Verwijder mijn Persoonlijke Data',
        deleteDataDesc: 'Account blijft met standaardinstellingen',
        deleteAccount: 'Verwijder mijn Account',
        deleteAccountDesc: 'Deze actie kan niet ongedaan worden gemaakt',
      },
      modals: {
        // Change Password Modal
        changePasswordTitle: 'Wachtwoord wijzigen',
        currentPassword: 'Huidig wachtwoord',
        newPassword: 'Nieuw wachtwoord',
        confirmPassword: 'Bevestig wachtwoord',
        passwordWeak: 'Zwak',
        passwordMedium: 'Gemiddeld',
        passwordStrong: 'Sterk',
        passwordRequirements: 'Minimaal 8 tekens, gebruik hoofdletters, cijfers en symbolen',
        passwordMismatch: 'Wachtwoorden komen niet overeen',
        passwordMatch: 'Wachtwoorden komen overeen',
        passwordError: 'Er is een fout opgetreden bij het wijzigen van je wachtwoord',
        changePassword: 'Wachtwoord wijzigen',
        // 2FA Modal
        twoFactorTitle: 'Twee-factor authenticatie',
        twoFactorIntroTitle: 'Beveilig je account',
        twoFactorIntroText: 'Voeg een extra beveiligingslaag toe aan je account door twee-factor authenticatie in te schakelen.',
        twoFactorBenefit1: 'Bescherming tegen ongeautoriseerde toegang',
        twoFactorBenefit2: 'Extra verificatie bij inloggen',
        twoFactorBenefit3: 'Backup codes voor noodgevallen',
        twoFactorScanInstructions: 'Scan de QR-code met je authenticator app (Google Authenticator, Authy, etc.)',
        hideSecret: 'Verberg geheime sleutel',
        showSecret: 'Toon geheime sleutel',
        recommendedApps: 'Aanbevolen apps',
        twoFactorVerifyInstructions: 'Voer de 6-cijferige code in die je authenticator app toont',
        enterCodeFromApp: 'De code vernieuwt elke 30 seconden',
        twoFactorEnabled: '2FA is succesvol ingeschakeld!',
        backupCodesTitle: 'Backup codes',
        backupCodesWarning: 'Bewaar deze codes veilig. Je kunt ze gebruiken om in te loggen als je geen toegang hebt tot je authenticator.',
        copied: 'Gekopieerd',
        copyAll: 'Kopieer alle codes',
        twoFactorActive: '2FA is actief',
        twoFactorActiveDesc: 'Je account is beveiligd met twee-factor authenticatie',
        disableWarning: 'Het uitschakelen van 2FA maakt je account minder veilig',
        twoFactorError: 'Ongeldige verificatiecode',
        twoFactorDisableError: 'Fout bij uitschakelen van 2FA',
        startSetup: 'Setup starten',
        verify: 'Verifieer',
        verifying: 'Verifiëren...',
        done: 'Klaar',
        keepEnabled: 'Ingeschakeld houden',
        disable2FA: '2FA uitschakelen',
        disabling: 'Uitschakelen...',
        // Delete Data Modal
        deleteDataTitle: 'Persoonlijke data verwijderen',
        deleteDataWarningTitle: 'Let op!',
        deleteDataWarningText: 'Je staat op het punt om al je persoonlijke data te verwijderen. Je account blijft actief met standaardinstellingen.',
        dataToBeDeleted: 'Wordt verwijderd',
        deleteDataItem1: 'Naam en profielfoto',
        deleteDataItem2: 'Voorkeuren en interesses',
        deleteDataItem3: 'Favorieten en opgeslagen POIs',
        deleteDataItem4: 'Bezoekgeschiedenis',
        deleteDataItem5: 'Reviews en beoordelingen',
        dataKept: 'Blijft behouden',
        keepDataItem1: 'E-mailadres (voor inloggen)',
        keepDataItem2: 'Account en wachtwoord',
        deleteDataInfo: 'Na verwijdering kun je opnieuw beginnen met een schone lei.',
        confirmDeleteData: 'Bevestig verwijdering',
        typeToConfirm: 'Typ DELETE DATA om te bevestigen',
        deleteDataError: 'Fout bij verwijderen van data',
        deleting: 'Verwijderen...',
        deleteData: 'Data verwijderen',
        // Delete Account Modal
        deleteAccountTitle: 'Account verwijderen',
        deleteAccountWarningTitle: 'Dit kan niet ongedaan worden!',
        deleteAccountWarningText: 'Je staat op het punt om je CalpeTrip account permanent te verwijderen.',
        gracePeriodTitle: '30 dagen bedenktijd',
        gracePeriodText: 'Je hebt 30 dagen om je verwijdering te annuleren door opnieuw in te loggen.',
        scheduledDeletion: 'Geplande verwijdering',
        permanentlyDeleted: 'Permanent verwijderd',
        deleteAccountItem1: 'Je volledige profiel en persoonlijke gegevens',
        deleteAccountItem2: 'Al je voorkeuren en instellingen',
        deleteAccountItem3: 'Je favorieten en opgeslagen items',
        deleteAccountItem4: 'Je reviews en beoordelingen',
        deleteAccountItem5: 'Toegang tot CalpeTrip',
        canCancelDeletion: 'Je kunt de verwijdering annuleren door binnen 30 dagen in te loggen.',
        whyLeaving: 'Waarom verlaat je ons?',
        helpUsImprove: 'Optioneel: Help ons verbeteren door je reden te delen',
        reasonNotUseful: 'Platform niet nuttig genoeg',
        reasonPrivacy: 'Privacyzorgen',
        reasonEmails: 'Te veel e-mails',
        reasonAlternative: 'Alternatief gevonden',
        reasonTemporary: 'Tijdelijk account',
        reasonOther: 'Anders',
        tellUsMore: 'Vertel ons meer...',
        confirmDeleteAccount: 'Bevestig accountverwijdering',
        typeDeleteToConfirm: 'Typ DELETE om te bevestigen',
        accountToDelete: 'Account dat verwijderd wordt',
        deleteAccountError: 'Fout bij verwijderen van account',
        keepAccount: 'Account behouden',
        deleteMyAccount: 'Account verwijderen',
        processing: 'Verwerken...',
        deletionScheduled: 'Verwijdering gepland',
        deletionScheduledText: 'Je account is gepland voor verwijdering. Je hebt 30 dagen om dit te annuleren.',
        cancelBeforeDate: 'Log in voor deze datum om te annuleren',
        confirmationEmailSent: 'Bevestigingsmail verzonden naar',
        understood: 'Begrepen',
        // Common
        cancel: 'Annuleren',
        back: 'Terug',
        next: 'Volgende',
        continue: 'Doorgaan',
        saving: 'Opslaan...',
      },
    },
    footer: {
      about: 'Over Ons',
      privacy: 'Privacybeleid',
      terms: 'Voorwaarden',
      contact: 'Contact',
      copyright: '© 2025 CalpeTrip. Powered by AI. Made with love for travelers.',
      platformTitle: 'Platform',
      supportTitle: 'Support',
      legalTitle: 'Juridisch',
      howItWorks: 'Hoe Het Werkt',
      pois: 'Ontdekken',
      faq: 'FAQ',
      help: 'Help',
      cookies: 'Cookies',
      tagline: 'Jouw Persoonlijke Butler aan de Costa Blanca',
      allRights: 'Alle rechten voorbehouden.',
      madeWith: 'Gemaakt met ❤️ in Costa Blanca',
      partners: 'Partners',
    },
    onboarding: {
      // Navigation
      back: 'Terug',
      skip: 'Overslaan',
      continue: 'Doorgaan →',
      // Progress
      stepOf: 'Stap',
      of: 'van',
      // Step 1: Travel Companion
      step1Title: 'Met wie reis je?',
      couple: 'Koppel',
      coupleDesc: 'Geniet van een romantische reis',
      family: 'Familie',
      familyDesc: 'Geweldig voor gezinsplezier',
      soloDesc: 'Ontdek op je eigen tempo',
      group: 'Groep',
      groupDesc: 'Perfect voor vrienden en collega\'s',
      // Step 2: Interests
      step2Title: 'Waar ben je naar op zoek in Calpe?',
      selectAll: '(Selecteer alles dat van toepassing is)',
      selected: 'Geselecteerd',
      option: 'optie',
      options: 'opties',
      relax: 'Relaxen',
      relaxDesc: 'Ontspannen en opladen',
      active: 'Actief',
      activeDesc: 'Avontuur en sport',
      culture: 'Cultuur',
      cultureDesc: 'Lokale kunst & creatieve ervaringen',
      food: 'Eten',
      foodDesc: 'Culinaire avonturen',
      nature: 'Natuur',
      natureDesc: 'Buitenactiviteiten',
      nightlife: 'Nachtleven',
      nightlifeDesc: 'Avondentertainment',
      history: 'Geschiedenis',
      historyDesc: 'Ontdek het verleden',
      shopping: 'Winkelen',
      shoppingDesc: 'Retailtherapie',
      // Step 3: Trip Context
      step3Title: 'Vertel ons over je reis',
      stayType: 'Type verblijf',
      pleasure: 'Vakantie',
      business: 'Zakelijk',
      visitStatus: 'Bezoekstatus',
      firstTime: 'Eerste keer',
      returning: 'Terugkerend bezoeker',
      localResident: 'Lokale bewoner',
      whenVisiting: 'Wanneer bezoek je?',
      tripDuration: 'Reisduur',
      duration1: '1-3 dagen (weekend)',
      duration2: '4-7 dagen (week)',
      duration3: '1-2 weken',
      duration4: '2+ weken',
      durationFlex: 'Flexibel/Weet nog niet',
      // Step 4: Optional
      optional: 'Optioneel',
      selectMultiple: '(Selecteer meerdere)',
      dietaryTitle: 'Dieetwensen?',
      vegetarian: 'Vegetarisch',
      vegan: 'Veganistisch',
      glutenFree: 'Glutenvrij',
      halal: 'Halal',
      kosher: 'Koosjer',
      lactoseFree: 'Lactosevrij',
      nutAllergies: 'Notenallergie',
      accessibilityTitle: 'Toegankelijkheidsbehoeften?',
      wheelchair: 'Rolstoeltoegankelijk',
      mobility: 'Mobiliteitshulp',
      visual: 'Visuele beperking',
      hearing: 'Gehoorbeperking',
      // Buttons
      finishExplore: 'Voltooien & Verkennen →',
      savePreferences: 'Voorkeuren Opslaan →',
      // Edit mode
      editMode: 'Je voorkeuren bewerken - Je huidige selecties worden hieronder getoond',
      cancelEdit: 'Bewerken annuleren en terug naar je account?',
      skipConfirm: 'Onboarding overslaan? Je kunt later voorkeuren instellen in je account.',
    },
    holibotChat: {
      welcome: 'Hoi! Ik ben CalpeChat 🌴',
      welcomeSubtitle: 'Jouw persoonlijke Calpe-gids. Hoe kan ik je helpen?',
      inputPlaceholder: 'Stel een vraag over Calpe...',
      quickActions: {
        itinerary: 'Programma samenstellen',
        locationInfo: 'Zoeken op Rubriek',
        directions: 'Routebeschrijving',
        dailyTip: 'Mijn Tip van de Dag',
      },
      prompts: {
        itinerary: 'Stel een dagprogramma voor mij samen op basis van mijn voorkeuren',
        locationInfo: 'Ik zoek informatie over een specifieke locatie',
        directions: 'Help me met de route naar een bestemming',
      },
      responses: {
        loading: 'Even denken...',
        error: 'Sorry, er ging iets mis. Probeer het opnieuw.',
        noResults: 'Geen resultaten gevonden. Probeer een andere zoekopdracht.',
        itineraryIntro: 'Hier is jouw gepersonaliseerde dagprogramma:',
        locationSearch: 'Welke locatie wil je meer over weten?',
        directionsHelp: 'Naar welke bestemming wil je navigeren?',
        yourItinerary: 'Jouw Programma',
        eventsAdded: 'evenement(en) toegevoegd',
      },
    },
  },
  en: {
    nav: {
      home: 'Home',
      explore: 'Explore',
      holibot: 'CalpeChat',
      agenda: 'Agenda',
      reservations: 'Reservations',
      tickets: 'Tickets',
      favorites: 'Favorites',
      account: 'Account',
      about: 'About',
      faq: 'FAQ',
    },
    agenda: {
      title: 'Calpe Agenda',
      subtitle: 'Discover all events, festivals and activities in Calpe',
      categories: {
        all: 'All',
        festival: 'Festivals',
        music: 'Music',
        gastronomy: 'Gastronomy',
        market: 'Markets',
        wellness: 'Wellness',
        adventure: 'Adventure',
      },
      noEvents: 'No events found for this category.',
      loadMore: 'Load More Events',
      moreInfo: 'More info',
      newsletter: {
        title: "Don't miss any event!",
        description: 'Subscribe to our newsletter and receive the best events in Calpe weekly.',
        placeholder: 'Your email address',
        button: 'Subscribe',
      },
    },
    reservations: {
      title: 'Restaurant Reservations',
      subtitle: 'Discover and book at the best restaurants in Calpe',
      searchPlaceholder: 'Search restaurant or cuisine...',
      persons: 'guests',
      person: 'guest',
      time: 'Time',
      cuisines: {
        all: 'All',
        mediterranean: 'Mediterranean',
        spanish: 'Spanish',
        italian: 'Italian',
        japanese: 'Japanese',
        seafood: 'Seafood',
        vegan: 'Vegan',
      },
      found: 'restaurants found',
      reserveNow: 'Reserve Now',
      modal: {
        title: 'Reserve at',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        guests: 'Number of guests',
        date: 'Date',
        time: 'Time',
        selectTime: 'Select time',
        specialRequests: 'Special requests',
        submit: 'Confirm Reservation',
      },
    },
    tickets: {
      title: 'Tickets & Activities',
      subtitle: 'Book tickets for the best attractions and activities in Calpe',
      searchPlaceholder: 'Search events...',
      available: 'available',
      buyTickets: 'Buy tickets',
      selectTickets: 'Select Tickets',
      orderSummary: 'Order Summary',
      total: 'Total',
      continueToCheckout: 'Continue to Checkout',
      guestInformation: 'Guest Information',
      name: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      event: 'Event',
      tickets: 'tickets',
      processing: 'Processing...',
      proceedToPayment: 'Proceed to Payment',
      payment: 'Payment',
      loadingPayment: 'Loading payment methods...',
      bookingConfirmed: 'Booking Confirmed!',
      confirmationMessage: 'Your tickets have been booked successfully.',
      bookingReference: 'Booking Reference',
      emailSent: 'A confirmation email has been sent to',
      browseMoreEvents: 'Browse More Events',
    },
    homepage: {
      hero: {
        title: 'Your stay, your style.',
        payoff: 'Discover Calpe with your personal Calpe Assistant',
        subtitle: 'Experience this Mediterranean jewel fully tailored to you',
      },
      why: {
        title: 'Why CalpeTrip?',
      },
      usps: {
        partner: { title: 'Official Partner', description: 'Official Partner Calpe Turismo' },
        ai: { title: 'Calpe AI-Assistant', description: 'HolidAIButler: Your (hyper) personal Butler' },
        local: { title: '100% Local', description: 'Support Calpe economy & identity' },
        realtime: { title: 'Realtime accurate info', description: 'About locations, events, activities and weather' },
        trusted: { title: 'Trusted & Safe', description: 'Data till payment: we care about your Privacy' },
      },
      cta: {
        explore: '🗺️ Explore Calpe',
        agenda: '📅 Agenda',
      },
      features: {
        aiAssistant: {
          title: 'AI-Powered Assistant',
          description: 'CalpeChat understands your preferences and provides personalized recommendations for restaurants, activities, and hidden gems.'
        },
        localPois: {
          title: '1,600+ Local POIs',
          description: 'Discover authentic experiences curated by locals. From beaches to museums, restaurants to nightlife - we\'ve got you covered.'
        },
        tailored: {
          title: 'Tailored to You',
          description: 'Tell us about your travel style, preferences, and interests. We\'ll customize your experience to match your perfect holiday.'
        },
        account: {
          title: 'Your Travel Hub',
          description: 'Save favorites, track visits, manage preferences, and control your privacy - all in one place.'
        },
      },
      rating: {
        score: 'Based on 2,500+ traveler reviews',
        text: '4.8 / 5.0',
        button: 'Read Reviews',
      },
    },
    poi: {
      searchPlaceholder: 'Search POIs, restaurants, beaches...',
      filters: 'Filters',
      loadMore: 'Load More POIs',
      noResults: 'No POIs Found',
      noResultsDesc: 'Try adjusting your search or category filter',
      noReviews: 'No reviews available',
      moreInfo: 'More Info',
      share: 'Share',
      agenda: 'Agenda',
      map: 'Map',
      details: 'Details',
      call: 'Call',
      directions: 'Directions',
      save: 'Save',
      saved: 'Saved',
      print: 'Print',
      visitWebsite: 'Visit Website',
      about: 'About',
      openingHours: 'Opening Hours',
      contact: 'Contact',
      highlights: 'Highlights',
      perfectFor: 'Perfect for',
      readMore: 'Read more',
      readLess: 'Read less',
      shareCopied: 'Link copied to clipboard!',
      shareSuccess: 'Shared successfully!',
      addedToFavorites: 'Added to favorites!',
      removedFromFavorites: 'Removed from favorites',
      categoryHighlights: {
        active: ['Outdoor activities', 'Adventure sports', 'Physical fitness'],
        beaches: ['Scenic views', 'Relaxation', 'Natural beauty'],
        culture: ['Historical significance', 'Cultural heritage', 'Educational'],
        recreation: ['Entertainment', 'Family-friendly', 'Fun activities'],
        food: ['Local cuisine', 'Dining experience', 'Taste & flavor'],
        health: ['Wellness', 'Self-care', 'Health services'],
        shopping: ['Shopping experience', 'Local products', 'Retail therapy'],
        practical: ['Essential services', 'Convenience', 'Practical needs'],
        default: ['Great experience', 'Worth visiting', 'Popular choice'],
      },
      categoryPerfectFor: {
        active: ['Sports enthusiasts', 'Adventure seekers', 'Fitness lovers'],
        beaches: ['Beach lovers', 'Nature enthusiasts', 'Photographers'],
        culture: ['History buffs', 'Culture lovers', 'Educational trips'],
        recreation: ['Families', 'Groups', 'Entertainment seekers'],
        food: ['Foodies', 'Culinary explorers', 'Social dining'],
        health: ['Wellness seekers', 'Spa lovers', 'Health conscious'],
        shopping: ['Shoppers', 'Souvenir hunters', 'Fashion lovers'],
        practical: ['Travelers', 'Local residents', 'Anyone needing services'],
        default: ['All visitors', 'Travelers', 'Local explorers'],
      },
      budgetLabels: {
        budget: 'Budget-friendly',
        midRange: 'Mid-range',
        upscale: 'Upscale',
        luxury: 'Luxury',
        priceLevel: 'Price Level',
      },
      openingStatus: {
        open: 'Open now',
        closed: 'Closed',
        closesAt: 'Closes at',
        closedToday: 'Closed today',
        available: 'Available',
      },
      amenities: {
        title: 'Amenities',
        wheelchairAccessible: 'Wheelchair Accessible',
        freeWifi: 'Free WiFi Available',
        creditCards: 'Accepts Credit Cards',
        noDetails: 'No additional details available',
        featureNames: {
          'Wheelchair accessible entrance': 'Wheelchair accessible entrance',
          'Wheelchair accessible parking lot': 'Wheelchair accessible parking lot',
          'Wheelchair accessible restroom': 'Wheelchair accessible restroom',
          'Wheelchair accessible seating': 'Wheelchair accessible seating',
          'Bar onsite': 'Bar onsite',
          'Restroom': 'Restroom',
          'Wi-Fi': 'Wi-Fi',
          'Free Wi-Fi': 'Free Wi-Fi',
          'Good for kids': 'Good for kids',
          'High chairs': 'High chairs',
          'Dogs allowed': 'Dogs allowed',
          'Gender-neutral restroom': 'Gender-neutral restroom',
          'Free parking lot': 'Free parking lot',
          'Free street parking': 'Free street parking',
          'Paid parking lot': 'Paid parking lot',
          'Paid street parking': 'Paid street parking',
          'Parking garage': 'Parking garage',
          'Valet parking': 'Valet parking',
          'Dine-in': 'Dine-in',
          'Takeout': 'Takeout',
          'Delivery': 'Delivery',
          'Outdoor seating': 'Outdoor seating',
          'Live music': 'Live music',
          'Reservations': 'Reservations',
          'Private dining': 'Private dining',
          'Happy hour': 'Happy hour',
          'Brunch': 'Brunch',
          'Lunch': 'Lunch',
          'Dinner': 'Dinner',
          'Breakfast': 'Breakfast',
          'Dessert': 'Dessert',
          'Coffee': 'Coffee',
          'Cocktails': 'Cocktails',
          'Beer': 'Beer',
          'Wine': 'Wine',
          'Organic': 'Organic',
          'Vegetarian options': 'Vegetarian options',
          'Vegan options': 'Vegan options',
        },
      },
      gallery: {
        noPhotos: 'No photos available',
        showAllPhotos: 'Show all photos',
        allPhotos: 'All',
      },
      loadingStates: {
        loadingDetails: 'Loading POI details...',
        notFound: 'POI Not Found',
        notFoundDescription: 'The POI you are looking for does not exist.',
      },
      comparison: {
        compare: 'Compare',
        comparing: 'Comparing',
        addToCompare: 'Add to comparison',
        removeFromCompare: 'Remove from comparison',
        compareTitle: 'POI Comparison',
        selectedCount: '{count} POI(s) selected',
        maxReached: 'Maximum 3 POIs can be compared',
        clearAll: 'Clear all',
        noItemsSelected: 'No POIs selected',
        selectToCompare: 'Select 2-3 POIs to compare',
        hint: 'Click the compare icon on POIs to add them',
      },
    },
    categories: {
      // Calpe categories
      active: 'Active',
      beaches: 'Beaches & Nature',
      culture: 'Culture & History',
      recreation: 'Recreation',
      food: 'Food & Drinks',
      health: 'Health & Wellbeing',
      shopping: 'Shopping',
      practical: 'Practical',
      // Texel categories
      actief: 'Active',
      cultuur: 'Culture & History',
      eten: 'Food & Drinks',
      gezondheid: 'Health & Wellness',
      natuur: 'Nature',
      praktisch: 'Practical',
      winkelen: 'Shopping',
    },
    reviews: {
      title: 'Reviews',
      travelParty: {
        all: 'All Travelers',
        couples: 'Couples',
        families: 'Families',
        solo: 'Solo Travelers',
        friends: 'Friends',
        business: 'Business',
      },
      sort: {
        recent: 'Most Recent',
        helpful: 'Most Helpful',
        highRating: 'Highest Rating',
        lowRating: 'Lowest Rating',
      },
      sentiment: {
        positive: 'Positive',
        neutral: 'Neutral',
        negative: 'Negative',
      },
      filterByTraveler: 'Filter by Traveler Type',
      filterBySentiment: 'Filter by Sentiment',
      sortBy: 'Sort By',
      helpful: 'Helpful',
      noReviews: 'No reviews yet',
      writeReview: 'Write a Review',
      readMore: 'Read more',
      showLess: 'Show less',
      visited: 'Visited',
      loadingReviews: 'Loading reviews...',
      loadMoreReviews: 'Load More Reviews',
      reviewCount: 'reviews',
      averageRating: 'Average rating',
      review: 'review',
      allReviews: 'All Reviews',
      beFirstToShare: 'Be the first to share your experience!',
      failedToLoad: 'Failed to load reviews. Please try again.',
      tryAgain: 'Try Again',
      noMatchFilters: 'No reviews match your filters',
      adjustFilters: 'Try adjusting your filter settings to see more reviews.',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: '{n} days ago',
      weeksAgo: '{n} weeks ago',
      weekAgo: '1 week ago',
      monthsAgo: '{n} months ago',
      monthAgo: '1 month ago',
      yearsAgo: '{n} years ago',
      yearAgo: '1 year ago',
      writeReviewModal: {
        title: 'Write a Review',
        close: 'Close',
        yourRating: 'Your Rating',
        travelPartyLabel: 'Travel Party',
        solo: 'Solo',
        couple: 'Couple',
        family: 'Family',
        friends: 'Friends',
        business: 'Business',
        yourReview: 'Your Review',
        placeholder: 'Share your experience at this place... (minimum 50 characters)',
        characters: 'characters',
        minimum: 'minimum 50',
        addPhoto: 'Add a Photo (Optional)',
        uploadPhoto: 'Upload Photo',
        submitting: 'Submitting...',
        submitReview: 'Submit Review',
        success: 'Review submitted successfully!',
        error: 'Failed to submit review. Please try again.',
        selectRating: 'Please select a rating',
        selectTravelParty: 'Please select your travel party',
        minChars: 'Review must be at least 50 characters',
        uploadImageOnly: 'Please upload an image file',
        imageTooLarge: 'Image must be less than 5MB',
      },
    },
    common: {
      save: 'Save',
      close: 'Close',
      apply: 'Apply',
      reset: 'Reset',
      loading: 'Loading...',
      back: 'Back',
      optional: 'optional',
    },
    account: {
      tabs: {
        profile: 'Profile',
        preferences: 'Preferences',
        ai: 'AI',
        privacy: 'Privacy',
        export: 'Export',
        settings: 'Settings',
        favorites: 'Favorites',
        visited: 'Visited',
        reviews: 'Reviews',
      },
      profile: {
        memberSince: 'Member since',
        butlerFanSince: 'Butler fan since',
        clickAvatarHint: 'Click avatar to upload photo',
        changePhoto: 'Change Photo',
        quickActions: 'Quick Actions',
        savedPOIs: 'Saved POIs',
        favorites: 'Favorites',
        visits: 'Visits',
        reviews: 'Reviews',
        comingSoon: 'Coming soon',
      },
      favorites: {
        title: 'Favorites',
        infoText: 'Your saved POIs and events in one place.',
        poiTitle: 'Favorite POIs',
        eventsTitle: 'Favorite Events',
        emptyPois: 'You haven\'t saved any favorite POIs yet.',
        emptyEvents: 'You haven\'t saved any favorite events yet.',
        discoverPois: 'Discover POIs →',
        viewAgenda: 'View Agenda →',
        viewAll: 'View all',
      },
      visited: {
        title: 'Visited Places',
        infoText: 'Automatically tracked when you view POIs and events.',
        poisTitle: 'Visited POIs',
        eventsTitle: 'Visited Events',
        emptyPois: 'Visited POIs tracking will be activated soon.',
        emptyEvents: 'Visited events tracking will be activated soon.',
        trackingInfo: 'Your visit history will be automatically tracked when you view POIs.',
      },
      reviews: {
        title: 'My Reviews',
        infoText: 'View and edit your written reviews.',
        empty: 'You haven\'t written any reviews yet.',
        emptyHint: 'Share your experiences and help other travelers!',
        discoverToReview: 'Discover POIs to review →',
      },
      preferences: {
        title: 'Travel Preferences',
        travelingAs: 'Traveling as',
        interests: 'Interests',
        dietary: 'Dietary',
        editButton: 'Edit Preferences',
        asCouple: 'As a couple',
        foodDrinks: 'Food & Drinks',
        beaches: 'Beaches',
        culture: 'Culture',
        vegetarian: 'Vegetarian',
      },
      ai: {
        title: 'AI-Powered Personalization',
        subtitle: 'AI Features',
        infoText: 'We use local data, but also AI to personalize and optimize your recommendations. You have 100% control over how AI is used',
        features: 'AI Features',
        personalizedRecs: 'Personalized Recommendations',
        personalizedRecsDesc: 'Use AI to suggest POIs',
        smartFilters: 'Smart Filters',
        smartFiltersDesc: 'AI-powered search filters',
        behavioralLearning: 'Behavioral Learning',
        behavioralLearningDesc: 'Learn from your interactions',
        howItWorks: 'How does AI personalization work?',
      },
      privacy: {
        title: 'Your privacy matters to us',
        subtitle: 'Data stored on your device • Auto-delete after 30 days • 100% safety',
        dataCollection: 'Data Collection & Consent',
        essentialCookies: 'Essential Cookies',
        essentialCookiesDesc: 'Required for site to work',
        required: 'REQUIRED',
        analytics: 'Analytics',
        analyticsDesc: 'Understand site usage',
        personalization: 'Personalization',
        personalizationDesc: 'Improve recommendations',
        marketing: 'Marketing',
        marketingDesc: 'Promotional emails',
        updateButton: 'Update Consent Settings',
      },
      export: {
        title: 'Download Your Data',
        infoText: 'You have the right to download all your personal data in a readable format (GDPR Art. 15).',
        whatIncluded: 'What\'s included?',
        includeList: {
          profile: 'Profile information',
          preferences: 'Travel preferences',
          savedPOIs: 'Saved POIs & favorites',
          reviews: 'Reviews & ratings',
          visitHistory: 'Visit history',
          activityLog: 'Account activity log',
          consentSettings: 'Consent & privacy settings',
        },
        format: 'Export Format',
        formatJSON: 'JSON (machine-readable)',
        formatPDF: 'PDF (human-readable)',
        formatBoth: 'Both formats',
        requestButton: 'Request Data Export',
        validityNote: 'Exports are available for 7 days after generation.',
      },
      settings: {
        security: 'Security',
        changePassword: 'Change Password',
        twoFactor: 'Two-Factor Authentication',
        twoFactorStatus: 'Not enabled',
        notifications: 'Notifications',
        emailNotifications: 'Email Notifications',
        pushNotifications: 'Push Notifications',
        dangerZone: 'Point of no return',
        deleteData: 'Delete my Personal Data',
        deleteDataDesc: 'Account remains with standard settings',
        deleteAccount: 'Delete my Account',
        deleteAccountDesc: 'This action cannot be undone',
      },
      modals: {
        changePasswordTitle: 'Change Password',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm password',
        passwordWeak: 'Weak',
        passwordMedium: 'Medium',
        passwordStrong: 'Strong',
        passwordRequirements: 'Minimum 8 characters, use uppercase, numbers and symbols',
        passwordMismatch: 'Passwords do not match',
        passwordMatch: 'Passwords match',
        passwordError: 'An error occurred while changing your password',
        changePassword: 'Change Password',
        twoFactorTitle: 'Two-Factor Authentication',
        twoFactorIntroTitle: 'Secure your account',
        twoFactorIntroText: 'Add an extra layer of security to your account by enabling two-factor authentication.',
        twoFactorBenefit1: 'Protection against unauthorized access',
        twoFactorBenefit2: 'Extra verification when logging in',
        twoFactorBenefit3: 'Backup codes for emergencies',
        twoFactorScanInstructions: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
        hideSecret: 'Hide secret key',
        showSecret: 'Show secret key',
        recommendedApps: 'Recommended apps',
        twoFactorVerifyInstructions: 'Enter the 6-digit code shown in your authenticator app',
        enterCodeFromApp: 'The code refreshes every 30 seconds',
        twoFactorEnabled: '2FA has been successfully enabled!',
        backupCodesTitle: 'Backup codes',
        backupCodesWarning: 'Store these codes safely. You can use them to log in if you lose access to your authenticator.',
        copied: 'Copied',
        copyAll: 'Copy all codes',
        twoFactorActive: '2FA is active',
        twoFactorActiveDesc: 'Your account is protected with two-factor authentication',
        disableWarning: 'Disabling 2FA makes your account less secure',
        twoFactorError: 'Invalid verification code',
        twoFactorDisableError: 'Error disabling 2FA',
        startSetup: 'Start Setup',
        verify: 'Verify',
        verifying: 'Verifying...',
        done: 'Done',
        keepEnabled: 'Keep Enabled',
        disable2FA: 'Disable 2FA',
        disabling: 'Disabling...',
        deleteDataTitle: 'Delete Personal Data',
        deleteDataWarningTitle: 'Warning!',
        deleteDataWarningText: 'You are about to delete all your personal data. Your account will remain active with default settings.',
        dataToBeDeleted: 'Will be deleted',
        deleteDataItem1: 'Name and profile photo',
        deleteDataItem2: 'Preferences and interests',
        deleteDataItem3: 'Favorites and saved POIs',
        deleteDataItem4: 'Visit history',
        deleteDataItem5: 'Reviews and ratings',
        dataKept: 'Will be kept',
        keepDataItem1: 'Email address (for login)',
        keepDataItem2: 'Account and password',
        deleteDataInfo: 'After deletion you can start fresh with a clean slate.',
        confirmDeleteData: 'Confirm deletion',
        typeToConfirm: 'Type DELETE DATA to confirm',
        deleteDataError: 'Error deleting data',
        deleting: 'Deleting...',
        deleteData: 'Delete Data',
        deleteAccountTitle: 'Delete Account',
        deleteAccountWarningTitle: 'This cannot be undone!',
        deleteAccountWarningText: 'You are about to permanently delete your CalpeTrip account.',
        gracePeriodTitle: '30-day grace period',
        gracePeriodText: 'You have 30 days to cancel the deletion by logging in again.',
        scheduledDeletion: 'Scheduled deletion',
        permanentlyDeleted: 'Permanently deleted',
        deleteAccountItem1: 'Your complete profile and personal data',
        deleteAccountItem2: 'All your preferences and settings',
        deleteAccountItem3: 'Your favorites and saved items',
        deleteAccountItem4: 'Your reviews and ratings',
        deleteAccountItem5: 'Access to CalpeTrip',
        canCancelDeletion: 'You can cancel the deletion by logging in within 30 days.',
        whyLeaving: 'Why are you leaving?',
        helpUsImprove: 'Optional: Help us improve by sharing your reason',
        reasonNotUseful: 'Platform not useful enough',
        reasonPrivacy: 'Privacy concerns',
        reasonEmails: 'Too many emails',
        reasonAlternative: 'Found an alternative',
        reasonTemporary: 'Temporary account',
        reasonOther: 'Other',
        tellUsMore: 'Tell us more...',
        confirmDeleteAccount: 'Confirm account deletion',
        typeDeleteToConfirm: 'Type DELETE to confirm',
        accountToDelete: 'Account to be deleted',
        deleteAccountError: 'Error deleting account',
        keepAccount: 'Keep Account',
        deleteMyAccount: 'Delete Account',
        processing: 'Processing...',
        deletionScheduled: 'Deletion scheduled',
        deletionScheduledText: 'Your account is scheduled for deletion. You have 30 days to cancel this.',
        cancelBeforeDate: 'Log in before this date to cancel',
        confirmationEmailSent: 'Confirmation email sent to',
        understood: 'Understood',
        cancel: 'Cancel',
        back: 'Back',
        next: 'Next',
        continue: 'Continue',
        saving: 'Saving...',
      },
    },
    auth: {
      login: {
        title: 'CalpeTrip',
        subtitle: 'Welcome back! Log in to your account',
        emailLabel: 'Email address',
        emailPlaceholder: 'your.email@example.com',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Enter your password',
        forgotPassword: 'Forgot password?',
        signInButton: 'Sign In',
        signingIn: 'Signing in...',
        noAccount: 'Don\'t have an account?',
        signUp: 'Sign up',
        backToHome: 'Back to home',
        errorFillFields: 'Please fill in all fields',
        errorInvalidCredentials: 'Invalid email or password. Please try again.',
        errorGeneric: 'Login failed. Please try again later.',
      },
      signup: {
        title: 'CalpeTrip',
        subtitle: 'Create your account',
        nameLabel: 'Full name',
        namePlaceholder: 'Your full name',
        emailLabel: 'Email address',
        emailPlaceholder: 'your.email@example.com',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Choose a secure password',
        confirmPasswordLabel: 'Confirm password',
        confirmPasswordPlaceholder: 'Re-enter your password',
        termsText: 'I agree to the',
        termsLink: 'Terms of Service',
        and: 'and',
        privacyLink: 'Privacy Policy',
        signUpButton: 'Create Account',
        signingUp: 'Creating account...',
        haveAccount: 'Already have an account?',
        signIn: 'Sign in',
        backToHome: 'Back to home',
        errorFillFields: 'Please fill in all fields',
        errorPasswordMismatch: 'Passwords do not match',
        errorPasswordTooShort: 'Password must be at least 8 characters',
        errorEmailExists: 'An account with this email already exists. Please login instead.',
        errorGeneric: 'Signup failed. Please try again later.',
        passwordRequirements: {
          title: 'Password must contain:',
          minLength: 'At least 8 characters',
          uppercase: 'At least 1 uppercase letter',
          lowercase: 'At least 1 lowercase letter',
          number: 'At least 1 number',
          special: 'At least 1 special character (!@#$%^&*)',
        },
        verificationSent: {
          title: 'Check your email',
          sentTo: 'We have sent a verification email to:',
          instruction: 'Click the link in the email to activate your account. Also check your spam folder if you don\'t see the email.',
          goToLogin: 'Go to login',
          noEmail: 'Didn\'t receive an email?',
        },
      },
      verifyEmail: {
        verifying: 'Verifying email...',
        verifyingText: 'Please wait, we are checking your verification link.',
        success: 'Email verified!',
        successMessage: 'Your email address has been successfully verified. You can now log in.',
        alreadyVerified: 'Already verified',
        alreadyVerifiedMessage: 'This email address has already been verified. You can log in.',
        failed: 'Verification failed',
        failedMessage: 'An error occurred during verification. Please try again or request a new verification email.',
        goToLogin: 'Go to login',
        requestNew: 'Request new verification email',
        backToLogin: 'Back to login',
      },
      resendVerification: {
        title: 'Resend verification email',
        subtitle: 'Enter your email address to receive a new verification email.',
        emailLabel: 'Email address',
        emailPlaceholder: 'name@example.com',
        sendButton: 'Send verification email',
        sending: 'Sending...',
        success: 'Verification email sent',
        successMessage: 'If this email address is registered with us, you will receive a verification email within a few minutes. Also check your spam folder.',
        backToLogin: 'Back to login',
        errorEmpty: 'Please enter your email address',
        errorTooMany: 'You have requested too many verification emails. Please try again in an hour.',
        errorGeneric: 'An error occurred',
      },
    },
    footer: {
      about: 'About Us',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      contact: 'Contact',
      copyright: '© 2025 CalpeTrip. Powered by AI. Made with love for travelers.',
      platformTitle: 'Platform',
      supportTitle: 'Support',
      legalTitle: 'Legal',
      howItWorks: 'How It Works',
      pois: 'Explore',
      faq: 'FAQ',
      help: 'Help',
      cookies: 'Cookies',
      tagline: 'Your Personal Butler on the Costa Blanca',
      allRights: 'All rights reserved.',
      madeWith: 'Made with ❤️ in Costa Blanca',
      partners: 'Partners',
    },
    onboarding: {
      // Navigation
      back: 'Back',
      skip: 'Skip',
      continue: 'Continue →',
      // Progress
      stepOf: 'Step',
      of: 'of',
      // Step 1: Travel Companion
      step1Title: 'Who are you traveling with?',
      couple: 'Couple',
      coupleDesc: 'Enjoying a romantic trip',
      family: 'Family',
      familyDesc: 'Great for family fun and bonding',
      soloDesc: 'Explore at your own pace',
      group: 'Group',
      groupDesc: 'Perfect for friends and colleagues',
      // Step 2: Interests
      step2Title: 'What are you looking for in Calpe?',
      selectAll: '(Select all that apply)',
      selected: 'Selected',
      option: 'option',
      options: 'options',
      relax: 'Relax',
      relaxDesc: 'Unwind and recharge',
      active: 'Active',
      activeDesc: 'Adventure and sports',
      culture: 'Culture',
      cultureDesc: 'Local arts & creative experiences',
      food: 'Food',
      foodDesc: 'Culinary adventures',
      nature: 'Nature',
      natureDesc: 'Outdoor exploration',
      nightlife: 'Nightlife',
      nightlifeDesc: 'Evening entertainment',
      history: 'History',
      historyDesc: 'Discover the past',
      shopping: 'Shopping',
      shoppingDesc: 'Retail therapy',
      // Step 3: Trip Context
      step3Title: 'Tell us about your trip',
      stayType: 'Type of stay',
      pleasure: 'Pleasure',
      business: 'Business',
      visitStatus: 'Visit status',
      firstTime: 'First time',
      returning: 'Returning visitor',
      localResident: 'Local resident',
      whenVisiting: 'When are you visiting?',
      tripDuration: 'Trip duration',
      duration1: '1-3 days (weekend)',
      duration2: '4-7 days (week)',
      duration3: '1-2 weeks',
      duration4: '2+ weeks',
      durationFlex: 'Flexible/Not sure',
      // Step 4: Optional
      optional: 'Optional',
      selectMultiple: '(Select multiple)',
      dietaryTitle: 'Any dietary requirements?',
      vegetarian: 'Vegetarian',
      vegan: 'Vegan',
      glutenFree: 'Gluten-free',
      halal: 'Halal',
      kosher: 'Kosher',
      lactoseFree: 'Lactose-free',
      nutAllergies: 'Nut allergies',
      accessibilityTitle: 'Accessibility needs?',
      wheelchair: 'Wheelchair accessible',
      mobility: 'Mobility assistance',
      visual: 'Visual impairment',
      hearing: 'Hearing impairment',
      // Buttons
      finishExplore: 'Finish & Explore →',
      savePreferences: 'Save Preferences →',
      // Edit mode
      editMode: 'Editing your preferences - Your current selections are shown below',
      cancelEdit: 'Cancel editing preferences and return to your account?',
      skipConfirm: 'Skip onboarding? You can set preferences later in your account.',
    },
    holibotChat: {
      welcome: 'Hi! I\'m CalpeChat 🌴',
      welcomeSubtitle: 'Your personal Calpe guide. How can I help you?',
      inputPlaceholder: 'Ask a question about Calpe...',
      quickActions: {
        itinerary: 'Build my itinerary',
        locationInfo: 'Browse Categories',
        directions: 'Get directions',
        dailyTip: 'My Daily Tip',
      },
      prompts: {
        itinerary: 'Create a day program for me based on my preferences',
        locationInfo: 'I\'m looking for information about a specific location',
        directions: 'Help me with directions to a destination',
      },
      responses: {
        loading: 'Thinking...',
        error: 'Sorry, something went wrong. Please try again.',
        noResults: 'No results found. Try a different search.',
        itineraryIntro: 'Here\'s your personalized day program:',
        locationSearch: 'Which location would you like to know more about?',
        directionsHelp: 'Which destination would you like directions to?',
        yourItinerary: 'Your Itinerary',
        eventsAdded: 'event(s) added',
      },
    },
  },
  de: {
    nav: {
      home: 'Startseite',
      explore: 'Erkunden',
      holibot: 'CalpeChat',
      agenda: 'Terminkalender',
      reservations: 'Reservierungen',
      tickets: 'Tickets',
      favorites: 'Favoriten',
      account: 'Konto',
      about: 'Über',
      faq: 'FAQ',
    },
    agenda: {
      title: 'Terminkalender Calpe',
      subtitle: 'Entdecken Sie alle Veranstaltungen, Festivals und Aktivitäten in Calpe',
      categories: {
        all: 'Alle',
        festival: 'Festivals',
        music: 'Musik',
        gastronomy: 'Gastronomie',
        market: 'Märkte',
        wellness: 'Wellness',
        adventure: 'Abenteuer',
      },
      noEvents: 'Keine Veranstaltungen für diese Kategorie gefunden.',
      loadMore: 'Mehr Events laden',
      moreInfo: 'Mehr Info',
      newsletter: {
        title: 'Verpassen Sie keine Veranstaltung!',
        description: 'Melden Sie sich für unseren Newsletter an und erhalten Sie wöchentlich die besten Veranstaltungen in Calpe.',
        placeholder: 'Ihre E-Mail-Adresse',
        button: 'Abonnieren',
      },
    },
    reservations: {
      title: 'Restaurant-Reservierungen',
      subtitle: 'Entdecken und reservieren Sie in den besten Restaurants in Calpe',
      searchPlaceholder: 'Restaurant oder Küche suchen...',
      persons: 'Personen',
      person: 'Person',
      time: 'Uhrzeit',
      cuisines: {
        all: 'Alle',
        mediterranean: 'Mediterran',
        spanish: 'Spanisch',
        italian: 'Italienisch',
        japanese: 'Japanisch',
        seafood: 'Meeresfrüchte',
        vegan: 'Vegan',
      },
      found: 'Restaurants gefunden',
      reserveNow: 'Jetzt Reservieren',
      modal: {
        title: 'Reservieren bei',
        name: 'Name',
        email: 'E-Mail',
        phone: 'Telefon',
        guests: 'Anzahl der Gäste',
        date: 'Datum',
        time: 'Uhrzeit',
        selectTime: 'Uhrzeit auswählen',
        specialRequests: 'Besondere Wünsche',
        submit: 'Reservierung Bestätigen',
      },
    },
    tickets: {
      title: 'Tickets & Aktivitäten',
      subtitle: 'Buchen Sie Tickets für die besten Attraktionen und Aktivitäten in Calpe',
      searchPlaceholder: 'Veranstaltungen suchen...',
      available: 'verfügbar',
      buyTickets: 'Tickets kaufen',
      selectTickets: 'Tickets auswählen',
      orderSummary: 'Bestellübersicht',
      total: 'Gesamt',
      continueToCheckout: 'Weiter zur Kasse',
      guestInformation: 'Gastinformationen',
      name: 'Vollständiger Name',
      email: 'E-Mail',
      phone: 'Telefon',
      event: 'Veranstaltung',
      tickets: 'Tickets',
      processing: 'Verarbeitung...',
      proceedToPayment: 'Zur Zahlung',
      payment: 'Zahlung',
      loadingPayment: 'Zahlungsmethoden laden...',
      bookingConfirmed: 'Buchung bestätigt!',
      confirmationMessage: 'Ihre Tickets wurden erfolgreich gebucht.',
      bookingReference: 'Buchungsreferenz',
      emailSent: 'Eine Bestätigungsmail wurde gesendet an',
      browseMoreEvents: 'Weitere Veranstaltungen',
    },
    homepage: {
      hero: {
        title: 'Ihr Aufenthalt, Ihr Stil.',
        payoff: 'Entdecken Sie Calpe mit Ihrem persönlichen Calpe-Assistenten',
        subtitle: 'Erleben Sie dieses mediterrane Juwel vollständig auf Sie zugeschnitten',
      },
      why: {
        title: 'Warum CalpeTrip?',
      },
      usps: {
        partner: { title: 'Offizieller Partner', description: 'Offizieller Partner Calpe Turismo' },
        ai: { title: 'Calpe KI-Assistent', description: 'HolidAIButler: Ihr (hyper) persönlicher Butler' },
        local: { title: '100% Lokal', description: 'Unterstützen Sie Calpes Wirtschaft & Identität' },
        realtime: { title: 'Echtzeit, präzise Informationen', description: 'Über Orte, Veranstaltungen, Aktivitäten und Wetter' },
        trusted: { title: 'Vertrauenswürdig & Sicher', description: 'Von Daten bis Zahlung: Ihre Privatsphäre liegt uns am Herzen' },
      },
      cta: {
        explore: '🗺️ Calpe Erkunden',
        agenda: '📅 Terminkalender',
      },
      features: {
        aiAssistant: {
          title: 'KI-gestützter Assistent',
          description: 'CalpeChat versteht Ihre Vorlieben und bietet personalisierte Empfehlungen für Restaurants, Aktivitäten und versteckte Perlen.'
        },
        localPois: {
          title: '1.600+ lokale POIs',
          description: 'Entdecken Sie authentische Erlebnisse, kuratiert von Einheimischen. Von Stränden bis Museen, Restaurants bis Nachtleben - wir haben alles für Sie.'
        },
        tailored: {
          title: 'Maßgeschneidert für Sie',
          description: 'Erzählen Sie uns von Ihrem Reisestil, Vorlieben und Interessen. Wir passen Ihr Erlebnis an Ihren perfekten Urlaub an.'
        },
        account: {
          title: 'Ihr Reise-Hub',
          description: 'Speichern Sie Favoriten, verfolgen Sie Besuche, verwalten Sie Einstellungen und kontrollieren Sie Ihre Privatsphäre - alles an einem Ort.'
        },
      },
      rating: {
        score: 'Basierend auf 2.500+ Reisendenbewertungen',
        text: '4.8 / 5.0',
        button: 'Bewertungen Lesen',
      },
    },
    poi: {
      searchPlaceholder: 'Suche POIs, Restaurants, Strände...',
      filters: 'Filter',
      loadMore: 'Mehr POIs laden',
      noResults: 'Keine POIs gefunden',
      noResultsDesc: 'Versuchen Sie, Ihren Such- oder Kategoriefilter anzupassen',
      noReviews: 'Keine Bewertungen verfügbar',
      moreInfo: 'Mehr Info',
      share: 'Teilen',
      agenda: 'Kalender',
      map: 'Karte',
      details: 'Details',
      call: 'Anrufen',
      directions: 'Wegbeschreibung',
      save: 'Speichern',
      saved: 'Gespeichert',
      print: 'Drucken',
      visitWebsite: 'Website Besuchen',
      about: 'Über',
      openingHours: 'Öffnungszeiten',
      contact: 'Kontakt',
      highlights: 'Highlights',
      perfectFor: 'Perfekt für',
      readMore: 'Weiterlesen',
      readLess: 'Weniger lesen',
      shareCopied: 'Link in Zwischenablage kopiert!',
      shareSuccess: 'Erfolgreich geteilt!',
      addedToFavorites: 'Zu Favoriten hinzugefügt!',
      removedFromFavorites: 'Aus Favoriten entfernt',
      categoryHighlights: {
        active: ['Outdoor-Aktivitäten', 'Abenteuersport', 'Körperliche Fitness'],
        beaches: ['Malerische Aussichten', 'Entspannung', 'Natürliche Schönheit'],
        culture: ['Historische Bedeutung', 'Kulturelles Erbe', 'Bildung'],
        recreation: ['Unterhaltung', 'Familienfreundlich', 'Spaßige Aktivitäten'],
        food: ['Lokale Küche', 'Esserlebnis', 'Geschmack & Aroma'],
        health: ['Wellness', 'Selbstfürsorge', 'Gesundheitsdienste'],
        shopping: ['Einkaufserlebnis', 'Lokale Produkte', 'Shopping-Therapie'],
        practical: ['Wesentliche Dienste', 'Bequemlichkeit', 'Praktische Bedürfnisse'],
        default: ['Tolles Erlebnis', 'Besuchenswert', 'Beliebte Wahl'],
      },
      categoryPerfectFor: {
        active: ['Sportbegeisterte', 'Abenteurer', 'Fitnessliebhaber'],
        beaches: ['Strandliebhaber', 'Naturfreunde', 'Fotografen'],
        culture: ['Geschichtsinteressierte', 'Kulturliebhaber', 'Bildungsreisen'],
        recreation: ['Familien', 'Gruppen', 'Unterhaltungssuchende'],
        food: ['Feinschmecker', 'Kulinarische Entdecker', 'Geselliges Essen'],
        health: ['Wellness-Suchende', 'Spa-Liebhaber', 'Gesundheitsbewusste'],
        shopping: ['Shopper', 'Souvenir-Jäger', 'Modefreunde'],
        practical: ['Reisende', 'Einheimische', 'Jeder der Dienste benötigt'],
        default: ['Alle Besucher', 'Reisende', 'Lokale Erkunder'],
      },
      budgetLabels: {
        budget: 'Budgetfreundlich',
        midRange: 'Mittelklasse',
        upscale: 'Gehoben',
        luxury: 'Luxus',
        priceLevel: 'Preisniveau',
      },
      openingStatus: {
        open: 'Jetzt geöffnet',
        closed: 'Geschlossen',
        closesAt: 'Schließt um',
        closedToday: 'Heute geschlossen',
        available: 'Verfügbar',
      },
      amenities: {
        title: 'Ausstattung',
        wheelchairAccessible: 'Rollstuhlgerecht',
        freeWifi: 'Kostenloses WLAN verfügbar',
        creditCards: 'Akzeptiert Kreditkarten',
        noDetails: 'Keine zusätzlichen Details verfügbar',
        featureNames: {
          'Wheelchair accessible entrance': 'Rollstuhlgerechter Eingang',
          'Wheelchair accessible parking lot': 'Rollstuhlgerechter Parkplatz',
          'Wheelchair accessible restroom': 'Rollstuhlgerechte Toilette',
          'Wheelchair accessible seating': 'Rollstuhlgerechte Sitzplätze',
          'Bar onsite': 'Bar vor Ort',
          'Restroom': 'Toilette',
          'Wi-Fi': 'WLAN',
          'Free Wi-Fi': 'Kostenloses WLAN',
          'Good for kids': 'Kinderfreundlich',
          'High chairs': 'Kinderstühle',
          'Dogs allowed': 'Hunde erlaubt',
          'Gender-neutral restroom': 'Geschlechtsneutrale Toilette',
          'Free parking lot': 'Kostenloser Parkplatz',
          'Free street parking': 'Kostenloses Parken am Straßenrand',
          'Paid parking lot': 'Kostenpflichtiger Parkplatz',
          'Paid street parking': 'Kostenpflichtiges Parken am Straßenrand',
          'Parking garage': 'Parkhaus',
          'Valet parking': 'Parkservice',
          'Dine-in': 'Vor Ort essen',
          'Takeout': 'Zum Mitnehmen',
          'Delivery': 'Lieferung',
          'Outdoor seating': 'Außensitzplätze',
          'Live music': 'Live-Musik',
          'Reservations': 'Reservierungen',
          'Private dining': 'Privates Dining',
          'Happy hour': 'Happy Hour',
          'Brunch': 'Brunch',
          'Lunch': 'Mittagessen',
          'Dinner': 'Abendessen',
          'Breakfast': 'Frühstück',
          'Dessert': 'Dessert',
          'Coffee': 'Kaffee',
          'Cocktails': 'Cocktails',
          'Beer': 'Bier',
          'Wine': 'Wein',
          'Organic': 'Bio',
          'Vegetarian options': 'Vegetarische Optionen',
          'Vegan options': 'Vegane Optionen',
        },
      },
      gallery: {
        noPhotos: 'Keine Fotos verfügbar',
        showAllPhotos: 'Alle Fotos anzeigen',
        allPhotos: 'Alle',
      },
      loadingStates: {
        loadingDetails: 'POI-Details laden...',
        notFound: 'POI Nicht Gefunden',
        notFoundDescription: 'Der gesuchte POI existiert nicht.',
      },
      comparison: {
        compare: 'Vergleichen',
        comparing: 'Vergleichend',
        addToCompare: 'Zum Vergleich hinzufügen',
        removeFromCompare: 'Aus Vergleich entfernen',
        compareTitle: 'POI-Vergleich',
        selectedCount: '{count} POI(s) ausgewählt',
        maxReached: 'Maximal 3 POIs können verglichen werden',
        clearAll: 'Alles löschen',
        noItemsSelected: 'Keine POIs ausgewählt',
        selectToCompare: 'Wählen Sie 2-3 POIs zum Vergleichen aus',
        hint: 'Klicken Sie auf das Vergleichssymbol bei POIs, um sie hinzuzufügen',
      },
    },
    categories: {
      // Calpe categories
      active: 'Aktiv',
      beaches: 'Strände & Natur',
      culture: 'Kultur & Geschichte',
      recreation: 'Erholung',
      food: 'Essen & Trinken',
      health: 'Gesundheit & Wohlbefinden',
      shopping: 'Einkaufen',
      practical: 'Praktisch',
      // Texel categories
      actief: 'Aktiv',
      cultuur: 'Kultur & Geschichte',
      eten: 'Essen & Trinken',
      gezondheid: 'Gesundheit & Pflege',
      natuur: 'Natur',
      praktisch: 'Praktisch',
      winkelen: 'Einkaufen',
    },
    reviews: {
      title: 'Bewertungen',
      travelParty: {
        all: 'Alle Reisenden',
        couples: 'Paare',
        families: 'Familien',
        solo: 'Alleinreisende',
        friends: 'Freunde',
        business: 'Geschäftlich',
      },
      sort: {
        recent: 'Neueste',
        helpful: 'Hilfreichste',
        highRating: 'Höchste Bewertung',
        lowRating: 'Niedrigste Bewertung',
      },
      sentiment: {
        positive: 'Positiv',
        neutral: 'Neutral',
        negative: 'Negativ',
      },
      filterByTraveler: 'Nach Reiseart filtern',
      filterBySentiment: 'Nach Stimmung filtern',
      sortBy: 'Sortieren nach',
      helpful: 'Hilfreich',
      noReviews: 'Noch keine Bewertungen',
      writeReview: 'Bewertung schreiben',
      readMore: 'Mehr lesen',
      showLess: 'Weniger anzeigen',
      visited: 'Besucht',
      loadingReviews: 'Bewertungen laden...',
      loadMoreReviews: 'Mehr Bewertungen laden',
      reviewCount: 'Bewertungen',
      averageRating: 'Durchschnittliche Bewertung',
      review: 'Bewertung',
      allReviews: 'Alle Bewertungen',
      beFirstToShare: 'Sei der Erste, der eine Erfahrung teilt!',
      failedToLoad: 'Bewertungen konnten nicht geladen werden. Bitte versuchen Sie es erneut.',
      tryAgain: 'Erneut versuchen',
      noMatchFilters: 'Keine Bewertungen entsprechen Ihren Filtern',
      adjustFilters: 'Passen Sie Ihre Filtereinstellungen an, um mehr Bewertungen zu sehen.',
      today: 'Heute',
      yesterday: 'Gestern',
      daysAgo: 'vor {n} Tagen',
      weeksAgo: 'vor {n} Wochen',
      weekAgo: 'vor 1 Woche',
      monthsAgo: 'vor {n} Monaten',
      monthAgo: 'vor 1 Monat',
      yearsAgo: 'vor {n} Jahren',
      yearAgo: 'vor 1 Jahr',
      writeReviewModal: {
        title: 'Bewertung schreiben',
        close: 'Schließen',
        yourRating: 'Ihre Bewertung',
        travelPartyLabel: 'Reisegruppe',
        solo: 'Solo',
        couple: 'Paar',
        family: 'Familie',
        friends: 'Freunde',
        business: 'Geschäftlich',
        yourReview: 'Ihre Bewertung',
        placeholder: 'Teilen Sie Ihre Erfahrung an diesem Ort... (mindestens 50 Zeichen)',
        characters: 'Zeichen',
        minimum: 'mindestens 50',
        addPhoto: 'Foto hinzufügen (optional)',
        uploadPhoto: 'Foto hochladen',
        submitting: 'Wird gesendet...',
        submitReview: 'Bewertung absenden',
        success: 'Bewertung erfolgreich eingereicht!',
        error: 'Bewertung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
        selectRating: 'Bitte wählen Sie eine Bewertung',
        selectTravelParty: 'Bitte wählen Sie Ihre Reisegruppe',
        minChars: 'Die Bewertung muss mindestens 50 Zeichen umfassen',
        uploadImageOnly: 'Bitte laden Sie eine Bilddatei hoch',
        imageTooLarge: 'Das Bild muss kleiner als 5 MB sein',
      },
    },
    common: {
      save: 'Speichern',
      close: 'Schließen',
      apply: 'Anwenden',
      reset: 'Zurücksetzen',
      loading: 'Laden...',
      back: 'Zurück',
      optional: 'optional',
    },
    account: {
      tabs: {
        profile: 'Profil',
        preferences: 'Präferenzen',
        ai: 'KI',
        privacy: 'Datenschutz',
        export: 'Export',
        settings: 'Einstellungen',
        favorites: 'Favoriten',
        visited: 'Besucht',
        reviews: 'Bewertungen',
      },
      profile: {
        memberSince: 'Mitglied seit',
        butlerFanSince: 'Butler-Fan seit',
        clickAvatarHint: 'Klicken Sie auf den Avatar, um ein Foto hochzuladen',
        changePhoto: 'Foto Ändern',
        quickActions: 'Schnellaktionen',
        savedPOIs: 'Gespeicherte POIs',
        favorites: 'Favoriten',
        visits: 'Besuche',
        reviews: 'Bewertungen',
        comingSoon: 'Demnächst',
      },
      favorites: {
        title: 'Favoriten',
        infoText: 'Ihre gespeicherten POIs und Events an einem Ort.',
        poiTitle: 'Favoriten-POIs',
        eventsTitle: 'Favoriten-Events',
        emptyPois: 'Sie haben noch keine Favoriten-POIs gespeichert.',
        emptyEvents: 'Sie haben noch keine Favoriten-Events gespeichert.',
        discoverPois: 'POIs entdecken →',
        viewAgenda: 'Agenda ansehen →',
        viewAll: 'Alle anzeigen',
      },
      visited: {
        title: 'Besuchte Orte',
        infoText: 'Automatisch verfolgt, wenn Sie POIs und Events ansehen.',
        poisTitle: 'Besuchte POIs',
        eventsTitle: 'Besuchte Events',
        emptyPois: 'Besuchte POIs-Tracking wird bald aktiviert.',
        emptyEvents: 'Besuchte Events-Tracking wird bald aktiviert.',
        trackingInfo: 'Ihr Besuchsverlauf wird automatisch verfolgt, wenn Sie POIs ansehen.',
      },
      reviews: {
        title: 'Meine Bewertungen',
        infoText: 'Ihre geschriebenen Bewertungen anzeigen und bearbeiten.',
        empty: 'Sie haben noch keine Bewertungen geschrieben.',
        emptyHint: 'Teilen Sie Ihre Erfahrungen und helfen Sie anderen Reisenden!',
        discoverToReview: 'POIs zum Bewerten entdecken →',
      },
      preferences: {
        title: 'Reisepräferenzen',
        travelingAs: 'Reisen als',
        interests: 'Interessen',
        dietary: 'Ernährung',
        editButton: 'Präferenzen bearbeiten',
        asCouple: 'Als Paar',
        foodDrinks: 'Essen & Trinken',
        beaches: 'Strände',
        culture: 'Kultur',
        vegetarian: 'Vegetarisch',
      },
      ai: {
        title: 'KI-gestützte Personalisierung',
        subtitle: 'KI-Funktionen',
        infoText: 'Wir verwenden lokale Daten, aber auch KI, um Ihre Empfehlungen zu personalisieren und zu optimieren. Sie haben 100% Kontrolle darüber, wie KI verwendet wird',
        features: 'KI-Funktionen',
        personalizedRecs: 'Personalisierte Empfehlungen',
        personalizedRecsDesc: 'Verwenden Sie KI, um POIs vorzuschlagen',
        smartFilters: 'Intelligente Filter',
        smartFiltersDesc: 'KI-gestützte Suchfilter',
        behavioralLearning: 'Verhaltensbasiertes Lernen',
        behavioralLearningDesc: 'Lernen Sie aus Ihren Interaktionen',
        howItWorks: 'Wie funktioniert KI-Personalisierung?',
      },
      privacy: {
        title: 'Ihre Privatsphäre ist uns wichtig',
        subtitle: 'Daten auf Ihrem Gerät gespeichert • Automatisches Löschen nach 30 Tagen • 100% Sicherheit',
        dataCollection: 'Datenerfassung & Einwilligung',
        essentialCookies: 'Essentielle Cookies',
        essentialCookiesDesc: 'Erforderlich für die Funktion der Website',
        required: 'ERFORDERLICH',
        analytics: 'Analyse',
        analyticsDesc: 'Website-Nutzung verstehen',
        personalization: 'Personalisierung',
        personalizationDesc: 'Empfehlungen verbessern',
        marketing: 'Marketing',
        marketingDesc: 'Werbliche E-Mails',
        updateButton: 'Einwilligungseinstellungen aktualisieren',
      },
      export: {
        title: 'Ihre Daten herunterladen',
        infoText: 'Sie haben das Recht, all Ihre persönlichen Daten in einem lesbaren Format herunterzuladen (DSGVO Art. 15).',
        whatIncluded: 'Was ist enthalten?',
        includeList: {
          profile: 'Profilinformationen',
          preferences: 'Reisepräferenzen',
          savedPOIs: 'Gespeicherte POIs & Favoriten',
          reviews: 'Bewertungen & Ratings',
          visitHistory: 'Besuchshistorie',
          activityLog: 'Konto-Aktivitätsprotokoll',
          consentSettings: 'Einwilligungs- & Datenschutzeinstellungen',
        },
        format: 'Exportformat',
        formatJSON: 'JSON (maschinenlesbar)',
        formatPDF: 'PDF (menschenlesbar)',
        formatBoth: 'Beide Formate',
        requestButton: 'Datenexport anfordern',
        validityNote: 'Exporte sind 7 Tage nach der Erstellung verfügbar.',
      },
      settings: {
        security: 'Sicherheit',
        changePassword: 'Passwort ändern',
        twoFactor: 'Zwei-Faktor-Authentifizierung',
        twoFactorStatus: 'Nicht aktiviert',
        notifications: 'Benachrichtigungen',
        emailNotifications: 'E-Mail-Benachrichtigungen',
        pushNotifications: 'Push-Benachrichtigungen',
        dangerZone: 'Punkt ohne Wiederkehr',
        deleteData: 'Meine persönlichen Daten löschen',
        deleteDataDesc: 'Konto bleibt mit Standardeinstellungen',
        deleteAccount: 'Mein Konto löschen',
        deleteAccountDesc: 'Diese Aktion kann nicht rückgängig gemacht werden',
      },
      modals: {
        changePasswordTitle: 'Passwort ändern',
        currentPassword: 'Aktuelles Passwort',
        newPassword: 'Neues Passwort',
        confirmPassword: 'Passwort bestätigen',
        passwordWeak: 'Schwach',
        passwordMedium: 'Mittel',
        passwordStrong: 'Stark',
        passwordRequirements: 'Mindestens 8 Zeichen, Großbuchstaben, Zahlen und Symbole verwenden',
        passwordMismatch: 'Passwörter stimmen nicht überein',
        passwordMatch: 'Passwörter stimmen überein',
        passwordError: 'Fehler beim Ändern des Passworts',
        changePassword: 'Passwort ändern',
        twoFactorTitle: 'Zwei-Faktor-Authentifizierung',
        twoFactorIntroTitle: 'Konto sichern',
        twoFactorIntroText: 'Fügen Sie Ihrem Konto eine zusätzliche Sicherheitsebene hinzu.',
        twoFactorBenefit1: 'Schutz vor unbefugtem Zugriff',
        twoFactorBenefit2: 'Zusätzliche Verifizierung beim Anmelden',
        twoFactorBenefit3: 'Backup-Codes für Notfälle',
        twoFactorScanInstructions: 'Scannen Sie den QR-Code mit Ihrer Authenticator-App',
        hideSecret: 'Geheimen Schlüssel verbergen',
        showSecret: 'Geheimen Schlüssel anzeigen',
        recommendedApps: 'Empfohlene Apps',
        twoFactorVerifyInstructions: 'Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein',
        enterCodeFromApp: 'Der Code wird alle 30 Sekunden aktualisiert',
        twoFactorEnabled: '2FA wurde erfolgreich aktiviert!',
        backupCodesTitle: 'Backup-Codes',
        backupCodesWarning: 'Bewahren Sie diese Codes sicher auf.',
        copied: 'Kopiert',
        copyAll: 'Alle Codes kopieren',
        twoFactorActive: '2FA ist aktiv',
        twoFactorActiveDesc: 'Ihr Konto ist mit 2FA geschützt',
        disableWarning: 'Das Deaktivieren von 2FA macht Ihr Konto unsicherer',
        twoFactorError: 'Ungültiger Verifizierungscode',
        twoFactorDisableError: 'Fehler beim Deaktivieren von 2FA',
        startSetup: 'Setup starten',
        verify: 'Verifizieren',
        verifying: 'Verifiziere...',
        done: 'Fertig',
        keepEnabled: 'Aktiviert lassen',
        disable2FA: '2FA deaktivieren',
        disabling: 'Deaktiviere...',
        deleteDataTitle: 'Persönliche Daten löschen',
        deleteDataWarningTitle: 'Achtung!',
        deleteDataWarningText: 'Sie sind dabei, alle Ihre persönlichen Daten zu löschen.',
        dataToBeDeleted: 'Wird gelöscht',
        deleteDataItem1: 'Name und Profilbild',
        deleteDataItem2: 'Präferenzen und Interessen',
        deleteDataItem3: 'Favoriten und gespeicherte POIs',
        deleteDataItem4: 'Besuchsverlauf',
        deleteDataItem5: 'Bewertungen',
        dataKept: 'Bleibt erhalten',
        keepDataItem1: 'E-Mail-Adresse (zum Anmelden)',
        keepDataItem2: 'Konto und Passwort',
        deleteDataInfo: 'Nach dem Löschen können Sie neu beginnen.',
        confirmDeleteData: 'Löschung bestätigen',
        typeToConfirm: 'Geben Sie DELETE DATA zur Bestätigung ein',
        deleteDataError: 'Fehler beim Löschen der Daten',
        deleting: 'Lösche...',
        deleteData: 'Daten löschen',
        deleteAccountTitle: 'Konto löschen',
        deleteAccountWarningTitle: 'Dies kann nicht rückgängig gemacht werden!',
        deleteAccountWarningText: 'Sie sind dabei, Ihr CalpeTrip-Konto dauerhaft zu löschen.',
        gracePeriodTitle: '30 Tage Bedenkzeit',
        gracePeriodText: 'Sie haben 30 Tage Zeit, die Löschung durch erneutes Anmelden abzubrechen.',
        scheduledDeletion: 'Geplante Löschung',
        permanentlyDeleted: 'Dauerhaft gelöscht',
        deleteAccountItem1: 'Ihr vollständiges Profil und persönliche Daten',
        deleteAccountItem2: 'Alle Ihre Präferenzen und Einstellungen',
        deleteAccountItem3: 'Ihre Favoriten und gespeicherten Elemente',
        deleteAccountItem4: 'Ihre Bewertungen',
        deleteAccountItem5: 'Zugang zu CalpeTrip',
        canCancelDeletion: 'Sie können die Löschung abbrechen, indem Sie sich innerhalb von 30 Tagen anmelden.',
        whyLeaving: 'Warum verlassen Sie uns?',
        helpUsImprove: 'Optional: Helfen Sie uns zu verbessern',
        reasonNotUseful: 'Plattform nicht nützlich genug',
        reasonPrivacy: 'Datenschutzbedenken',
        reasonEmails: 'Zu viele E-Mails',
        reasonAlternative: 'Alternative gefunden',
        reasonTemporary: 'Temporäres Konto',
        reasonOther: 'Sonstiges',
        tellUsMore: 'Erzählen Sie uns mehr...',
        confirmDeleteAccount: 'Kontolöschung bestätigen',
        typeDeleteToConfirm: 'Geben Sie DELETE zur Bestätigung ein',
        accountToDelete: 'Zu löschendes Konto',
        deleteAccountError: 'Fehler beim Löschen des Kontos',
        keepAccount: 'Konto behalten',
        deleteMyAccount: 'Konto löschen',
        processing: 'Verarbeite...',
        deletionScheduled: 'Löschung geplant',
        deletionScheduledText: 'Ihr Konto ist zur Löschung vorgemerkt. Sie haben 30 Tage Zeit, dies abzubrechen.',
        cancelBeforeDate: 'Melden Sie sich vor diesem Datum an, um abzubrechen',
        confirmationEmailSent: 'Bestätigungs-E-Mail gesendet an',
        understood: 'Verstanden',
        cancel: 'Abbrechen',
        back: 'Zurück',
        next: 'Weiter',
        continue: 'Fortfahren',
        saving: 'Speichern...',
      },
    },
    auth: {
      login: {
        title: 'CalpeTrip',
        subtitle: 'Willkommen zurück! Melden Sie sich in Ihrem Konto an',
        emailLabel: 'E-Mail-Adresse',
        emailPlaceholder: 'ihre.email@beispiel.de',
        passwordLabel: 'Passwort',
        passwordPlaceholder: 'Geben Sie Ihr Passwort ein',
        forgotPassword: 'Passwort vergessen?',
        signInButton: 'Anmelden',
        signingIn: 'Anmelden...',
        noAccount: 'Noch kein Konto?',
        signUp: 'Registrieren',
        backToHome: 'Zurück zur Startseite',
        errorFillFields: 'Bitte füllen Sie alle Felder aus',
        errorInvalidCredentials: 'Ungültige E-Mail oder Passwort. Bitte versuchen Sie es erneut.',
        errorGeneric: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es später erneut.',
      },
      signup: {
        title: 'CalpeTrip',
        subtitle: 'Erstellen Sie Ihr Konto',
        nameLabel: 'Vollständiger Name',
        namePlaceholder: 'Ihr vollständiger Name',
        emailLabel: 'E-Mail-Adresse',
        emailPlaceholder: 'ihre.email@beispiel.de',
        passwordLabel: 'Passwort',
        passwordPlaceholder: 'Wählen Sie ein sicheres Passwort',
        confirmPasswordLabel: 'Passwort bestätigen',
        confirmPasswordPlaceholder: 'Geben Sie Ihr Passwort erneut ein',
        termsText: 'Ich stimme den',
        termsLink: 'Nutzungsbedingungen',
        and: 'und',
        privacyLink: 'Datenschutzrichtlinie',
        signUpButton: 'Konto erstellen',
        signingUp: 'Konto wird erstellt...',
        haveAccount: 'Haben Sie bereits ein Konto?',
        signIn: 'Anmelden',
        backToHome: 'Zurück zur Startseite',
        errorFillFields: 'Bitte füllen Sie alle Felder aus',
        errorPasswordMismatch: 'Passwörter stimmen nicht überein',
        errorPasswordTooShort: 'Passwort muss mindestens 8 Zeichen lang sein',
        errorEmailExists: 'Ein Konto mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.',
        errorGeneric: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.',
        passwordRequirements: {
          title: 'Passwort muss enthalten:',
          minLength: 'Mindestens 8 Zeichen',
          uppercase: 'Mindestens 1 Großbuchstaben',
          lowercase: 'Mindestens 1 Kleinbuchstaben',
          number: 'Mindestens 1 Zahl',
          special: 'Mindestens 1 Sonderzeichen (!@#$%^&*)',
        },
        verificationSent: {
          title: 'Überprüfen Sie Ihre E-Mail',
          sentTo: 'Wir haben eine Bestätigungs-E-Mail gesendet an:',
          instruction: 'Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren. Überprüfen Sie auch Ihren Spam-Ordner.',
          goToLogin: 'Zur Anmeldung',
          noEmail: 'Keine E-Mail erhalten?',
        },
      },
      verifyEmail: {
        verifying: 'E-Mail wird verifiziert...',
        verifyingText: 'Bitte warten Sie, wir überprüfen Ihren Bestätigungslink.',
        success: 'E-Mail verifiziert!',
        successMessage: 'Ihre E-Mail-Adresse wurde erfolgreich verifiziert. Sie können sich jetzt anmelden.',
        alreadyVerified: 'Bereits verifiziert',
        alreadyVerifiedMessage: 'Diese E-Mail-Adresse wurde bereits verifiziert. Sie können sich anmelden.',
        failed: 'Verifizierung fehlgeschlagen',
        failedMessage: 'Bei der Verifizierung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder fordern Sie eine neue Bestätigungs-E-Mail an.',
        goToLogin: 'Zur Anmeldung',
        requestNew: 'Neue Bestätigungs-E-Mail anfordern',
        backToLogin: 'Zurück zur Anmeldung',
      },
      resendVerification: {
        title: 'Bestätigungs-E-Mail erneut senden',
        subtitle: 'Geben Sie Ihre E-Mail-Adresse ein, um eine neue Bestätigungs-E-Mail zu erhalten.',
        emailLabel: 'E-Mail-Adresse',
        emailPlaceholder: 'name@beispiel.de',
        sendButton: 'Bestätigungs-E-Mail senden',
        sending: 'Senden...',
        success: 'Bestätigungs-E-Mail gesendet',
        successMessage: 'Falls diese E-Mail-Adresse bei uns registriert ist, erhalten Sie innerhalb weniger Minuten eine Bestätigungs-E-Mail. Überprüfen Sie auch Ihren Spam-Ordner.',
        backToLogin: 'Zurück zur Anmeldung',
        errorEmpty: 'Bitte geben Sie Ihre E-Mail-Adresse ein',
        errorTooMany: 'Sie haben zu viele Bestätigungs-E-Mails angefordert. Bitte versuchen Sie es in einer Stunde erneut.',
        errorGeneric: 'Ein Fehler ist aufgetreten',
      },
    },
    footer: {
      about: 'Über Uns',
      privacy: 'Datenschutz',
      terms: 'Nutzungsbedingungen',
      contact: 'Kontakt',
      copyright: '© 2025 CalpeTrip. Powered by AI. Mit Liebe für Reisende gemacht.',
      platformTitle: 'Plattform',
      supportTitle: 'Hilfe',
      legalTitle: 'Rechtliches',
      howItWorks: 'So funktioniert es',
      pois: 'Entdecken',
      faq: 'FAQ',
      help: 'Hilfe',
      cookies: 'Cookies',
      tagline: 'Ihr persönlicher Butler an der Costa Blanca',
      allRights: 'Alle Rechte vorbehalten.',
      madeWith: 'Mit ❤️ an der Costa Blanca gemacht',
      partners: 'Partner',
    },
    onboarding: {
      // Navigation
      back: 'Zurück',
      skip: 'Überspringen',
      continue: 'Weiter →',
      // Progress
      stepOf: 'Schritt',
      of: 'von',
      // Step 1: Travel Companion
      step1Title: 'Mit wem reisen Sie?',
      couple: 'Paar',
      coupleDesc: 'Eine romantische Reise genießen',
      family: 'Familie',
      familyDesc: 'Ideal für Familienspaß',
      soloDesc: 'Entdecken Sie in Ihrem eigenen Tempo',
      group: 'Gruppe',
      groupDesc: 'Perfekt für Freunde und Kollegen',
      // Step 2: Interests
      step2Title: 'Was suchen Sie in Calpe?',
      selectAll: '(Alle zutreffenden auswählen)',
      selected: 'Ausgewählt',
      option: 'Option',
      options: 'Optionen',
      relax: 'Entspannen',
      relaxDesc: 'Erholen und auftanken',
      active: 'Aktiv',
      activeDesc: 'Abenteuer und Sport',
      culture: 'Kultur',
      cultureDesc: 'Lokale Kunst & kreative Erlebnisse',
      food: 'Essen',
      foodDesc: 'Kulinarische Abenteuer',
      nature: 'Natur',
      natureDesc: 'Outdoor-Erkundung',
      nightlife: 'Nachtleben',
      nightlifeDesc: 'Abendunterhaltung',
      history: 'Geschichte',
      historyDesc: 'Die Vergangenheit entdecken',
      shopping: 'Shopping',
      shoppingDesc: 'Einkaufsbummel',
      // Step 3: Trip Context
      step3Title: 'Erzählen Sie uns von Ihrer Reise',
      stayType: 'Art des Aufenthalts',
      pleasure: 'Freizeit',
      business: 'Geschäftlich',
      visitStatus: 'Besuchsstatus',
      firstTime: 'Erstbesuch',
      returning: 'Wiederkehrender Besucher',
      localResident: 'Einheimischer',
      whenVisiting: 'Wann besuchen Sie uns?',
      tripDuration: 'Reisedauer',
      duration1: '1-3 Tage (Wochenende)',
      duration2: '4-7 Tage (Woche)',
      duration3: '1-2 Wochen',
      duration4: '2+ Wochen',
      durationFlex: 'Flexibel/Noch nicht sicher',
      // Step 4: Optional
      optional: 'Optional',
      selectMultiple: '(Mehrere auswählen)',
      dietaryTitle: 'Ernährungsanforderungen?',
      vegetarian: 'Vegetarisch',
      vegan: 'Vegan',
      glutenFree: 'Glutenfrei',
      halal: 'Halal',
      kosher: 'Koscher',
      lactoseFree: 'Laktosefrei',
      nutAllergies: 'Nussallergien',
      accessibilityTitle: 'Barrierefreiheit?',
      wheelchair: 'Rollstuhlzugänglich',
      mobility: 'Mobilitätshilfe',
      visual: 'Sehbehinderung',
      hearing: 'Hörbehinderung',
      // Buttons
      finishExplore: 'Fertig & Entdecken →',
      savePreferences: 'Einstellungen speichern →',
      // Edit mode
      editMode: 'Ihre Präferenzen bearbeiten - Ihre aktuellen Auswahlen werden unten angezeigt',
      cancelEdit: 'Bearbeitung abbrechen und zu Ihrem Konto zurückkehren?',
      skipConfirm: 'Onboarding überspringen? Sie können später in Ihrem Konto Präferenzen festlegen.',
    },
    holibotChat: {
      welcome: 'Hallo! Ich bin CalpeChat 🌴',
      welcomeSubtitle: 'Dein persönlicher Calpe-Guide. Wie kann ich dir helfen?',
      inputPlaceholder: 'Stelle eine Frage über Calpe...',
      quickActions: {
        itinerary: 'Programm erstellen',
        locationInfo: 'Nach Kategorie suchen',
        directions: 'Wegbeschreibung',
        dailyTip: 'Mein Tages-Tipp',
      },
      prompts: {
        itinerary: 'Erstelle ein Tagesprogramm basierend auf meinen Vorlieben',
        locationInfo: 'Ich suche Informationen über einen bestimmten Ort',
        directions: 'Hilf mir mit der Route zu einem Ziel',
      },
      responses: {
        loading: 'Einen Moment...',
        error: 'Entschuldigung, etwas ist schiefgelaufen. Bitte versuche es erneut.',
        noResults: 'Keine Ergebnisse gefunden. Versuche eine andere Suche.',
        itineraryIntro: 'Hier ist dein personalisiertes Tagesprogramm:',
        locationSearch: 'Über welchen Ort möchtest du mehr erfahren?',
        directionsHelp: 'Zu welchem Ziel möchtest du navigieren?',
        yourItinerary: 'Dein Programm',
        eventsAdded: 'Veranstaltung(en) hinzugefügt',
      },
    },
  },
  es: {
    nav: {
      home: 'Inicio',
      explore: 'Explorar',
      holibot: 'CalpeChat',
      agenda: 'Agenda',
      reservations: 'Reservas',
      tickets: 'Entradas',
      favorites: 'Favoritos',
      account: 'Cuenta',
      about: 'Acerca de',
      faq: 'FAQ',
    },
    agenda: {
      title: 'Agenda de Calpe',
      subtitle: 'Descubre todos los eventos, festivales y actividades en Calpe',
      categories: {
        all: 'Todos',
        festival: 'Festivales',
        music: 'Música',
        gastronomy: 'Gastronomía',
        market: 'Mercados',
        wellness: 'Bienestar',
        adventure: 'Aventura',
      },
      noEvents: 'No se encontraron eventos para esta categoría.',
      loadMore: 'Cargar más Eventos',
      moreInfo: 'Más información',
      newsletter: {
        title: '¡No te pierdas ningún evento!',
        description: 'Suscríbete a nuestro boletín y recibe semanalmente los mejores eventos en Calpe.',
        placeholder: 'Tu correo electrónico',
        button: 'Suscribirse',
      },
    },
    reservations: {
      title: 'Reservas de Restaurantes',
      subtitle: 'Descubre y reserva en los mejores restaurantes de Calpe',
      searchPlaceholder: 'Buscar restaurante o cocina...',
      persons: 'personas',
      person: 'persona',
      time: 'Hora',
      cuisines: {
        all: 'Todos',
        mediterranean: 'Mediterránea',
        spanish: 'Española',
        italian: 'Italiana',
        japanese: 'Japonesa',
        seafood: 'Mariscos',
        vegan: 'Vegana',
      },
      found: 'restaurantes encontrados',
      reserveNow: 'Reservar Ahora',
      modal: {
        title: 'Reservar en',
        name: 'Nombre',
        email: 'Correo electrónico',
        phone: 'Teléfono',
        guests: 'Número de personas',
        date: 'Fecha',
        time: 'Hora',
        selectTime: 'Seleccionar hora',
        specialRequests: 'Solicitudes especiales',
        submit: 'Confirmar Reserva',
      },
    },
    tickets: {
      title: 'Entradas y Actividades',
      subtitle: 'Reserva entradas para las mejores atracciones y actividades en Calpe',
      searchPlaceholder: 'Buscar eventos...',
      available: 'disponible',
      buyTickets: 'Comprar entradas',
      selectTickets: 'Seleccionar Entradas',
      orderSummary: 'Resumen del Pedido',
      total: 'Total',
      continueToCheckout: 'Continuar al Pago',
      guestInformation: 'Información del Invitado',
      name: 'Nombre Completo',
      email: 'Correo Electrónico',
      phone: 'Teléfono',
      event: 'Evento',
      tickets: 'entradas',
      processing: 'Procesando...',
      proceedToPayment: 'Proceder al Pago',
      payment: 'Pago',
      loadingPayment: 'Cargando métodos de pago...',
      bookingConfirmed: '¡Reserva Confirmada!',
      confirmationMessage: 'Tus entradas han sido reservadas con éxito.',
      bookingReference: 'Referencia de Reserva',
      emailSent: 'Se ha enviado un correo de confirmación a',
      browseMoreEvents: 'Ver Más Eventos',
    },
    homepage: {
      hero: {
        title: 'Tu estancia, tu estilo.',
        payoff: 'Descubre Calpe con tu Asistente personal de Calpe',
        subtitle: 'Experimenta esta joya mediterránea completamente adaptada a ti',
      },
      why: {
        title: '¿Por qué CalpeTrip?',
      },
      usps: {
        partner: { title: 'Socio Oficial', description: 'Socio Oficial Calpe Turismo' },
        ai: { title: 'Asistente IA de Calpe', description: 'HolidAIButler: Tu mayordomo (hiper) personal' },
        local: { title: '100% Local', description: 'Apoya la economía e identidad de Calpe' },
        realtime: { title: 'Información precisa en tiempo real', description: 'Sobre ubicaciones, eventos, actividades y clima' },
        trusted: { title: 'Confiable y Seguro', description: 'Desde datos hasta pagos: nos importa tu privacidad' },
      },
      cta: {
        explore: '🗺️ Explorar Calpe',
        agenda: '📅 Agenda',
      },
      features: {
        aiAssistant: {
          title: 'Asistente Impulsado por IA',
          description: 'CalpeChat comprende tus preferencias y proporciona recomendaciones personalizadas de restaurantes, actividades y joyas ocultas.'
        },
        localPois: {
          title: 'Más de 1.600 POIs locales',
          description: 'Descubre experiencias auténticas seleccionadas por locales. Desde playas hasta museos, restaurantes hasta vida nocturna - lo tenemos todo cubierto.'
        },
        tailored: {
          title: 'Personalizado para ti',
          description: 'Cuéntanos sobre tu estilo de viaje, preferencias e intereses. Personalizaremos tu experiencia para que coincida con tus vacaciones perfectas.'
        },
        account: {
          title: 'Tu Centro de Viajes',
          description: 'Guarda favoritos, rastrea visitas, gestiona preferencias y controla tu privacidad - todo en un solo lugar.'
        },
      },
      rating: {
        score: 'Basado en más de 2.500 reseñas de viajeros',
        text: '4.8 / 5.0',
        button: 'Leer Reseñas',
      },
    },
    poi: {
      searchPlaceholder: 'Buscar POIs, restaurantes, playas...',
      filters: 'Filtros',
      loadMore: 'Cargar más POIs',
      noResults: 'No se encontraron POIs',
      noResultsDesc: 'Intenta ajustar tu búsqueda o filtro de categoría',
      noReviews: 'No hay reseñas disponibles',
      moreInfo: 'Más Info',
      share: 'Compartir',
      agenda: 'Agenda',
      map: 'Mapa',
      details: 'Detalles',
      call: 'Llamar',
      directions: 'Direcciones',
      save: 'Guardar',
      saved: 'Guardado',
      print: 'Imprimir',
      visitWebsite: 'Visitar Sitio Web',
      about: 'Acerca de',
      openingHours: 'Horario de apertura',
      contact: 'Contacto',
      highlights: 'Aspectos destacados',
      perfectFor: 'Perfecto para',
      readMore: 'Leer más',
      readLess: 'Leer menos',
      shareCopied: '¡Enlace copiado al portapapeles!',
      shareSuccess: '¡Compartido con éxito!',
      addedToFavorites: '¡Añadido a favoritos!',
      removedFromFavorites: 'Eliminado de favoritos',
      categoryHighlights: {
        active: ['Actividades al aire libre', 'Deportes de aventura', 'Fitness físico'],
        beaches: ['Vistas panorámicas', 'Relajación', 'Belleza natural'],
        culture: ['Importancia histórica', 'Patrimonio cultural', 'Educativo'],
        recreation: ['Entretenimiento', 'Apto para familias', 'Actividades divertidas'],
        food: ['Cocina local', 'Experiencia gastronómica', 'Sabor y aroma'],
        health: ['Bienestar', 'Autocuidado', 'Servicios de salud'],
        shopping: ['Experiencia de compras', 'Productos locales', 'Terapia de compras'],
        practical: ['Servicios esenciales', 'Comodidad', 'Necesidades prácticas'],
        default: ['Gran experiencia', 'Vale la pena visitar', 'Opción popular'],
      },
      categoryPerfectFor: {
        active: ['Entusiastas del deporte', 'Buscadores de aventuras', 'Amantes del fitness'],
        beaches: ['Amantes de la playa', 'Entusiastas de la naturaleza', 'Fotógrafos'],
        culture: ['Aficionados a la historia', 'Amantes de la cultura', 'Viajes educativos'],
        recreation: ['Familias', 'Grupos', 'Buscadores de entretenimiento'],
        food: ['Amantes de la comida', 'Exploradores culinarios', 'Cenas sociales'],
        health: ['Buscadores de bienestar', 'Amantes del spa', 'Conscientes de la salud'],
        shopping: ['Compradores', 'Cazadores de souvenirs', 'Amantes de la moda'],
        practical: ['Viajeros', 'Residentes locales', 'Cualquiera que necesite servicios'],
        default: ['Todos los visitantes', 'Viajeros', 'Exploradores locales'],
      },
      budgetLabels: {
        budget: 'Económico',
        midRange: 'Gama media',
        upscale: 'Alto nivel',
        luxury: 'Lujo',
        priceLevel: 'Nivel de Precio',
      },
      openingStatus: {
        open: 'Abierto ahora',
        closed: 'Cerrado',
        closesAt: 'Cierra a las',
        closedToday: 'Cerrado hoy',
        available: 'Disponible',
      },
      amenities: {
        title: 'Servicios',
        wheelchairAccessible: 'Accesible en silla de ruedas',
        freeWifi: 'WiFi Gratis Disponible',
        creditCards: 'Acepta Tarjetas de Crédito',
        noDetails: 'No hay detalles adicionales disponibles',
        featureNames: {
          'Wheelchair accessible entrance': 'Entrada accesible en silla de ruedas',
          'Wheelchair accessible parking lot': 'Aparcamiento accesible en silla de ruedas',
          'Wheelchair accessible restroom': 'Baño accesible en silla de ruedas',
          'Wheelchair accessible seating': 'Asientos accesibles en silla de ruedas',
          'Bar onsite': 'Bar en el local',
          'Restroom': 'Baño',
          'Wi-Fi': 'Wi-Fi',
          'Free Wi-Fi': 'Wi-Fi gratuito',
          'Good for kids': 'Apto para niños',
          'High chairs': 'Tronas',
          'Dogs allowed': 'Se admiten perros',
          'Gender-neutral restroom': 'Baño de género neutro',
          'Free parking lot': 'Aparcamiento gratuito',
          'Free street parking': 'Aparcamiento gratuito en la calle',
          'Paid parking lot': 'Aparcamiento de pago',
          'Paid street parking': 'Aparcamiento de pago en la calle',
          'Parking garage': 'Garaje',
          'Valet parking': 'Aparcacoches',
          'Dine-in': 'Comer en el local',
          'Takeout': 'Para llevar',
          'Delivery': 'Entrega a domicilio',
          'Outdoor seating': 'Terraza',
          'Live music': 'Música en vivo',
          'Reservations': 'Reservas',
          'Private dining': 'Comedor privado',
          'Happy hour': 'Happy hour',
          'Brunch': 'Brunch',
          'Lunch': 'Almuerzo',
          'Dinner': 'Cena',
          'Breakfast': 'Desayuno',
          'Dessert': 'Postre',
          'Coffee': 'Café',
          'Cocktails': 'Cócteles',
          'Beer': 'Cerveza',
          'Wine': 'Vino',
          'Organic': 'Ecológico',
          'Vegetarian options': 'Opciones vegetarianas',
          'Vegan options': 'Opciones veganas',
        },
      },
      gallery: {
        noPhotos: 'No hay fotos disponibles',
        showAllPhotos: 'Mostrar todas las fotos',
        allPhotos: 'Todas',
      },
      loadingStates: {
        loadingDetails: 'Cargando detalles del POI...',
        notFound: 'POI No Encontrado',
        notFoundDescription: 'El POI que buscas no existe.',
      },
      comparison: {
        compare: 'Comparar',
        comparing: 'Comparando',
        addToCompare: 'Añadir a comparación',
        removeFromCompare: 'Eliminar de comparación',
        compareTitle: 'Comparación de POI',
        selectedCount: '{count} POI(s) seleccionado(s)',
        maxReached: 'Se pueden comparar un máximo de 3 POIs',
        clearAll: 'Limpiar todo',
        noItemsSelected: 'No se han seleccionado POIs',
        selectToCompare: 'Selecciona 2-3 POIs para comparar',
        hint: 'Haz clic en el icono de comparación en los POIs para agregarlos',
      },
    },
    categories: {
      // Calpe categories
      active: 'Activo',
      beaches: 'Playas y Naturaleza',
      culture: 'Cultura e Historia',
      recreation: 'Recreación',
      food: 'Comida y Bebida',
      health: 'Salud y Bienestar',
      shopping: 'Compras',
      practical: 'Práctico',
      // Texel categories
      actief: 'Activo',
      cultuur: 'Cultura e Historia',
      eten: 'Comida y Bebida',
      gezondheid: 'Salud y Bienestar',
      natuur: 'Naturaleza',
      praktisch: 'Práctico',
      winkelen: 'Compras',
    },
    reviews: {
      title: 'Reseñas',
      travelParty: {
        all: 'Todos los Viajeros',
        couples: 'Parejas',
        families: 'Familias',
        solo: 'Viajeros Solos',
        friends: 'Amigos',
        business: 'Negocios',
      },
      sort: {
        recent: 'Más Recientes',
        helpful: 'Más Útiles',
        highRating: 'Mejor Valoradas',
        lowRating: 'Peor Valoradas',
      },
      sentiment: {
        positive: 'Positivo',
        neutral: 'Neutral',
        negative: 'Negativo',
      },
      filterByTraveler: 'Filtrar por Tipo de Viajero',
      filterBySentiment: 'Filtrar por Sentimiento',
      sortBy: 'Ordenar por',
      helpful: 'Útil',
      noReviews: 'Aún no hay reseñas',
      writeReview: 'Escribir una Reseña',
      readMore: 'Leer más',
      showLess: 'Mostrar menos',
      visited: 'Visitado',
      loadingReviews: 'Cargando reseñas...',
      loadMoreReviews: 'Cargar Más Reseñas',
      reviewCount: 'reseñas',
      averageRating: 'Valoración media',
      review: 'reseña',
      allReviews: 'Todas las Reseñas',
      beFirstToShare: '¡Sé el primero en compartir tu experiencia!',
      failedToLoad: 'Error al cargar reseñas. Por favor, inténtalo de nuevo.',
      tryAgain: 'Intentar de nuevo',
      noMatchFilters: 'No hay reseñas que coincidan con tus filtros',
      adjustFilters: 'Ajusta la configuración de filtros para ver más reseñas.',
      today: 'Hoy',
      yesterday: 'Ayer',
      daysAgo: 'hace {n} días',
      weeksAgo: 'hace {n} semanas',
      weekAgo: 'hace 1 semana',
      monthsAgo: 'hace {n} meses',
      monthAgo: 'hace 1 mes',
      yearsAgo: 'hace {n} años',
      yearAgo: 'hace 1 año',
      writeReviewModal: {
        title: 'Escribir una Reseña',
        close: 'Cerrar',
        yourRating: 'Tu Valoración',
        travelPartyLabel: 'Grupo de Viaje',
        solo: 'Solo',
        couple: 'Pareja',
        family: 'Familia',
        friends: 'Amigos',
        business: 'Negocios',
        yourReview: 'Tu Reseña',
        placeholder: 'Comparte tu experiencia en este lugar... (mínimo 50 caracteres)',
        characters: 'caracteres',
        minimum: 'mínimo 50',
        addPhoto: 'Añadir Foto (Opcional)',
        uploadPhoto: 'Subir Foto',
        submitting: 'Enviando...',
        submitReview: 'Enviar Reseña',
        success: '¡Reseña enviada correctamente!',
        error: 'Error al enviar la reseña. Por favor, inténtalo de nuevo.',
        selectRating: 'Por favor selecciona una valoración',
        selectTravelParty: 'Por favor selecciona tu grupo de viaje',
        minChars: 'La reseña debe tener al menos 50 caracteres',
        uploadImageOnly: 'Por favor sube un archivo de imagen',
        imageTooLarge: 'La imagen debe ser menor de 5MB',
      },
    },
    common: {
      save: 'Guardar',
      close: 'Cerrar',
      apply: 'Aplicar',
      reset: 'Restablecer',
      loading: 'Cargando...',
      back: 'Volver',
      optional: 'opcional',
    },
    account: {
      tabs: {
        profile: 'Perfil',
        preferences: 'Preferencias',
        ai: 'IA',
        privacy: 'Privacidad',
        export: 'Exportar',
        settings: 'Configuración',
        favorites: 'Favoritos',
        visited: 'Visitados',
        reviews: 'Reseñas',
      },
      profile: {
        memberSince: 'Miembro desde',
        butlerFanSince: 'Fan del Butler desde',
        clickAvatarHint: 'Haz clic en el avatar para subir una foto',
        changePhoto: 'Cambiar Foto',
        quickActions: 'Acciones Rápidas',
        savedPOIs: 'POIs Guardados',
        favorites: 'Favoritos',
        visits: 'Visitas',
        reviews: 'Reseñas',
        comingSoon: 'Próximamente',
      },
      favorites: {
        title: 'Favoritos',
        infoText: 'Tus POIs y eventos guardados en un solo lugar.',
        poiTitle: 'POIs Favoritos',
        eventsTitle: 'Eventos Favoritos',
        emptyPois: 'Aún no has guardado ningún POI favorito.',
        emptyEvents: 'Aún no has guardado ningún evento favorito.',
        discoverPois: 'Descubrir POIs →',
        viewAgenda: 'Ver Agenda →',
        viewAll: 'Ver todos',
      },
      visited: {
        title: 'Lugares Visitados',
        infoText: 'Seguimiento automático cuando ves POIs y eventos.',
        poisTitle: 'POIs Visitados',
        eventsTitle: 'Eventos Visitados',
        emptyPois: 'El seguimiento de POIs visitados se activará pronto.',
        emptyEvents: 'El seguimiento de eventos visitados se activará pronto.',
        trackingInfo: 'Tu historial de visitas se registrará automáticamente cuando veas POIs.',
      },
      reviews: {
        title: 'Mis Reseñas',
        infoText: 'Ver y editar tus reseñas escritas.',
        empty: 'Aún no has escrito ninguna reseña.',
        emptyHint: '¡Comparte tus experiencias y ayuda a otros viajeros!',
        discoverToReview: 'Descubrir POIs para reseñar →',
      },
      preferences: {
        title: 'Preferencias de Viaje',
        travelingAs: 'Viajando como',
        interests: 'Intereses',
        dietary: 'Dietético',
        editButton: 'Editar Preferencias',
        asCouple: 'En pareja',
        foodDrinks: 'Comida y Bebidas',
        beaches: 'Playas',
        culture: 'Cultura',
        vegetarian: 'Vegetariano',
      },
      ai: {
        title: 'Personalización con IA',
        subtitle: 'Funciones de IA',
        infoText: 'Utilizamos datos locales, pero también IA para personalizar y optimizar tus recomendaciones. Tienes 100% de control sobre cómo se utiliza la IA',
        features: 'Funciones de IA',
        personalizedRecs: 'Recomendaciones Personalizadas',
        personalizedRecsDesc: 'Usar IA para sugerir POIs',
        smartFilters: 'Filtros Inteligentes',
        smartFiltersDesc: 'Filtros de búsqueda con IA',
        behavioralLearning: 'Aprendizaje Conductual',
        behavioralLearningDesc: 'Aprender de tus interacciones',
        howItWorks: '¿Cómo funciona la personalización con IA?',
      },
      privacy: {
        title: 'Tu privacidad nos importa',
        subtitle: 'Datos almacenados en tu dispositivo • Eliminación automática después de 30 días • 100% seguridad',
        dataCollection: 'Recopilación de Datos y Consentimiento',
        essentialCookies: 'Cookies Esenciales',
        essentialCookiesDesc: 'Necesarias para que el sitio funcione',
        required: 'REQUERIDO',
        analytics: 'Análisis',
        analyticsDesc: 'Entender el uso del sitio',
        personalization: 'Personalización',
        personalizationDesc: 'Mejorar recomendaciones',
        marketing: 'Marketing',
        marketingDesc: 'Correos promocionales',
        updateButton: 'Actualizar Configuración de Consentimiento',
      },
      export: {
        title: 'Descargar Tus Datos',
        infoText: 'Tienes derecho a descargar todos tus datos personales en un formato legible (RGPD Art. 15).',
        whatIncluded: '¿Qué está incluido?',
        includeList: {
          profile: 'Información del perfil',
          preferences: 'Preferencias de viaje',
          savedPOIs: 'POIs guardados y favoritos',
          reviews: 'Reseñas y valoraciones',
          visitHistory: 'Historial de visitas',
          activityLog: 'Registro de actividad de la cuenta',
          consentSettings: 'Configuración de consentimiento y privacidad',
        },
        format: 'Formato de Exportación',
        formatJSON: 'JSON (legible por máquina)',
        formatPDF: 'PDF (legible por humanos)',
        formatBoth: 'Ambos formatos',
        requestButton: 'Solicitar Exportación de Datos',
        validityNote: 'Las exportaciones están disponibles durante 7 días después de su generación.',
      },
      settings: {
        security: 'Seguridad',
        changePassword: 'Cambiar Contraseña',
        twoFactor: 'Autenticación de Dos Factores',
        twoFactorStatus: 'No activado',
        notifications: 'Notificaciones',
        emailNotifications: 'Notificaciones por Correo',
        pushNotifications: 'Notificaciones Push',
        dangerZone: 'Punto sin retorno',
        deleteData: 'Eliminar mis Datos Personales',
        deleteDataDesc: 'La cuenta permanece con configuración estándar',
        deleteAccount: 'Eliminar mi Cuenta',
        deleteAccountDesc: 'Esta acción no se puede deshacer',
      },
      modals: {
        changePasswordTitle: 'Cambiar Contraseña',
        currentPassword: 'Contraseña actual',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar contraseña',
        passwordWeak: 'Débil',
        passwordMedium: 'Media',
        passwordStrong: 'Fuerte',
        passwordRequirements: 'Mínimo 8 caracteres, usa mayúsculas, números y símbolos',
        passwordMismatch: 'Las contraseñas no coinciden',
        passwordMatch: 'Las contraseñas coinciden',
        passwordError: 'Error al cambiar la contraseña',
        changePassword: 'Cambiar Contraseña',
        twoFactorTitle: 'Autenticación de Dos Factores',
        twoFactorIntroTitle: 'Protege tu cuenta',
        twoFactorIntroText: 'Añade una capa extra de seguridad a tu cuenta.',
        twoFactorBenefit1: 'Protección contra acceso no autorizado',
        twoFactorBenefit2: 'Verificación adicional al iniciar sesión',
        twoFactorBenefit3: 'Códigos de respaldo para emergencias',
        twoFactorScanInstructions: 'Escanea el código QR con tu aplicación de autenticación',
        hideSecret: 'Ocultar clave secreta',
        showSecret: 'Mostrar clave secreta',
        recommendedApps: 'Aplicaciones recomendadas',
        twoFactorVerifyInstructions: 'Ingresa el código de 6 dígitos de tu aplicación',
        enterCodeFromApp: 'El código se actualiza cada 30 segundos',
        twoFactorEnabled: '¡2FA activado exitosamente!',
        backupCodesTitle: 'Códigos de respaldo',
        backupCodesWarning: 'Guarda estos códigos de forma segura.',
        copied: 'Copiado',
        copyAll: 'Copiar todos los códigos',
        twoFactorActive: '2FA está activo',
        twoFactorActiveDesc: 'Tu cuenta está protegida con 2FA',
        disableWarning: 'Desactivar 2FA hace tu cuenta menos segura',
        twoFactorError: 'Código de verificación inválido',
        twoFactorDisableError: 'Error al desactivar 2FA',
        startSetup: 'Iniciar Configuración',
        verify: 'Verificar',
        verifying: 'Verificando...',
        done: 'Listo',
        keepEnabled: 'Mantener Activado',
        disable2FA: 'Desactivar 2FA',
        disabling: 'Desactivando...',
        deleteDataTitle: 'Eliminar Datos Personales',
        deleteDataWarningTitle: '¡Atención!',
        deleteDataWarningText: 'Estás a punto de eliminar todos tus datos personales.',
        dataToBeDeleted: 'Se eliminará',
        deleteDataItem1: 'Nombre y foto de perfil',
        deleteDataItem2: 'Preferencias e intereses',
        deleteDataItem3: 'Favoritos y POIs guardados',
        deleteDataItem4: 'Historial de visitas',
        deleteDataItem5: 'Reseñas y calificaciones',
        dataKept: 'Se conservará',
        keepDataItem1: 'Correo electrónico (para iniciar sesión)',
        keepDataItem2: 'Cuenta y contraseña',
        deleteDataInfo: 'Después de eliminar puedes empezar de nuevo.',
        confirmDeleteData: 'Confirmar eliminación',
        typeToConfirm: 'Escribe DELETE DATA para confirmar',
        deleteDataError: 'Error al eliminar datos',
        deleting: 'Eliminando...',
        deleteData: 'Eliminar Datos',
        deleteAccountTitle: 'Eliminar Cuenta',
        deleteAccountWarningTitle: '¡Esto no se puede deshacer!',
        deleteAccountWarningText: 'Estás a punto de eliminar permanentemente tu cuenta de CalpeTrip.',
        gracePeriodTitle: '30 días de gracia',
        gracePeriodText: 'Tienes 30 días para cancelar la eliminación iniciando sesión de nuevo.',
        scheduledDeletion: 'Eliminación programada',
        permanentlyDeleted: 'Eliminado permanentemente',
        deleteAccountItem1: 'Tu perfil completo y datos personales',
        deleteAccountItem2: 'Todas tus preferencias y configuraciones',
        deleteAccountItem3: 'Tus favoritos y elementos guardados',
        deleteAccountItem4: 'Tus reseñas y calificaciones',
        deleteAccountItem5: 'Acceso a CalpeTrip',
        canCancelDeletion: 'Puedes cancelar la eliminación iniciando sesión dentro de 30 días.',
        whyLeaving: '¿Por qué nos dejas?',
        helpUsImprove: 'Opcional: Ayúdanos a mejorar',
        reasonNotUseful: 'Plataforma no suficientemente útil',
        reasonPrivacy: 'Preocupaciones de privacidad',
        reasonEmails: 'Demasiados correos',
        reasonAlternative: 'Encontré una alternativa',
        reasonTemporary: 'Cuenta temporal',
        reasonOther: 'Otro',
        tellUsMore: 'Cuéntanos más...',
        confirmDeleteAccount: 'Confirmar eliminación de cuenta',
        typeDeleteToConfirm: 'Escribe DELETE para confirmar',
        accountToDelete: 'Cuenta a eliminar',
        deleteAccountError: 'Error al eliminar la cuenta',
        keepAccount: 'Mantener Cuenta',
        deleteMyAccount: 'Eliminar Cuenta',
        processing: 'Procesando...',
        deletionScheduled: 'Eliminación programada',
        deletionScheduledText: 'Tu cuenta está programada para eliminación. Tienes 30 días para cancelar.',
        cancelBeforeDate: 'Inicia sesión antes de esta fecha para cancelar',
        confirmationEmailSent: 'Correo de confirmación enviado a',
        understood: 'Entendido',
        cancel: 'Cancelar',
        back: 'Atrás',
        next: 'Siguiente',
        continue: 'Continuar',
        saving: 'Guardando...',
      },
    },
    auth: {
      login: {
        title: 'CalpeTrip',
        subtitle: '¡Bienvenido de nuevo! Inicia sesión en tu cuenta',
        emailLabel: 'Correo electrónico',
        emailPlaceholder: 'tu.email@ejemplo.com',
        passwordLabel: 'Contraseña',
        passwordPlaceholder: 'Ingresa tu contraseña',
        forgotPassword: '¿Olvidaste tu contraseña?',
        signInButton: 'Iniciar Sesión',
        signingIn: 'Iniciando sesión...',
        noAccount: '¿No tienes cuenta?',
        signUp: 'Regístrate',
        backToHome: 'Volver al inicio',
        errorFillFields: 'Por favor, completa todos los campos',
        errorInvalidCredentials: 'Correo o contraseña incorrectos. Inténtalo de nuevo.',
        errorGeneric: 'Error al iniciar sesión. Inténtalo más tarde.',
      },
      signup: {
        title: 'CalpeTrip',
        subtitle: 'Crea tu cuenta',
        nameLabel: 'Nombre completo',
        namePlaceholder: 'Tu nombre completo',
        emailLabel: 'Correo electrónico',
        emailPlaceholder: 'tu.email@ejemplo.com',
        passwordLabel: 'Contraseña',
        passwordPlaceholder: 'Elige una contraseña segura',
        confirmPasswordLabel: 'Confirmar contraseña',
        confirmPasswordPlaceholder: 'Vuelve a ingresar tu contraseña',
        termsText: 'Acepto los',
        termsLink: 'Términos de Servicio',
        and: 'y',
        privacyLink: 'Política de Privacidad',
        signUpButton: 'Crear Cuenta',
        signingUp: 'Creando cuenta...',
        haveAccount: '¿Ya tienes una cuenta?',
        signIn: 'Iniciar sesión',
        backToHome: 'Volver al inicio',
        errorFillFields: 'Por favor, completa todos los campos',
        errorPasswordMismatch: 'Las contraseñas no coinciden',
        errorPasswordTooShort: 'La contraseña debe tener al menos 8 caracteres',
        errorEmailExists: 'Ya existe una cuenta con este correo. Por favor, inicia sesión.',
        errorGeneric: 'Error al registrarse. Inténtalo más tarde.',
        passwordRequirements: {
          title: 'La contraseña debe contener:',
          minLength: 'Al menos 8 caracteres',
          uppercase: 'Al menos 1 letra mayúscula',
          lowercase: 'Al menos 1 letra minúscula',
          number: 'Al menos 1 número',
          special: 'Al menos 1 carácter especial (!@#$%^&*)',
        },
        verificationSent: {
          title: 'Revisa tu correo',
          sentTo: 'Hemos enviado un correo de verificación a:',
          instruction: 'Haz clic en el enlace del correo para activar tu cuenta. También revisa tu carpeta de spam si no ves el correo.',
          goToLogin: 'Ir a iniciar sesión',
          noEmail: '¿No recibiste el correo?',
        },
      },
      verifyEmail: {
        verifying: 'Verificando correo...',
        verifyingText: 'Por favor espera, estamos verificando tu enlace.',
        success: '¡Correo verificado!',
        successMessage: 'Tu dirección de correo ha sido verificada exitosamente. Ya puedes iniciar sesión.',
        alreadyVerified: 'Ya verificado',
        alreadyVerifiedMessage: 'Esta dirección de correo ya ha sido verificada. Puedes iniciar sesión.',
        failed: 'Verificación fallida',
        failedMessage: 'Ocurrió un error durante la verificación. Por favor intenta de nuevo o solicita un nuevo correo de verificación.',
        goToLogin: 'Ir a iniciar sesión',
        requestNew: 'Solicitar nuevo correo de verificación',
        backToLogin: 'Volver a iniciar sesión',
      },
      resendVerification: {
        title: 'Reenviar correo de verificación',
        subtitle: 'Ingresa tu correo electrónico para recibir un nuevo correo de verificación.',
        emailLabel: 'Correo electrónico',
        emailPlaceholder: 'nombre@ejemplo.com',
        sendButton: 'Enviar correo de verificación',
        sending: 'Enviando...',
        success: 'Correo de verificación enviado',
        successMessage: 'Si esta dirección de correo está registrada con nosotros, recibirás un correo de verificación en unos minutos. También revisa tu carpeta de spam.',
        backToLogin: 'Volver a iniciar sesión',
        errorEmpty: 'Por favor ingresa tu correo electrónico',
        errorTooMany: 'Has solicitado demasiados correos de verificación. Por favor intenta de nuevo en una hora.',
        errorGeneric: 'Ocurrió un error',
      },
    },
    footer: {
      about: 'Sobre Nosotros',
      privacy: 'Privacidad',
      terms: 'Condiciones',
      contact: 'Contacto',
      copyright: '© 2025 CalpeTrip. Powered by AI. Hecho con amor para viajeros.',
      platformTitle: 'Plataforma',
      supportTitle: 'Soporte',
      legalTitle: 'Legal',
      howItWorks: 'Cómo Funciona',
      pois: 'Descubrir',
      faq: 'FAQ',
      help: 'Ayuda',
      cookies: 'Cookies',
      tagline: 'Tu Butler Personal en la Costa Blanca',
      allRights: 'Todos los derechos reservados.',
      madeWith: 'Hecho con ❤️ en la Costa Blanca',
      partners: 'Socios',
    },
    onboarding: {
      // Navigation
      back: 'Atrás',
      skip: 'Omitir',
      continue: 'Continuar →',
      // Progress
      stepOf: 'Paso',
      of: 'de',
      // Step 1: Travel Companion
      step1Title: '¿Con quién viajas?',
      couple: 'Pareja',
      coupleDesc: 'Disfrutando de un viaje romántico',
      family: 'Familia',
      familyDesc: 'Ideal para diversión familiar',
      soloDesc: 'Explora a tu propio ritmo',
      group: 'Grupo',
      groupDesc: 'Perfecto para amigos y colegas',
      // Step 2: Interests
      step2Title: '¿Qué buscas en Calpe?',
      selectAll: '(Selecciona todos los que apliquen)',
      selected: 'Seleccionado',
      option: 'opción',
      options: 'opciones',
      relax: 'Relajarse',
      relaxDesc: 'Descansar y recargar',
      active: 'Activo',
      activeDesc: 'Aventura y deportes',
      culture: 'Cultura',
      cultureDesc: 'Arte local y experiencias creativas',
      food: 'Comida',
      foodDesc: 'Aventuras culinarias',
      nature: 'Naturaleza',
      natureDesc: 'Exploración al aire libre',
      nightlife: 'Vida nocturna',
      nightlifeDesc: 'Entretenimiento nocturno',
      history: 'Historia',
      historyDesc: 'Descubre el pasado',
      shopping: 'Compras',
      shoppingDesc: 'Terapia de compras',
      // Step 3: Trip Context
      step3Title: 'Cuéntanos sobre tu viaje',
      stayType: 'Tipo de estancia',
      pleasure: 'Placer',
      business: 'Negocios',
      visitStatus: 'Estado de visita',
      firstTime: 'Primera vez',
      returning: 'Visitante recurrente',
      localResident: 'Residente local',
      whenVisiting: '¿Cuándo nos visitas?',
      tripDuration: 'Duración del viaje',
      duration1: '1-3 días (fin de semana)',
      duration2: '4-7 días (semana)',
      duration3: '1-2 semanas',
      duration4: '2+ semanas',
      durationFlex: 'Flexible/No estoy seguro',
      // Step 4: Optional
      optional: 'Opcional',
      selectMultiple: '(Selecciona múltiples)',
      dietaryTitle: '¿Requisitos dietéticos?',
      vegetarian: 'Vegetariano',
      vegan: 'Vegano',
      glutenFree: 'Sin gluten',
      halal: 'Halal',
      kosher: 'Kosher',
      lactoseFree: 'Sin lactosa',
      nutAllergies: 'Alergias a frutos secos',
      accessibilityTitle: '¿Necesidades de accesibilidad?',
      wheelchair: 'Accesible en silla de ruedas',
      mobility: 'Asistencia de movilidad',
      visual: 'Discapacidad visual',
      hearing: 'Discapacidad auditiva',
      // Buttons
      finishExplore: 'Finalizar y Explorar →',
      savePreferences: 'Guardar Preferencias →',
      // Edit mode
      editMode: 'Editando tus preferencias - Tus selecciones actuales se muestran abajo',
      cancelEdit: '¿Cancelar la edición y volver a tu cuenta?',
      skipConfirm: '¿Omitir el onboarding? Puedes establecer preferencias más tarde en tu cuenta.',
    },
    holibotChat: {
      welcome: '¡Hola! Soy CalpeChat 🌴',
      welcomeSubtitle: 'Tu guía personal de Calpe. ¿Cómo puedo ayudarte?',
      inputPlaceholder: 'Haz una pregunta sobre Calpe...',
      quickActions: {
        itinerary: 'Crear mi itinerario',
        locationInfo: 'Buscar por categoría',
        directions: 'Indicaciones',
        dailyTip: 'Mi Consejo del Día',
      },
      prompts: {
        itinerary: 'Crea un programa del día basado en mis preferencias',
        locationInfo: 'Busco información sobre una ubicación específica',
        directions: 'Ayúdame con las indicaciones a un destino',
      },
      responses: {
        loading: 'Pensando...',
        error: 'Lo siento, algo salió mal. Por favor, inténtalo de nuevo.',
        noResults: 'No se encontraron resultados. Prueba otra búsqueda.',
        itineraryIntro: 'Aquí está tu programa personalizado del día:',
        locationSearch: '¿Sobre qué ubicación te gustaría saber más?',
        directionsHelp: '¿A qué destino te gustaría ir?',
        yourItinerary: 'Tu Itinerario',
        eventsAdded: 'evento(s) añadido(s)',
      },
    },
  },
  sv: {
    nav: {
      home: 'Hem',
      explore: 'Utforska',
      holibot: 'CalpeChat',
      agenda: 'Agenda',
      reservations: 'Bokningar',
      tickets: 'Biljetter',
      favorites: 'Favoriter',
      account: 'Konto',
      about: 'Om',
      faq: 'FAQ',
    },
    agenda: {
      title: 'Calpe Agenda',
      subtitle: 'Upptäck alla evenemang, festivaler och aktiviteter i Calpe',
      categories: {
        all: 'Alla',
        festival: 'Festivaler',
        music: 'Musik',
        gastronomy: 'Gastronomi',
        market: 'Marknader',
        wellness: 'Välmående',
        adventure: 'Äventyr',
      },
      noEvents: 'Inga evenemang hittades för denna kategori.',
      loadMore: 'Ladda fler Evenemang',
      moreInfo: 'Mer info',
      newsletter: {
        title: 'Missa inget evenemang!',
        description: 'Prenumerera på vårt nyhetsbrev och få de bästa evenemangen i Calpe varje vecka.',
        placeholder: 'Din e-postadress',
        button: 'Prenumerera',
      },
    },
    reservations: {
      title: 'Restaurangbokningar',
      subtitle: 'Upptäck och boka på de bästa restaurangerna i Calpe',
      searchPlaceholder: 'Sök restaurang eller kök...',
      persons: 'gäster',
      person: 'gäst',
      time: 'Tid',
      cuisines: {
        all: 'Alla',
        mediterranean: 'Medelhavs',
        spanish: 'Spansk',
        italian: 'Italiensk',
        japanese: 'Japansk',
        seafood: 'Skaldjur',
        vegan: 'Vegansk',
      },
      found: 'restauranger hittade',
      reserveNow: 'Boka Nu',
      modal: {
        title: 'Boka på',
        name: 'Namn',
        email: 'E-post',
        phone: 'Telefon',
        guests: 'Antal gäster',
        date: 'Datum',
        time: 'Tid',
        selectTime: 'Välj tid',
        specialRequests: 'Särskilda önskemål',
        submit: 'Bekräfta Bokning',
      },
    },
    tickets: {
      title: 'Biljetter & Aktiviteter',
      subtitle: 'Boka biljetter till de bästa attraktionerna och aktiviteterna i Calpe',
      searchPlaceholder: 'Sök evenemang...',
      available: 'tillgängliga',
      buyTickets: 'Köp biljetter',
      selectTickets: 'Välj Biljetter',
      orderSummary: 'Beställningsöversikt',
      total: 'Totalt',
      continueToCheckout: 'Fortsätt till kassan',
      guestInformation: 'Gästinformation',
      name: 'Fullständigt namn',
      email: 'E-post',
      phone: 'Telefon',
      event: 'Evenemang',
      tickets: 'biljetter',
      processing: 'Bearbetar...',
      proceedToPayment: 'Gå till betalning',
      payment: 'Betalning',
      loadingPayment: 'Laddar betalningsmetoder...',
      bookingConfirmed: 'Bokning bekräftad!',
      confirmationMessage: 'Dina biljetter har bokats framgångsrikt.',
      bookingReference: 'Bokningsreferens',
      emailSent: 'Ett bekräftelsemail har skickats till',
      browseMoreEvents: 'Bläddra bland fler evenemang',
    },
    homepage: {
      hero: {
        title: 'Din vistelse, din stil.',
        payoff: 'Upptäck Calpe med din personliga Calpe-Assistent',
        subtitle: 'Upplev denna medelhavsjuvel helt anpassad till dig',
      },
      why: {
        title: 'Varför CalpeTrip?',
      },
      usps: {
        partner: { title: 'Officiell Partner', description: 'Officiell Partner Calpe Turismo' },
        ai: { title: 'Calpe AI-Assistent', description: 'HolidAIButler: Din (hyper) personliga butler' },
        local: { title: '100% Lokalt', description: 'Stöd Calpes ekonomi & identitet' },
        realtime: { title: 'Realtid noggrann information', description: 'Om platser, evenemang, aktiviteter och väder' },
        trusted: { title: 'Pålitlig & Säker', description: 'Från data till betalning: vi bryr oss om din integritet' },
      },
      cta: {
        explore: '🗺️ Utforska Calpe',
        agenda: '📅 Agenda',
      },
      features: {
        aiAssistant: {
          title: 'AI-driven Assistent',
          description: 'CalpeChat förstår dina preferenser och ger personliga rekommendationer för restauranger, aktiviteter och dolda pärlor.'
        },
        localPois: {
          title: '1 600+ lokala POI:er',
          description: 'Upptäck autentiska upplevelser kurerade av lokalbefolkningen. Från stränder till museer, restauranger till nattliv - vi har allt du behöver.'
        },
        tailored: {
          title: 'Skräddarsydd för dig',
          description: 'Berätta om din resestil, preferenser och intressen. Vi anpassar din upplevelse för att matcha din perfekta semester.'
        },
        account: {
          title: 'Din Resehub',
          description: 'Spara favoriter, håll koll på besök, hantera inställningar och kontrollera din integritet - allt på ett ställe.'
        },
      },
      rating: {
        score: 'Baserat på 2 500+ resenärsomdömen',
        text: '4.8 / 5.0',
        button: 'Läs Omdömen',
      },
    },
    poi: {
      searchPlaceholder: 'Sök POI:er, restauranger, stränder...',
      filters: 'Filter',
      loadMore: 'Ladda fler POI:er',
      noResults: 'Inga POI:er hittades',
      noResultsDesc: 'Försök justera din sökning eller kategorifilter',
      noReviews: 'Inga recensioner tillgängliga',
      moreInfo: 'Mer Info',
      share: 'Dela',
      agenda: 'Agenda',
      map: 'Karta',
      details: 'Detaljer',
      call: 'Ring',
      directions: 'Vägbeskrivning',
      save: 'Spara',
      saved: 'Sparad',
      print: 'Skriv ut',
      visitWebsite: 'Besök Webbplats',
      about: 'Om',
      openingHours: 'Öppettider',
      contact: 'Kontakt',
      highlights: 'Höjdpunkter',
      perfectFor: 'Perfekt för',
      readMore: 'Läs mer',
      readLess: 'Läs mindre',
      shareCopied: 'Länk kopierad till urklipp!',
      shareSuccess: 'Delat framgångsrikt!',
      addedToFavorites: 'Tillagt till favoriter!',
      removedFromFavorites: 'Borttagen från favoriter',
      categoryHighlights: {
        active: ['Utomhusaktiviteter', 'Äventyrssport', 'Fysisk träning'],
        beaches: ['Vackra vyer', 'Avkoppling', 'Naturlig skönhet'],
        culture: ['Historisk betydelse', 'Kulturarv', 'Pedagogisk'],
        recreation: ['Underhållning', 'Familjevänligt', 'Roliga aktiviteter'],
        food: ['Lokal mat', 'Matupplevelse', 'Smak & arom'],
        health: ['Välbefinnande', 'Egenvård', 'Hälsotjänster'],
        shopping: ['Shoppingupplevelse', 'Lokala produkter', 'Shoppingterapi'],
        practical: ['Väsentliga tjänster', 'Bekvämlighet', 'Praktiska behov'],
        default: ['Bra upplevelse', 'Värt att besöka', 'Populärt val'],
      },
      categoryPerfectFor: {
        active: ['Sportentusiaster', 'Äventyrssökare', 'Fitnessälskare'],
        beaches: ['Strandälskare', 'Naturentusiaster', 'Fotografer'],
        culture: ['Historiebuffs', 'Kulturälskare', 'Pedagogiska resor'],
        recreation: ['Familjer', 'Grupper', 'Underhållningssökare'],
        food: ['Matälskare', 'Kulinariska utforskare', 'Social matning'],
        health: ['Välbefinnandesökare', 'Spaälskare', 'Hälsomedvetna'],
        shopping: ['Shoppare', 'Souvenirjägare', 'Modeälskare'],
        practical: ['Resenärer', 'Lokala invånare', 'Vem som helst som behöver tjänster'],
        default: ['Alla besökare', 'Resenärer', 'Lokala upptäckare'],
      },
      budgetLabels: {
        budget: 'Budgetvänlig',
        midRange: 'Mellanpris',
        upscale: 'Exklusiv',
        luxury: 'Lyx',
        priceLevel: 'Prisnivå',
      },
      openingStatus: {
        open: 'Öppet nu',
        closed: 'Stängt',
        closesAt: 'Stänger kl',
        closedToday: 'Stängt idag',
        available: 'Tillgänglig',
      },
      amenities: {
        title: 'Faciliteter',
        wheelchairAccessible: 'Rullstolsanpassat',
        freeWifi: 'Gratis WiFi Tillgängligt',
        creditCards: 'Accepterar Kreditkort',
        noDetails: 'Inga ytterligare detaljer tillgängliga',
        featureNames: {
          'Wheelchair accessible entrance': 'Rullstolsanpassad entré',
          'Wheelchair accessible parking lot': 'Rullstolsanpassad parkering',
          'Wheelchair accessible restroom': 'Rullstolsanpassad toalett',
          'Wheelchair accessible seating': 'Rullstolsanpassade sittplatser',
          'Bar onsite': 'Bar på plats',
          'Restroom': 'Toalett',
          'Wi-Fi': 'Wi-Fi',
          'Free Wi-Fi': 'Gratis Wi-Fi',
          'Good for kids': 'Barnvänligt',
          'High chairs': 'Barnstolar',
          'Dogs allowed': 'Hundar tillåtna',
          'Gender-neutral restroom': 'Könsneutral toalett',
          'Free parking lot': 'Gratis parkering',
          'Free street parking': 'Gratis gatuparkering',
          'Paid parking lot': 'Betald parkering',
          'Paid street parking': 'Betald gatuparkering',
          'Parking garage': 'Parkeringsgarage',
          'Valet parking': 'Betjänad parkering',
          'Dine-in': 'Äta på plats',
          'Takeout': 'Avhämtning',
          'Delivery': 'Leverans',
          'Outdoor seating': 'Uteservering',
          'Live music': 'Livemusik',
          'Reservations': 'Reservationer',
          'Private dining': 'Privat matsal',
          'Happy hour': 'Happy hour',
          'Brunch': 'Brunch',
          'Lunch': 'Lunch',
          'Dinner': 'Middag',
          'Breakfast': 'Frukost',
          'Dessert': 'Dessert',
          'Coffee': 'Kaffe',
          'Cocktails': 'Cocktails',
          'Beer': 'Öl',
          'Wine': 'Vin',
          'Organic': 'Ekologiskt',
          'Vegetarian options': 'Vegetariska alternativ',
          'Vegan options': 'Veganska alternativ',
        },
      },
      gallery: {
        noPhotos: 'Inga foton tillgängliga',
        showAllPhotos: 'Visa alla foton',
        allPhotos: 'Alla',
      },
      loadingStates: {
        loadingDetails: 'Laddar POI-detaljer...',
        notFound: 'POI Hittades Inte',
        notFoundDescription: 'POI:n du söker existerar inte.',
      },
      comparison: {
        compare: 'Jämför',
        comparing: 'Jämföra',
        addToCompare: 'Lägg till i jämförelse',
        removeFromCompare: 'Ta bort från jämförelse',
        compareTitle: 'POI-jämförelse',
        selectedCount: '{count} POI(er) valda',
        maxReached: 'Maximalt 3 POI:er kan jämföras',
        clearAll: 'Rensa alla',
        noItemsSelected: 'Inga POI:er valda',
        selectToCompare: 'Välj 2-3 POI:er att jämföra',
        hint: 'Klicka på jämförelseikonen på POI:er för att lägga till dem',
      },
    },
    categories: {
      // Calpe categories
      active: 'Aktiv',
      beaches: 'Stränder & Natur',
      culture: 'Kultur & Historia',
      recreation: 'Rekreation',
      food: 'Mat & Dryck',
      health: 'Hälsa & Välbefinnande',
      shopping: 'Shopping',
      practical: 'Praktiskt',
      // Texel categories
      actief: 'Aktiv',
      cultuur: 'Kultur & Historia',
      eten: 'Mat & Dryck',
      gezondheid: 'Hälsa & Välbefinnande',
      natuur: 'Natur',
      praktisch: 'Praktiskt',
      winkelen: 'Shopping',
    },
    reviews: {
      title: 'Recensioner',
      travelParty: {
        all: 'Alla Resenärer',
        couples: 'Par',
        families: 'Familjer',
        solo: 'Soloresenärer',
        friends: 'Vänner',
        business: 'Affärs',
      },
      sort: {
        recent: 'Senaste',
        helpful: 'Mest Hjälpsam',
        highRating: 'Högsta Betyg',
        lowRating: 'Lägsta Betyg',
      },
      sentiment: {
        positive: 'Positiv',
        neutral: 'Neutral',
        negative: 'Negativ',
      },
      filterByTraveler: 'Filtrera efter Resenärstyp',
      filterBySentiment: 'Filtrera efter Känsla',
      sortBy: 'Sortera efter',
      helpful: 'Hjälpsam',
      noReviews: 'Inga recensioner ännu',
      writeReview: 'Skriv en Recension',
      readMore: 'Läs mer',
      showLess: 'Visa mindre',
      visited: 'Besökt',
      loadingReviews: 'Laddar recensioner...',
      loadMoreReviews: 'Ladda Fler Recensioner',
      reviewCount: 'recensioner',
      averageRating: 'Genomsnittligt betyg',
      review: 'recension',
      allReviews: 'Alla Recensioner',
      beFirstToShare: 'Bli den första att dela din upplevelse!',
      failedToLoad: 'Kunde inte ladda recensioner. Försök igen.',
      tryAgain: 'Försök igen',
      noMatchFilters: 'Inga recensioner matchar dina filter',
      adjustFilters: 'Justera dina filterinställningar för att se fler recensioner.',
      today: 'Idag',
      yesterday: 'Igår',
      daysAgo: '{n} dagar sedan',
      weeksAgo: '{n} veckor sedan',
      weekAgo: '1 vecka sedan',
      monthsAgo: '{n} månader sedan',
      monthAgo: '1 månad sedan',
      yearsAgo: '{n} år sedan',
      yearAgo: '1 år sedan',
      writeReviewModal: {
        title: 'Skriv en Recension',
        close: 'Stäng',
        yourRating: 'Ditt Betyg',
        travelPartyLabel: 'Resesällskap',
        solo: 'Solo',
        couple: 'Par',
        family: 'Familj',
        friends: 'Vänner',
        business: 'Affärs',
        yourReview: 'Din Recension',
        placeholder: 'Dela din upplevelse av denna plats... (minst 50 tecken)',
        characters: 'tecken',
        minimum: 'minst 50',
        addPhoto: 'Lägg till Foto (Valfritt)',
        uploadPhoto: 'Ladda upp Foto',
        submitting: 'Skickar...',
        submitReview: 'Skicka Recension',
        success: 'Recensionen har skickats!',
        error: 'Kunde inte skicka recensionen. Försök igen.',
        selectRating: 'Välj ett betyg',
        selectTravelParty: 'Välj ditt resesällskap',
        minChars: 'Recensionen måste vara minst 50 tecken',
        uploadImageOnly: 'Ladda upp en bildfil',
        imageTooLarge: 'Bilden måste vara mindre än 5MB',
      },
    },
    common: {
      save: 'Spara',
      close: 'Stäng',
      apply: 'Tillämpa',
      reset: 'Återställ',
      loading: 'Laddar...',
      back: 'Tillbaka',
      optional: 'valfritt',
    },
    account: {
      tabs: {
        profile: 'Profil',
        preferences: 'Preferenser',
        ai: 'AI',
        privacy: 'Integritet',
        export: 'Exportera',
        settings: 'Inställningar',
        favorites: 'Favoriter',
        visited: 'Besökta',
        reviews: 'Recensioner',
      },
      profile: {
        memberSince: 'Medlem sedan',
        butlerFanSince: 'Butler-fan sedan',
        clickAvatarHint: 'Klicka på avataren för att ladda upp foto',
        changePhoto: 'Ändra Foto',
        quickActions: 'Snabbåtgärder',
        savedPOIs: 'Sparade POI:er',
        favorites: 'Favoriter',
        visits: 'Besök',
        reviews: 'Recensioner',
        comingSoon: 'Kommer snart',
      },
      favorites: {
        title: 'Favoriter',
        infoText: 'Dina sparade POI:er och evenemang på ett ställe.',
        poiTitle: 'Favorit-POI:er',
        eventsTitle: 'Favoritevenemang',
        emptyPois: 'Du har inte sparat några favorit-POI:er ännu.',
        emptyEvents: 'Du har inte sparat några favoritevenemang ännu.',
        discoverPois: 'Upptäck POI:er →',
        viewAgenda: 'Visa Agenda →',
        viewAll: 'Visa alla',
      },
      visited: {
        title: 'Besökta Platser',
        infoText: 'Spåras automatiskt när du visar POI:er och evenemang.',
        poisTitle: 'Besökta POI:er',
        eventsTitle: 'Besökta Evenemang',
        emptyPois: 'Spårning av besökta POI:er aktiveras snart.',
        emptyEvents: 'Spårning av besökta evenemang aktiveras snart.',
        trackingInfo: 'Din besökshistorik spåras automatiskt när du visar POI:er.',
      },
      reviews: {
        title: 'Mina Recensioner',
        infoText: 'Visa och redigera dina skrivna recensioner.',
        empty: 'Du har inte skrivit några recensioner ännu.',
        emptyHint: 'Dela dina upplevelser och hjälp andra resenärer!',
        discoverToReview: 'Upptäck POI:er att recensera →',
      },
      preferences: {
        title: 'Resepreferenser',
        travelingAs: 'Reser som',
        interests: 'Intressen',
        dietary: 'Kost',
        editButton: 'Redigera Preferenser',
        asCouple: 'Som par',
        foodDrinks: 'Mat & Dryck',
        beaches: 'Stränder',
        culture: 'Kultur',
        vegetarian: 'Vegetarisk',
      },
      ai: {
        title: 'AI-driven Personalisering',
        subtitle: 'AI-funktioner',
        infoText: 'Vi använder lokal data, men även AI för att personalisera och optimera dina rekommendationer. Du har 100% kontroll över hur AI används',
        features: 'AI-funktioner',
        personalizedRecs: 'Personliga Rekommendationer',
        personalizedRecsDesc: 'Använd AI för att föreslå POI:er',
        smartFilters: 'Smarta Filter',
        smartFiltersDesc: 'AI-drivna sökfilter',
        behavioralLearning: 'Beteendeinlärning',
        behavioralLearningDesc: 'Lär av dina interaktioner',
        howItWorks: 'Hur fungerar AI-personalisering?',
      },
      privacy: {
        title: 'Din integritet är viktig för oss',
        subtitle: 'Data lagrad på din enhet • Auto-radering efter 30 dagar • 100% säkerhet',
        dataCollection: 'Datainsamling & Samtycke',
        essentialCookies: 'Nödvändiga Cookies',
        essentialCookiesDesc: 'Krävs för att webbplatsen ska fungera',
        required: 'KRÄVS',
        analytics: 'Analys',
        analyticsDesc: 'Förstå webbplatsanvändning',
        personalization: 'Personalisering',
        personalizationDesc: 'Förbättra rekommendationer',
        marketing: 'Marknadsföring',
        marketingDesc: 'Reklam e-post',
        updateButton: 'Uppdatera Samtyckeinställningar',
      },
      export: {
        title: 'Ladda Ner Dina Data',
        infoText: 'Du har rätt att ladda ner all din personliga data i ett läsbart format (GDPR Art. 15).',
        whatIncluded: 'Vad ingår?',
        includeList: {
          profile: 'Profilinformation',
          preferences: 'Resepreferenser',
          savedPOIs: 'Sparade POI:er & favoriter',
          reviews: 'Recensioner & betyg',
          visitHistory: 'Besökshistorik',
          activityLog: 'Kontoaktivitetslogg',
          consentSettings: 'Samtycke- & integritetsinställningar',
        },
        format: 'Exportformat',
        formatJSON: 'JSON (maskinläsbar)',
        formatPDF: 'PDF (mänskligt läsbar)',
        formatBoth: 'Båda formaten',
        requestButton: 'Begär Dataexport',
        validityNote: 'Export är tillgängliga i 7 dagar efter generering.',
      },
      settings: {
        security: 'Säkerhet',
        changePassword: 'Ändra Lösenord',
        twoFactor: 'Tvåfaktorsautentisering',
        twoFactorStatus: 'Inte aktiverad',
        notifications: 'Notifikationer',
        emailNotifications: 'E-postmeddelanden',
        pushNotifications: 'Push-notifikationer',
        dangerZone: 'Punkt utan återvändo',
        deleteData: 'Radera mina Personuppgifter',
        deleteDataDesc: 'Kontot förblir med standardinställningar',
        deleteAccount: 'Radera mitt Konto',
        deleteAccountDesc: 'Denna åtgärd kan inte ångras',
      },
      modals: {
        changePasswordTitle: 'Ändra Lösenord',
        currentPassword: 'Nuvarande lösenord',
        newPassword: 'Nytt lösenord',
        confirmPassword: 'Bekräfta lösenord',
        passwordWeak: 'Svagt',
        passwordMedium: 'Medium',
        passwordStrong: 'Starkt',
        passwordRequirements: 'Minst 8 tecken, använd versaler, siffror och symboler',
        passwordMismatch: 'Lösenorden matchar inte',
        passwordMatch: 'Lösenorden matchar',
        passwordError: 'Fel vid ändring av lösenord',
        changePassword: 'Ändra Lösenord',
        twoFactorTitle: 'Tvåfaktorsautentisering',
        twoFactorIntroTitle: 'Skydda ditt konto',
        twoFactorIntroText: 'Lägg till ett extra säkerhetslager på ditt konto.',
        twoFactorBenefit1: 'Skydd mot obehörig åtkomst',
        twoFactorBenefit2: 'Extra verifiering vid inloggning',
        twoFactorBenefit3: 'Backup-koder för nödsituationer',
        twoFactorScanInstructions: 'Skanna QR-koden med din autentiseringsapp',
        hideSecret: 'Dölj hemlig nyckel',
        showSecret: 'Visa hemlig nyckel',
        recommendedApps: 'Rekommenderade appar',
        twoFactorVerifyInstructions: 'Ange den 6-siffriga koden från din app',
        enterCodeFromApp: 'Koden uppdateras var 30:e sekund',
        twoFactorEnabled: '2FA har aktiverats!',
        backupCodesTitle: 'Backup-koder',
        backupCodesWarning: 'Förvara dessa koder säkert.',
        copied: 'Kopierat',
        copyAll: 'Kopiera alla koder',
        twoFactorActive: '2FA är aktivt',
        twoFactorActiveDesc: 'Ditt konto är skyddat med 2FA',
        disableWarning: 'Att inaktivera 2FA gör ditt konto mindre säkert',
        twoFactorError: 'Ogiltig verifieringskod',
        twoFactorDisableError: 'Fel vid inaktivering av 2FA',
        startSetup: 'Starta Installation',
        verify: 'Verifiera',
        verifying: 'Verifierar...',
        done: 'Klar',
        keepEnabled: 'Behåll Aktiverad',
        disable2FA: 'Inaktivera 2FA',
        disabling: 'Inaktiverar...',
        deleteDataTitle: 'Radera Personuppgifter',
        deleteDataWarningTitle: 'Varning!',
        deleteDataWarningText: 'Du är på väg att radera alla dina personuppgifter.',
        dataToBeDeleted: 'Kommer att raderas',
        deleteDataItem1: 'Namn och profilbild',
        deleteDataItem2: 'Preferenser och intressen',
        deleteDataItem3: 'Favoriter och sparade POIs',
        deleteDataItem4: 'Besökshistorik',
        deleteDataItem5: 'Recensioner och betyg',
        dataKept: 'Behålls',
        keepDataItem1: 'E-postadress (för inloggning)',
        keepDataItem2: 'Konto och lösenord',
        deleteDataInfo: 'Efter radering kan du börja om på nytt.',
        confirmDeleteData: 'Bekräfta radering',
        typeToConfirm: 'Skriv DELETE DATA för att bekräfta',
        deleteDataError: 'Fel vid radering av data',
        deleting: 'Raderar...',
        deleteData: 'Radera Data',
        deleteAccountTitle: 'Radera Konto',
        deleteAccountWarningTitle: 'Detta kan inte ångras!',
        deleteAccountWarningText: 'Du är på väg att permanent radera ditt CalpeTrip-konto.',
        gracePeriodTitle: '30 dagars betänketid',
        gracePeriodText: 'Du har 30 dagar på dig att avbryta raderingen genom att logga in igen.',
        scheduledDeletion: 'Schemalagd radering',
        permanentlyDeleted: 'Permanent raderat',
        deleteAccountItem1: 'Din fullständiga profil och personuppgifter',
        deleteAccountItem2: 'Alla dina preferenser och inställningar',
        deleteAccountItem3: 'Dina favoriter och sparade objekt',
        deleteAccountItem4: 'Dina recensioner och betyg',
        deleteAccountItem5: 'Tillgång till CalpeTrip',
        canCancelDeletion: 'Du kan avbryta raderingen genom att logga in inom 30 dagar.',
        whyLeaving: 'Varför lämnar du oss?',
        helpUsImprove: 'Valfritt: Hjälp oss att förbättra',
        reasonNotUseful: 'Plattformen är inte tillräckligt användbar',
        reasonPrivacy: 'Integritetsproblem',
        reasonEmails: 'För många e-postmeddelanden',
        reasonAlternative: 'Hittade ett alternativ',
        reasonTemporary: 'Tillfälligt konto',
        reasonOther: 'Annat',
        tellUsMore: 'Berätta mer...',
        confirmDeleteAccount: 'Bekräfta kontoradering',
        typeDeleteToConfirm: 'Skriv DELETE för att bekräfta',
        accountToDelete: 'Konto som ska raderas',
        deleteAccountError: 'Fel vid radering av konto',
        keepAccount: 'Behåll Konto',
        deleteMyAccount: 'Radera Konto',
        processing: 'Bearbetar...',
        deletionScheduled: 'Radering schemalagd',
        deletionScheduledText: 'Ditt konto är schemalagt för radering. Du har 30 dagar att avbryta.',
        cancelBeforeDate: 'Logga in före detta datum för att avbryta',
        confirmationEmailSent: 'Bekräftelsemail skickat till',
        understood: 'Förstått',
        cancel: 'Avbryt',
        back: 'Tillbaka',
        next: 'Nästa',
        continue: 'Fortsätt',
        saving: 'Sparar...',
      },
    },
    auth: {
      login: {
        title: 'CalpeTrip',
        subtitle: 'Välkommen tillbaka! Logga in på ditt konto',
        emailLabel: 'E-postadress',
        emailPlaceholder: 'din.email@exempel.se',
        passwordLabel: 'Lösenord',
        passwordPlaceholder: 'Ange ditt lösenord',
        forgotPassword: 'Glömt lösenord?',
        signInButton: 'Logga In',
        signingIn: 'Loggar in...',
        noAccount: 'Har du inget konto?',
        signUp: 'Registrera dig',
        backToHome: 'Tillbaka till startsidan',
        errorFillFields: 'Vänligen fyll i alla fält',
        errorInvalidCredentials: 'Ogiltig e-post eller lösenord. Försök igen.',
        errorGeneric: 'Inloggning misslyckades. Försök igen senare.',
      },
      signup: {
        title: 'CalpeTrip',
        subtitle: 'Skapa ditt konto',
        nameLabel: 'Fullständigt namn',
        namePlaceholder: 'Ditt fullständiga namn',
        emailLabel: 'E-postadress',
        emailPlaceholder: 'din.email@exempel.se',
        passwordLabel: 'Lösenord',
        passwordPlaceholder: 'Välj ett säkert lösenord',
        confirmPasswordLabel: 'Bekräfta lösenord',
        confirmPasswordPlaceholder: 'Ange ditt lösenord igen',
        termsText: 'Jag godkänner',
        termsLink: 'Användarvillkoren',
        and: 'och',
        privacyLink: 'Integritetspolicyn',
        signUpButton: 'Skapa Konto',
        signingUp: 'Skapar konto...',
        haveAccount: 'Har du redan ett konto?',
        signIn: 'Logga in',
        backToHome: 'Tillbaka till startsidan',
        errorFillFields: 'Vänligen fyll i alla fält',
        errorPasswordMismatch: 'Lösenorden matchar inte',
        errorPasswordTooShort: 'Lösenordet måste vara minst 8 tecken',
        errorEmailExists: 'Ett konto med denna e-post finns redan. Vänligen logga in.',
        errorGeneric: 'Registreringen misslyckades. Försök igen senare.',
        passwordRequirements: {
          title: 'Lösenordet måste innehålla:',
          minLength: 'Minst 8 tecken',
          uppercase: 'Minst 1 stor bokstav',
          lowercase: 'Minst 1 liten bokstav',
          number: 'Minst 1 siffra',
          special: 'Minst 1 specialtecken (!@#$%^&*)',
        },
        verificationSent: {
          title: 'Kontrollera din e-post',
          sentTo: 'Vi har skickat ett verifieringsmail till:',
          instruction: 'Klicka på länken i mailet för att aktivera ditt konto. Kolla även din skräppostmapp om du inte ser mailet.',
          goToLogin: 'Gå till inloggning',
          noEmail: 'Fick du inget mail?',
        },
      },
      verifyEmail: {
        verifying: 'Verifierar e-post...',
        verifyingText: 'Vänta, vi kontrollerar din verifieringslänk.',
        success: 'E-post verifierad!',
        successMessage: 'Din e-postadress har verifierats. Du kan nu logga in.',
        alreadyVerified: 'Redan verifierad',
        alreadyVerifiedMessage: 'Denna e-postadress har redan verifierats. Du kan logga in.',
        failed: 'Verifiering misslyckades',
        failedMessage: 'Ett fel uppstod vid verifieringen. Försök igen eller begär ett nytt verifieringsmail.',
        goToLogin: 'Gå till inloggning',
        requestNew: 'Begär nytt verifieringsmail',
        backToLogin: 'Tillbaka till inloggning',
      },
      resendVerification: {
        title: 'Skicka verifieringsmail igen',
        subtitle: 'Ange din e-postadress för att få ett nytt verifieringsmail.',
        emailLabel: 'E-postadress',
        emailPlaceholder: 'namn@exempel.se',
        sendButton: 'Skicka verifieringsmail',
        sending: 'Skickar...',
        success: 'Verifieringsmail skickat',
        successMessage: 'Om denna e-postadress finns registrerad hos oss får du ett verifieringsmail inom några minuter. Kolla även din skräppostmapp.',
        backToLogin: 'Tillbaka till inloggning',
        errorEmpty: 'Ange din e-postadress',
        errorTooMany: 'Du har begärt för många verifieringsmail. Försök igen om en timme.',
        errorGeneric: 'Ett fel uppstod',
      },
    },
    footer: {
      about: 'Om Oss',
      privacy: 'Integritetspolicy',
      terms: 'Villkor',
      contact: 'Kontakt',
      copyright: '© 2025 CalpeTrip. Powered by AI. Gjord med kärlek för resenärer.',
      platformTitle: 'Plattform',
      supportTitle: 'Support',
      legalTitle: 'Juridiskt',
      howItWorks: 'Så Fungerar Det',
      pois: 'Utforska',
      faq: 'FAQ',
      help: 'Hjälp',
      cookies: 'Cookies',
      tagline: 'Din Personliga Butler på Costa Blanca',
      allRights: 'Alla rättigheter förbehållna.',
      madeWith: 'Gjord med ❤️ på Costa Blanca',
      partners: 'Partners',
    },
    onboarding: {
      // Navigation
      back: 'Tillbaka',
      skip: 'Hoppa över',
      continue: 'Fortsätt →',
      // Progress
      stepOf: 'Steg',
      of: 'av',
      // Step 1: Travel Companion
      step1Title: 'Vem reser du med?',
      couple: 'Par',
      coupleDesc: 'Njut av en romantisk resa',
      family: 'Familj',
      familyDesc: 'Perfekt för familjekul',
      soloDesc: 'Utforska i din egen takt',
      group: 'Grupp',
      groupDesc: 'Perfekt för vänner och kollegor',
      // Step 2: Interests
      step2Title: 'Vad letar du efter i Calpe?',
      selectAll: '(Välj alla som gäller)',
      selected: 'Valt',
      option: 'alternativ',
      options: 'alternativ',
      relax: 'Avkoppling',
      relaxDesc: 'Vila och ladda om',
      active: 'Aktiv',
      activeDesc: 'Äventyr och sport',
      culture: 'Kultur',
      cultureDesc: 'Lokal konst & kreativa upplevelser',
      food: 'Mat',
      foodDesc: 'Kulinariska äventyr',
      nature: 'Natur',
      natureDesc: 'Utomhusutforskning',
      nightlife: 'Nattliv',
      nightlifeDesc: 'Kvällsunderhållning',
      history: 'Historia',
      historyDesc: 'Upptäck det förflutna',
      shopping: 'Shopping',
      shoppingDesc: 'Shoppingterapi',
      // Step 3: Trip Context
      step3Title: 'Berätta om din resa',
      stayType: 'Typ av vistelse',
      pleasure: 'Nöje',
      business: 'Affärer',
      visitStatus: 'Besöksstatus',
      firstTime: 'Första gången',
      returning: 'Återkommande besökare',
      localResident: 'Lokal invånare',
      whenVisiting: 'När besöker du?',
      tripDuration: 'Resans längd',
      duration1: '1-3 dagar (helg)',
      duration2: '4-7 dagar (vecka)',
      duration3: '1-2 veckor',
      duration4: '2+ veckor',
      durationFlex: 'Flexibel/Inte säker',
      // Step 4: Optional
      optional: 'Valfritt',
      selectMultiple: '(Välj flera)',
      dietaryTitle: 'Kostbehov?',
      vegetarian: 'Vegetarisk',
      vegan: 'Vegansk',
      glutenFree: 'Glutenfri',
      halal: 'Halal',
      kosher: 'Kosher',
      lactoseFree: 'Laktosfri',
      nutAllergies: 'Nötallergier',
      accessibilityTitle: 'Tillgänglighetsbehov?',
      wheelchair: 'Rullstolsanpassad',
      mobility: 'Rörelsehjälp',
      visual: 'Synnedsättning',
      hearing: 'Hörselnedsättning',
      // Buttons
      finishExplore: 'Slutför & Utforska →',
      savePreferences: 'Spara Inställningar →',
      // Edit mode
      editMode: 'Redigerar dina preferenser - Dina nuvarande val visas nedan',
      cancelEdit: 'Avbryt redigering och återgå till ditt konto?',
      skipConfirm: 'Hoppa över onboarding? Du kan ställa in preferenser senare i ditt konto.',
    },
    holibotChat: {
      welcome: 'Hej! Jag är CalpeChat 🌴',
      welcomeSubtitle: 'Din personliga Calpe-guide. Hur kan jag hjälpa dig?',
      inputPlaceholder: 'Ställ en fråga om Calpe...',
      quickActions: {
        itinerary: 'Skapa mitt schema',
        locationInfo: 'Sök efter kategori',
        directions: 'Vägbeskrivning',
        dailyTip: 'Mitt dagstips',
      },
      prompts: {
        itinerary: 'Skapa ett dagsprogram baserat på mina preferenser',
        locationInfo: 'Jag söker information om en specifik plats',
        directions: 'Hjälp mig med vägen till en destination',
      },
      responses: {
        loading: 'Tänker...',
        error: 'Förlåt, något gick fel. Försök igen.',
        noResults: 'Inga resultat hittades. Prova en annan sökning.',
        itineraryIntro: 'Här är ditt personliga dagsprogram:',
        locationSearch: 'Vilken plats vill du veta mer om?',
        directionsHelp: 'Vilken destination vill du navigera till?',
        yourItinerary: 'Ditt Schema',
        eventsAdded: 'evenemang tillagt/tillagda',
      },
    },
  },
  pl: {
    nav: {
      home: 'Strona główna',
      explore: 'Odkryj',
      holibot: 'CalpeChat',
      agenda: 'Agenda',
      reservations: 'Rezerwacje',
      tickets: 'Bilety',
      favorites: 'Ulubione',
      account: 'Konto',
      about: 'O nas',
      faq: 'FAQ',
    },
    agenda: {
      title: 'Agenda Calpe',
      subtitle: 'Odkryj wszystkie wydarzenia, festiwale i atrakcje w Calpe',
      categories: {
        all: 'Wszystkie',
        festival: 'Festiwale',
        music: 'Muzyka',
        gastronomy: 'Gastronomia',
        market: 'Targi',
        wellness: 'Wellness',
        adventure: 'Przygoda',
      },
      noEvents: 'Nie znaleziono wydarzeń dla tej kategorii.',
      loadMore: 'Załaduj więcej Wydarzeń',
      moreInfo: 'Więcej informacji',
      newsletter: {
        title: 'Nie przegap żadnego wydarzenia!',
        description: 'Zapisz się do naszego newslettera i otrzymuj co tydzień najlepsze wydarzenia w Calpe.',
        placeholder: 'Twój adres e-mail',
        button: 'Zapisz się',
      },
    },
    reservations: {
      title: 'Rezerwacje Restauracji',
      subtitle: 'Odkryj i zarezerwuj w najlepszych restauracjach w Calpe',
      searchPlaceholder: 'Szukaj restauracji lub kuchni...',
      persons: 'osób',
      person: 'osoba',
      time: 'Godzina',
      cuisines: {
        all: 'Wszystkie',
        mediterranean: 'Śródziemnomorska',
        spanish: 'Hiszpańska',
        italian: 'Włoska',
        japanese: 'Japońska',
        seafood: 'Owoce morza',
        vegan: 'Wegańska',
      },
      found: 'restauracji znaleziono',
      reserveNow: 'Zarezerwuj Teraz',
      modal: {
        title: 'Zarezerwuj w',
        name: 'Imię',
        email: 'E-mail',
        phone: 'Telefon',
        guests: 'Liczba osób',
        date: 'Data',
        time: 'Godzina',
        selectTime: 'Wybierz godzinę',
        specialRequests: 'Specjalne życzenia',
        submit: 'Potwierdź Rezerwację',
      },
    },
    tickets: {
      title: 'Bilety i Atrakcje',
      subtitle: 'Zarezerwuj bilety na najlepsze atrakcje i zajęcia w Calpe',
      searchPlaceholder: 'Szukaj wydarzeń...',
      available: 'dostępne',
      buyTickets: 'Kup bilety',
      selectTickets: 'Wybierz Bilety',
      orderSummary: 'Podsumowanie Zamówienia',
      total: 'Razem',
      continueToCheckout: 'Przejdź do kasy',
      guestInformation: 'Informacje o Gościu',
      name: 'Imię i Nazwisko',
      email: 'E-mail',
      phone: 'Telefon',
      event: 'Wydarzenie',
      tickets: 'bilety',
      processing: 'Przetwarzanie...',
      proceedToPayment: 'Przejdź do płatności',
      payment: 'Płatność',
      loadingPayment: 'Ładowanie metod płatności...',
      bookingConfirmed: 'Rezerwacja Potwierdzona!',
      confirmationMessage: 'Twoje bilety zostały pomyślnie zarezerwowane.',
      bookingReference: 'Numer Rezerwacji',
      emailSent: 'E-mail z potwierdzeniem został wysłany do',
      browseMoreEvents: 'Przeglądaj Więcej Wydarzeń',
    },
    homepage: {
      hero: {
        title: 'Twój pobyt, Twój styl.',
        payoff: 'Odkryj Calpe z Twoim osobistym asystentem Calpe',
        subtitle: 'Doświadcz tego śródziemnomorskiego klejnotu w pełni dostosowanego do Ciebie',
      },
      why: {
        title: 'Dlaczego CalpeTrip?',
      },
      usps: {
        partner: { title: 'Oficjalny Partner', description: 'Oficjalny Partner Calpe Turismo' },
        ai: { title: 'Asystent AI Calpe', description: 'HolidAIButler: Twój (bardzo) osobisty Butler' },
        local: { title: '100% Lokalny', description: 'Wspieraj gospodarkę i tożsamość Calpe' },
        realtime: { title: 'Informacje w czasie rzeczywistym', description: 'O lokalizacjach, wydarzeniach, aktywnościach i pogodzie' },
        trusted: { title: 'Zaufany i Bezpieczny', description: 'Od danych do płatności: dbamy o Twoją prywatność' },
      },
      cta: {
        explore: '🗺️ Odkryj Calpe',
        agenda: '📅 Agenda',
      },
      features: {
        aiAssistant: {
          title: 'Asystent AI',
          description: 'CalpeChat rozumie Twoje preferencje i dostarcza spersonalizowane rekomendacje restauracji, atrakcji i ukrytych perełek.'
        },
        localPois: {
          title: '1600+ lokalnych POI',
          description: 'Odkryj autentyczne doświadczenia wybrane przez mieszkańców. Od plaż po muzea, restauracje po życie nocne - mamy wszystko.'
        },
        tailored: {
          title: 'Dostosowane do Ciebie',
          description: 'Powiedz nam o swoim stylu podróżowania, preferencjach i zainteresowaniach. Dostosujemy Twoje doświadczenie do idealnych wakacji.'
        },
        account: {
          title: 'Twoje Centrum Podróży',
          description: 'Zapisuj ulubione, śledź wizyty, zarządzaj preferencjami i kontroluj prywatność - wszystko w jednym miejscu.'
        },
      },
      rating: {
        score: 'Na podstawie 2500+ recenzji podróżnych',
        text: '4.8 / 5.0',
        button: 'Czytaj Recenzje',
      },
    },
    poi: {
      searchPlaceholder: 'Szukaj POI, restauracji, plaż...',
      filters: 'Filtry',
      loadMore: 'Załaduj więcej POI',
      noResults: 'Nie znaleziono POI',
      noResultsDesc: 'Spróbuj dostosować wyszukiwanie lub filtr kategorii',
      noReviews: 'Brak dostępnych recenzji',
      moreInfo: 'Więcej informacji',
      share: 'Udostępnij',
      agenda: 'Agenda',
      map: 'Mapa',
      details: 'Szczegóły',
      call: 'Zadzwoń',
      directions: 'Dojazd',
      save: 'Zapisz',
      saved: 'Zapisano',
      print: 'Drukuj',
      visitWebsite: 'Odwiedź stronę',
      about: 'O miejscu',
      openingHours: 'Godziny otwarcia',
      contact: 'Kontakt',
      highlights: 'Najważniejsze',
      perfectFor: 'Idealne dla',
      readMore: 'Czytaj więcej',
      readLess: 'Czytaj mniej',
      shareCopied: 'Link skopiowany do schowka!',
      shareSuccess: 'Udostępniono pomyślnie!',
      addedToFavorites: 'Dodano do ulubionych!',
      removedFromFavorites: 'Usunięto z ulubionych',
      categoryHighlights: {
        active: ['Aktywności na świeżym powietrzu', 'Sporty przygodowe', 'Fitness'],
        beaches: ['Malownicze widoki', 'Relaks', 'Piękno natury'],
        culture: ['Znaczenie historyczne', 'Dziedzictwo kulturowe', 'Edukacja'],
        recreation: ['Rozrywka', 'Dla rodzin', 'Zabawne aktywności'],
        food: ['Lokalna kuchnia', 'Doznania kulinarne', 'Smak i aromat'],
        health: ['Wellness', 'Troska o siebie', 'Usługi zdrowotne'],
        shopping: ['Zakupy', 'Lokalne produkty', 'Terapia zakupowa'],
        practical: ['Podstawowe usługi', 'Wygoda', 'Praktyczne potrzeby'],
        default: ['Świetne doświadczenie', 'Warte odwiedzenia', 'Popularny wybór'],
      },
      categoryPerfectFor: {
        active: ['Entuzjaści sportu', 'Poszukiwacze przygód', 'Miłośnicy fitnessu'],
        beaches: ['Miłośnicy plaż', 'Entuzjaści natury', 'Fotografowie'],
        culture: ['Miłośnicy historii', 'Miłośnicy kultury', 'Wycieczki edukacyjne'],
        recreation: ['Rodziny', 'Grupy', 'Szukający rozrywki'],
        food: ['Smakoszach', 'Odkrywcy kulinarne', 'Wspólne jedzenie'],
        health: ['Poszukiwacze wellness', 'Miłośnicy spa', 'Świadomi zdrowia'],
        shopping: ['Kupujący', 'Łowcy pamiątek', 'Miłośnicy mody'],
        practical: ['Podróżnych', 'Mieszkańcy lokalni', 'Wszyscy potrzebujący usług'],
        default: ['Wszyscy odwiedzający', 'Podróżni', 'Lokalni odkrywcy'],
      },
      budgetLabels: {
        budget: 'Przystępny',
        midRange: 'Średni',
        upscale: 'Wyższa klasa',
        luxury: 'Luksusowy',
        priceLevel: 'Poziom cen',
      },
      openingStatus: {
        open: 'Teraz otwarte',
        closed: 'Zamknięte',
        closesAt: 'Zamyka się o',
        closedToday: 'Dzisiaj zamknięte',
        available: 'Dostępny',
      },
      amenities: {
        title: 'Udogodnienia',
        wheelchairAccessible: 'Dostępne dla wózków inwalidzkich',
        freeWifi: 'Darmowe WiFi',
        creditCards: 'Akceptuje karty kredytowe',
        noDetails: 'Brak dodatkowych szczegółów',
        featureNames: {
          'Wheelchair accessible entrance': 'Wejście dostępne dla wózków inwalidzkich',
          'Wheelchair accessible parking lot': 'Parking dostępny dla wózków inwalidzkich',
          'Wheelchair accessible restroom': 'Toaleta dostępna dla wózków inwalidzkich',
          'Wheelchair accessible seating': 'Miejsca siedzące dla wózków inwalidzkich',
          'Bar onsite': 'Bar na miejscu',
          'Restroom': 'Toaleta',
          'Wi-Fi': 'Wi-Fi',
          'Free Wi-Fi': 'Darmowe Wi-Fi',
          'Good for kids': 'Przyjazne dzieciom',
          'High chairs': 'Krzesełka dla dzieci',
          'Dogs allowed': 'Psy dozwolone',
          'Gender-neutral restroom': 'Toaleta neutralna płciowo',
          'Free parking lot': 'Bezpłatny parking',
          'Free street parking': 'Bezpłatne parkowanie uliczne',
          'Paid parking lot': 'Płatny parking',
          'Paid street parking': 'Płatne parkowanie uliczne',
          'Parking garage': 'Parking wielopoziomowy',
          'Valet parking': 'Parking z obsługą',
          'Dine-in': 'Na miejscu',
          'Takeout': 'Na wynos',
          'Delivery': 'Dostawa',
          'Outdoor seating': 'Ogródek',
          'Live music': 'Muzyka na żywo',
          'Reservations': 'Rezerwacje',
          'Private dining': 'Prywatna jadalnia',
          'Happy hour': 'Happy hour',
          'Brunch': 'Brunch',
          'Lunch': 'Lunch',
          'Dinner': 'Kolacja',
          'Breakfast': 'Śniadanie',
          'Dessert': 'Deser',
          'Coffee': 'Kawa',
          'Cocktails': 'Koktajle',
          'Beer': 'Piwo',
          'Wine': 'Wino',
          'Organic': 'Ekologiczne',
          'Vegetarian options': 'Opcje wegetariańskie',
          'Vegan options': 'Opcje wegańskie',
        },
      },
      gallery: {
        noPhotos: 'Brak dostępnych zdjęć',
        showAllPhotos: 'Pokaż wszystkie zdjęcia',
        allPhotos: 'Wszystkie',
      },
      loadingStates: {
        loadingDetails: 'Ładowanie szczegółów POI...',
        notFound: 'POI nie znaleziono',
        notFoundDescription: 'POI, którego szukasz, nie istnieje.',
      },
      comparison: {
        compare: 'Porównaj',
        comparing: 'Porównywanie',
        addToCompare: 'Dodaj do porównania',
        removeFromCompare: 'Usuń z porównania',
        compareTitle: 'Porównanie POI',
        selectedCount: '{count} POI wybrano',
        maxReached: 'Maksymalnie 3 POI można porównać',
        clearAll: 'Wyczyść wszystko',
        noItemsSelected: 'Nie wybrano POI',
        selectToCompare: 'Wybierz 2-3 POI do porównania',
        hint: 'Kliknij ikonę porównania przy POI, aby je dodać',
      },
    },
    categories: {
      // Calpe categories
      active: 'Aktywność',
      beaches: 'Plaże i Natura',
      culture: 'Kultura i Historia',
      recreation: 'Rekreacja',
      food: 'Jedzenie i Napoje',
      health: 'Zdrowie i Wellness',
      shopping: 'Zakupy',
      practical: 'Praktyczne',
      // Texel categories
      actief: 'Aktywność',
      cultuur: 'Kultura i Historia',
      eten: 'Jedzenie i Napoje',
      gezondheid: 'Zdrowie i Wellness',
      natuur: 'Przyroda',
      praktisch: 'Praktyczne',
      winkelen: 'Zakupy',
    },
    common: {
      save: 'Zapisz',
      close: 'Zamknij',
      apply: 'Zastosuj',
      reset: 'Resetuj',
      loading: 'Ładowanie...',
      back: 'Wstecz',
      optional: 'opcjonalne',
    },
    reviews: {
      title: 'Recenzje',
      travelParty: {
        all: 'Wszystkie',
        couples: 'Pary',
        families: 'Rodziny',
        solo: 'Podróżnicy solo',
        friends: 'Przyjaciele',
        business: 'Służbowe',
      },
      sort: {
        recent: 'Najnowsze',
        helpful: 'Najbardziej pomocne',
        highRating: 'Najwyżej oceniane',
        lowRating: 'Najniżej oceniane',
      },
      sentiment: {
        positive: 'Pozytywne',
        neutral: 'Neutralne',
        negative: 'Negatywne',
      },
      filterByTraveler: 'Filtruj według podróżnika',
      filterBySentiment: 'Filtruj według sentymentu',
      sortBy: 'Sortuj według',
      helpful: 'Pomocne',
      noReviews: 'Brak recenzji',
      writeReview: 'Napisz recenzję',
      readMore: 'Czytaj więcej',
      showLess: 'Pokaż mniej',
      visited: 'Odwiedzone',
      loadingReviews: 'Ładowanie recenzji...',
      loadMoreReviews: 'Załaduj więcej recenzji',
      reviewCount: '{count} recenzji',
      averageRating: 'Średnia ocena',
      review: 'recenzja',
      allReviews: 'Wszystkie Recenzje',
      beFirstToShare: 'Bądź pierwszym, który podzieli się doświadczeniem!',
      failedToLoad: 'Nie udało się załadować recenzji. Spróbuj ponownie.',
      tryAgain: 'Spróbuj ponownie',
      noMatchFilters: 'Brak recenzji pasujących do filtrów',
      adjustFilters: 'Dostosuj ustawienia filtrów, aby zobaczyć więcej recenzji.',
      today: 'Dzisiaj',
      yesterday: 'Wczoraj',
      daysAgo: '{n} dni temu',
      weeksAgo: '{n} tygodni temu',
      weekAgo: '1 tydzień temu',
      monthsAgo: '{n} miesięcy temu',
      monthAgo: '1 miesiąc temu',
      yearsAgo: '{n} lat temu',
      yearAgo: '1 rok temu',
      writeReviewModal: {
        title: 'Napisz Recenzję',
        close: 'Zamknij',
        yourRating: 'Twoja Ocena',
        travelPartyLabel: 'Towarzystwo Podróży',
        solo: 'Solo',
        couple: 'Para',
        family: 'Rodzina',
        friends: 'Przyjaciele',
        business: 'Służbowe',
        yourReview: 'Twoja Recenzja',
        placeholder: 'Podziel się swoim doświadczeniem w tym miejscu... (minimum 50 znaków)',
        characters: 'znaków',
        minimum: 'minimum 50',
        addPhoto: 'Dodaj Zdjęcie (Opcjonalnie)',
        uploadPhoto: 'Prześlij Zdjęcie',
        submitting: 'Wysyłanie...',
        submitReview: 'Wyślij Recenzję',
        success: 'Recenzja wysłana pomyślnie!',
        error: 'Nie udało się wysłać recenzji. Spróbuj ponownie.',
        selectRating: 'Wybierz ocenę',
        selectTravelParty: 'Wybierz towarzystwo podróży',
        minChars: 'Recenzja musi mieć co najmniej 50 znaków',
        uploadImageOnly: 'Prześlij plik graficzny',
        imageTooLarge: 'Obraz musi być mniejszy niż 5MB',
      },
    },
    account: {
      tabs: {
        profile: 'Profil',
        preferences: 'Preferencje',
        ai: 'AI',
        privacy: 'Prywatność',
        export: 'Eksport',
        settings: 'Ustawienia',
        favorites: 'Ulubione',
        visited: 'Odwiedzone',
        reviews: 'Recenzje',
      },
      profile: {
        memberSince: 'Członek od',
        butlerFanSince: 'Fan Butlera od',
        clickAvatarHint: 'Kliknij avatar, aby przesłać zdjęcie',
        changePhoto: 'Zmień Zdjęcie',
        quickActions: 'Szybkie Akcje',
        savedPOIs: 'Zapisane POI',
        favorites: 'Ulubione',
        visits: 'Wizyty',
        reviews: 'Recenzje',
        comingSoon: 'Wkrótce',
      },
      favorites: {
        title: 'Ulubione',
        infoText: 'Twoje zapisane POI i wydarzenia w jednym miejscu.',
        poiTitle: 'Ulubione POI',
        eventsTitle: 'Ulubione Wydarzenia',
        emptyPois: 'Nie masz jeszcze żadnych ulubionych POI.',
        emptyEvents: 'Nie masz jeszcze żadnych ulubionych wydarzeń.',
        discoverPois: 'Odkryj POI →',
        viewAgenda: 'Zobacz Agendę →',
        viewAll: 'Zobacz wszystkie',
      },
      visited: {
        title: 'Odwiedzone Miejsca',
        infoText: 'Automatycznie śledzone podczas przeglądania POI i wydarzeń.',
        poisTitle: 'Odwiedzone POI',
        eventsTitle: 'Odwiedzone Wydarzenia',
        emptyPois: 'Śledzenie odwiedzonych POI zostanie wkrótce aktywowane.',
        emptyEvents: 'Śledzenie odwiedzonych wydarzeń zostanie wkrótce aktywowane.',
        trackingInfo: 'Historia odwiedzin będzie automatycznie śledzona podczas przeglądania POI.',
      },
      reviews: {
        title: 'Moje Recenzje',
        infoText: 'Przeglądaj i edytuj swoje napisane recenzje.',
        empty: 'Nie napisałeś jeszcze żadnych recenzji.',
        emptyHint: 'Podziel się swoimi doświadczeniami i pomóż innym podróżnikom!',
        discoverToReview: 'Odkryj POI do zrecenzowania →',
      },
      preferences: {
        title: 'Preferencje podróżne',
        travelingAs: 'Podróżuję jako',
        interests: 'Zainteresowania',
        dietary: 'Dieta',
        editButton: 'Edytuj Preferencje',
        asCouple: 'Jako para',
        foodDrinks: 'Jedzenie i Napoje',
        beaches: 'Plaże',
        culture: 'Kultura',
        vegetarian: 'Wegetariański',
      },
      ai: {
        title: 'Personalizacja AI',
        subtitle: 'Funkcje AI',
        infoText: 'Używamy lokalnych danych, ale także AI, aby personalizować i optymalizować Twoje rekomendacje. Masz 100% kontroli nad tym, jak AI jest używana',
        features: 'Funkcje AI',
        personalizedRecs: 'Spersonalizowane Rekomendacje',
        personalizedRecsDesc: 'Użyj AI do sugerowania POI',
        smartFilters: 'Inteligentne Filtry',
        smartFiltersDesc: 'Filtry wyszukiwania napędzane AI',
        behavioralLearning: 'Uczenie Behawioralne',
        behavioralLearningDesc: 'Ucz się z Twoich interakcji',
        howItWorks: 'Jak działa personalizacja AI?',
      },
      privacy: {
        title: 'Prywatność i Dane',
        subtitle: 'Ustawienia prywatności',
        dataCollection: 'Gromadzenie Danych',
        essentialCookies: 'Niezbędne Pliki Cookie',
        essentialCookiesDesc: 'Wymagane do podstawowej funkcjonalności',
        required: 'Wymagane',
        analytics: 'Analityka',
        analyticsDesc: 'Pomóż nam ulepszyć naszą usługę',
        personalization: 'Personalizacja',
        personalizationDesc: 'Dostosuj swoje doświadczenie',
        marketing: 'Marketing',
        marketingDesc: 'Otrzymuj spersonalizowane oferty',
        updateButton: 'Zaktualizuj Preferencje',
      },
      export: {
        title: 'Eksport Danych',
        infoText: 'Pobierz wszystkie swoje dane osobowe',
        whatIncluded: 'Co jest zawarte?',
        includeList: {
          profile: 'Informacje profilowe',
          preferences: 'Preferencje podróżne',
          savedPOIs: 'Zapisane POI i ulubione',
          reviews: 'Recenzje i oceny',
          visitHistory: 'Historia wizyt',
          activityLog: 'Dziennik aktywności konta',
          consentSettings: 'Ustawienia zgody i prywatności',
        },
        format: 'Format eksportu',
        formatJSON: 'JSON (czytelny dla maszyn)',
        formatPDF: 'PDF (czytelny dla ludzi)',
        formatBoth: 'Oba formaty',
        requestButton: 'Poproś o Eksport Danych',
        validityNote: 'Eksporty są dostępne przez 7 dni po wygenerowaniu.',
      },
      settings: {
        security: 'Bezpieczeństwo',
        changePassword: 'Zmień Hasło',
        twoFactor: 'Uwierzytelnianie dwuskładnikowe',
        twoFactorStatus: 'Nie włączone',
        notifications: 'Powiadomienia',
        emailNotifications: 'Powiadomienia e-mail',
        pushNotifications: 'Powiadomienia push',
        dangerZone: 'Strefa niebezpieczna',
        deleteData: 'Usuń Moje Dane Osobowe',
        deleteDataDesc: 'Konto pozostanie z domyślnymi ustawieniami',
        deleteAccount: 'Usuń Moje Konto',
        deleteAccountDesc: 'Tej czynności nie można cofnąć',
      },
      modals: {
        changePasswordTitle: 'Zmień Hasło',
        currentPassword: 'Aktualne hasło',
        newPassword: 'Nowe hasło',
        confirmPassword: 'Potwierdź hasło',
        passwordWeak: 'Słabe',
        passwordMedium: 'Średnie',
        passwordStrong: 'Silne',
        passwordRequirements: 'Minimum 8 znaków, użyj wielkich liter, cyfr i symboli',
        passwordMismatch: 'Hasła nie są zgodne',
        passwordMatch: 'Hasła są zgodne',
        passwordError: 'Błąd podczas zmiany hasła',
        changePassword: 'Zmień Hasło',
        twoFactorTitle: 'Uwierzytelnianie dwuskładnikowe',
        twoFactorIntroTitle: 'Zabezpiecz swoje konto',
        twoFactorIntroText: 'Dodaj dodatkową warstwę bezpieczeństwa do swojego konta.',
        twoFactorBenefit1: 'Ochrona przed nieautoryzowanym dostępem',
        twoFactorBenefit2: 'Dodatkowa weryfikacja podczas logowania',
        twoFactorBenefit3: 'Kody zapasowe na wypadek awarii',
        twoFactorScanInstructions: 'Zeskanuj kod QR za pomocą aplikacji uwierzytelniającej',
        hideSecret: 'Ukryj tajny klucz',
        showSecret: 'Pokaż tajny klucz',
        recommendedApps: 'Polecane aplikacje',
        twoFactorVerifyInstructions: 'Wprowadź 6-cyfrowy kod z aplikacji',
        enterCodeFromApp: 'Kod odświeża się co 30 sekund',
        twoFactorEnabled: '2FA zostało włączone!',
        backupCodesTitle: 'Kody zapasowe',
        backupCodesWarning: 'Przechowuj te kody w bezpiecznym miejscu.',
        copied: 'Skopiowano',
        copyAll: 'Kopiuj wszystkie kody',
        twoFactorActive: '2FA jest aktywne',
        twoFactorActiveDesc: 'Twoje konto jest chronione przez 2FA',
        disableWarning: 'Wyłączenie 2FA zmniejsza bezpieczeństwo konta',
        twoFactorError: 'Nieprawidłowy kod weryfikacyjny',
        twoFactorDisableError: 'Błąd podczas wyłączania 2FA',
        startSetup: 'Rozpocznij Konfigurację',
        verify: 'Zweryfikuj',
        verifying: 'Weryfikowanie...',
        done: 'Gotowe',
        keepEnabled: 'Pozostaw Włączone',
        disable2FA: 'Wyłącz 2FA',
        disabling: 'Wyłączanie...',
        deleteDataTitle: 'Usuń Dane Osobowe',
        deleteDataWarningTitle: 'Uwaga!',
        deleteDataWarningText: 'Zamierzasz usunąć wszystkie swoje dane osobowe.',
        dataToBeDeleted: 'Zostanie usunięte',
        deleteDataItem1: 'Imię i zdjęcie profilowe',
        deleteDataItem2: 'Preferencje i zainteresowania',
        deleteDataItem3: 'Ulubione i zapisane POI',
        deleteDataItem4: 'Historia odwiedzin',
        deleteDataItem5: 'Recenzje i oceny',
        dataKept: 'Zostanie zachowane',
        keepDataItem1: 'Adres e-mail (do logowania)',
        keepDataItem2: 'Konto i hasło',
        deleteDataInfo: 'Po usunięciu możesz zacząć od nowa.',
        confirmDeleteData: 'Potwierdź usunięcie',
        typeToConfirm: 'Wpisz DELETE DATA aby potwierdzić',
        deleteDataError: 'Błąd podczas usuwania danych',
        deleting: 'Usuwanie...',
        deleteData: 'Usuń Dane',
        deleteAccountTitle: 'Usuń Konto',
        deleteAccountWarningTitle: 'Tego nie można cofnąć!',
        deleteAccountWarningText: 'Zamierzasz trwale usunąć swoje konto CalpeTrip.',
        gracePeriodTitle: '30 dni na przemyślenie',
        gracePeriodText: 'Masz 30 dni na anulowanie usunięcia, logując się ponownie.',
        scheduledDeletion: 'Zaplanowane usunięcie',
        permanentlyDeleted: 'Trwale usunięte',
        deleteAccountItem1: 'Twój pełny profil i dane osobowe',
        deleteAccountItem2: 'Wszystkie preferencje i ustawienia',
        deleteAccountItem3: 'Twoje ulubione i zapisane elementy',
        deleteAccountItem4: 'Twoje recenzje i oceny',
        deleteAccountItem5: 'Dostęp do CalpeTrip',
        canCancelDeletion: 'Możesz anulować usunięcie, logując się w ciągu 30 dni.',
        whyLeaving: 'Dlaczego nas opuszczasz?',
        helpUsImprove: 'Opcjonalnie: Pomóż nam się ulepszyć',
        reasonNotUseful: 'Platforma niewystarczająco przydatna',
        reasonPrivacy: 'Obawy o prywatność',
        reasonEmails: 'Za dużo e-maili',
        reasonAlternative: 'Znalazłem alternatywę',
        reasonTemporary: 'Tymczasowe konto',
        reasonOther: 'Inne',
        tellUsMore: 'Powiedz nam więcej...',
        confirmDeleteAccount: 'Potwierdź usunięcie konta',
        typeDeleteToConfirm: 'Wpisz DELETE aby potwierdzić',
        accountToDelete: 'Konto do usunięcia',
        deleteAccountError: 'Błąd podczas usuwania konta',
        keepAccount: 'Zachowaj Konto',
        deleteMyAccount: 'Usuń Konto',
        processing: 'Przetwarzanie...',
        deletionScheduled: 'Usunięcie zaplanowane',
        deletionScheduledText: 'Twoje konto jest zaplanowane do usunięcia. Masz 30 dni na anulowanie.',
        cancelBeforeDate: 'Zaloguj się przed tą datą, aby anulować',
        confirmationEmailSent: 'E-mail potwierdzający wysłany do',
        understood: 'Rozumiem',
        cancel: 'Anuluj',
        back: 'Wstecz',
        next: 'Dalej',
        continue: 'Kontynuuj',
        saving: 'Zapisywanie...',
      },
    },
    auth: {
      login: {
        title: 'CalpeTrip',
        subtitle: 'Witaj ponownie! Zaloguj się na swoje konto',
        emailLabel: 'Adres e-mail',
        emailPlaceholder: 'twoj.email@example.pl',
        passwordLabel: 'Hasło',
        passwordPlaceholder: 'Wprowadź swoje hasło',
        forgotPassword: 'Zapomniałeś hasła?',
        signInButton: 'Zaloguj się',
        signingIn: 'Logowanie...',
        noAccount: 'Nie masz konta?',
        signUp: 'Zarejestruj się',
        backToHome: 'Powrót do strony głównej',
        errorFillFields: 'Proszę wypełnić wszystkie pola',
        errorInvalidCredentials: 'Nieprawidłowy e-mail lub hasło. Spróbuj ponownie.',
        errorGeneric: 'Logowanie nie powiodło się. Spróbuj później.',
      },
      signup: {
        title: 'CalpeTrip',
        subtitle: 'Utwórz swoje konto',
        nameLabel: 'Pełne imię',
        namePlaceholder: 'Twoje pełne imię',
        emailLabel: 'Adres e-mail',
        emailPlaceholder: 'twoj.email@example.pl',
        passwordLabel: 'Hasło',
        passwordPlaceholder: 'Wybierz bezpieczne hasło',
        confirmPasswordLabel: 'Potwierdź hasło',
        confirmPasswordPlaceholder: 'Wprowadź ponownie swoje hasło',
        termsText: 'Akceptuję',
        termsLink: 'Warunki Użytkowania',
        and: 'i',
        privacyLink: 'Politykę Prywatności',
        signUpButton: 'Utwórz Konto',
        signingUp: 'Tworzenie konta...',
        haveAccount: 'Masz już konto?',
        signIn: 'Zaloguj się',
        backToHome: 'Powrót do strony głównej',
        errorFillFields: 'Proszę wypełnić wszystkie pola',
        errorPasswordMismatch: 'Hasła nie pasują',
        errorPasswordTooShort: 'Hasło musi mieć co najmniej 8 znaków',
        errorEmailExists: 'Konto z tym e-mailem już istnieje. Proszę się zalogować.',
        errorGeneric: 'Rejestracja nie powiodła się. Spróbuj później.',
        passwordRequirements: {
          title: 'Hasło musi zawierać:',
          minLength: 'Co najmniej 8 znaków',
          uppercase: 'Co najmniej 1 wielką literę',
          lowercase: 'Co najmniej 1 małą literę',
          number: 'Co najmniej 1 cyfrę',
          special: 'Co najmniej 1 znak specjalny (!@#$%^&*)',
        },
        verificationSent: {
          title: 'Sprawdź swoją skrzynkę',
          sentTo: 'Wysłaliśmy e-mail weryfikacyjny na adres:',
          instruction: 'Kliknij link w e-mailu, aby aktywować swoje konto. Sprawdź również folder spam, jeśli nie widzisz wiadomości.',
          goToLogin: 'Przejdź do logowania',
          noEmail: 'Nie otrzymałeś e-maila?',
        },
      },
      verifyEmail: {
        verifying: 'Weryfikacja e-maila...',
        verifyingText: 'Proszę czekać, sprawdzamy Twój link weryfikacyjny.',
        success: 'E-mail zweryfikowany!',
        successMessage: 'Twój adres e-mail został pomyślnie zweryfikowany. Możesz się teraz zalogować.',
        alreadyVerified: 'Już zweryfikowany',
        alreadyVerifiedMessage: 'Ten adres e-mail został już zweryfikowany. Możesz się zalogować.',
        failed: 'Weryfikacja nie powiodła się',
        failedMessage: 'Wystąpił błąd podczas weryfikacji. Spróbuj ponownie lub poproś o nowy e-mail weryfikacyjny.',
        goToLogin: 'Przejdź do logowania',
        requestNew: 'Poproś o nowy e-mail weryfikacyjny',
        backToLogin: 'Powrót do logowania',
      },
      resendVerification: {
        title: 'Wyślij ponownie e-mail weryfikacyjny',
        subtitle: 'Wprowadź swój adres e-mail, aby otrzymać nowy e-mail weryfikacyjny.',
        emailLabel: 'Adres e-mail',
        emailPlaceholder: 'nazwa@przykład.pl',
        sendButton: 'Wyślij e-mail weryfikacyjny',
        sending: 'Wysyłanie...',
        success: 'E-mail weryfikacyjny wysłany',
        successMessage: 'Jeśli ten adres e-mail jest u nas zarejestrowany, otrzymasz e-mail weryfikacyjny w ciągu kilku minut. Sprawdź również folder spam.',
        backToLogin: 'Powrót do logowania',
        errorEmpty: 'Proszę wprowadzić adres e-mail',
        errorTooMany: 'Wysłałeś zbyt wiele próśb o e-mail weryfikacyjny. Spróbuj ponownie za godzinę.',
        errorGeneric: 'Wystąpił błąd',
      },
    },
    footer: {
      about: 'O Nas',
      privacy: 'Prywatność',
      terms: 'Regulamin',
      contact: 'Kontakt',
      copyright: '© 2025 CalpeTrip. Powered by AI. Stworzone z miłością dla podróżników.',
      platformTitle: 'Platforma',
      supportTitle: 'Wsparcie',
      legalTitle: 'Informacje Prawne',
      howItWorks: 'Jak To Działa',
      pois: 'Odkrywaj',
      faq: 'FAQ',
      help: 'Pomoc',
      cookies: 'Cookies',
      tagline: 'Twój Osobisty Butler na Costa Blanca',
      allRights: 'Wszelkie prawa zastrzeżone.',
      madeWith: 'Stworzone z ❤️ na Costa Blanca',
      partners: 'Partnerzy',
    },
    onboarding: {
      // Navigation
      back: 'Wstecz',
      skip: 'Pomiń',
      continue: 'Kontynuuj →',
      // Progress
      stepOf: 'Krok',
      of: 'z',
      // Step 1: Travel Companion
      step1Title: 'Z kim podróżujesz?',
      couple: 'Para',
      coupleDesc: 'Romantyczna podróż',
      family: 'Rodzina',
      familyDesc: 'Świetne dla rodzinnej zabawy',
      soloDesc: 'Odkrywaj w swoim tempie',
      group: 'Grupa',
      groupDesc: 'Idealne dla przyjaciół i współpracowników',
      // Step 2: Interests
      step2Title: 'Czego szukasz w Calpe?',
      selectAll: '(Wybierz wszystkie, które pasują)',
      selected: 'Wybrano',
      option: 'opcja',
      options: 'opcje',
      relax: 'Relaks',
      relaxDesc: 'Odpoczynek i regeneracja',
      active: 'Aktywność',
      activeDesc: 'Przygoda i sport',
      culture: 'Kultura',
      cultureDesc: 'Lokalna sztuka i kreatywne doświadczenia',
      food: 'Jedzenie',
      foodDesc: 'Kulinarne przygody',
      nature: 'Natura',
      natureDesc: 'Eksploracja na świeżym powietrzu',
      nightlife: 'Życie nocne',
      nightlifeDesc: 'Wieczorna rozrywka',
      history: 'Historia',
      historyDesc: 'Odkryj przeszłość',
      shopping: 'Zakupy',
      shoppingDesc: 'Terapia zakupowa',
      // Step 3: Trip Context
      step3Title: 'Opowiedz nam o swojej podróży',
      stayType: 'Typ pobytu',
      pleasure: 'Przyjemność',
      business: 'Biznes',
      visitStatus: 'Status wizyty',
      firstTime: 'Pierwszy raz',
      returning: 'Powracający gość',
      localResident: 'Lokalny mieszkaniec',
      whenVisiting: 'Kiedy nas odwiedzasz?',
      tripDuration: 'Długość podróży',
      duration1: '1-3 dni (weekend)',
      duration2: '4-7 dni (tydzień)',
      duration3: '1-2 tygodnie',
      duration4: '2+ tygodnie',
      durationFlex: 'Elastyczny/Nie jestem pewien',
      // Step 4: Optional
      optional: 'Opcjonalne',
      selectMultiple: '(Wybierz wiele)',
      dietaryTitle: 'Wymagania dietetyczne?',
      vegetarian: 'Wegetariańskie',
      vegan: 'Wegańskie',
      glutenFree: 'Bezglutenowe',
      halal: 'Halal',
      kosher: 'Koszerne',
      lactoseFree: 'Bez laktozy',
      nutAllergies: 'Alergie na orzechy',
      accessibilityTitle: 'Potrzeby dostępności?',
      wheelchair: 'Dostępne dla wózków',
      mobility: 'Pomoc w poruszaniu się',
      visual: 'Wada wzroku',
      hearing: 'Wada słuchu',
      // Buttons
      finishExplore: 'Zakończ i Odkrywaj →',
      savePreferences: 'Zapisz Preferencje →',
      // Edit mode
      editMode: 'Edytujesz swoje preferencje - Twoje aktualne wybory są pokazane poniżej',
      cancelEdit: 'Anulować edycję i wrócić do konta?',
      skipConfirm: 'Pominąć onboarding? Możesz ustawić preferencje później w swoim koncie.',
    },
    holibotChat: {
      welcome: 'Cześć! Jestem CalpeChat 🌴',
      welcomeSubtitle: 'Twój osobisty przewodnik po Calpe. Jak mogę Ci pomóc?',
      inputPlaceholder: 'Zadaj pytanie o Calpe...',
      quickActions: {
        itinerary: 'Stwórz mój plan',
        locationInfo: 'Szukaj według kategorii',
        directions: 'Wskazówki dojazdu',
        dailyTip: 'Moja porada dnia',
      },
      prompts: {
        itinerary: 'Stwórz dla mnie program dnia na podstawie moich preferencji',
        locationInfo: 'Szukam informacji o konkretnym miejscu',
        directions: 'Pomóż mi znaleźć drogę do celu',
      },
      responses: {
        loading: 'Myślę...',
        error: 'Przepraszam, coś poszło nie tak. Spróbuj ponownie.',
        noResults: 'Nie znaleziono wyników. Spróbuj innego wyszukiwania.',
        itineraryIntro: 'Oto Twój spersonalizowany program dnia:',
        locationSearch: 'O którym miejscu chciałbyś dowiedzieć się więcej?',
        directionsHelp: 'Do jakiego celu chcesz nawigować?',
        yourItinerary: 'Twój Plan',
        eventsAdded: 'wydarzenie(a) dodane',
      },
    },
  },
  };
