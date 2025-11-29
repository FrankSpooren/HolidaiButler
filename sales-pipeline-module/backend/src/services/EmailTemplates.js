/**
 * Email Templates - Multi-language Support
 * Professional email templates in English and Dutch
 */

const translations = {
  en: {
    // Common
    companyName: 'Sales Pipeline',
    footer: {
      copyright: `© ${new Date().getFullYear()} HolidaiButler. All rights reserved.`,
      managePreferences: 'Manage email preferences'
    },

    // Welcome email
    welcome: {
      subject: 'Welcome to Sales Pipeline!',
      title: 'Welcome to Sales Pipeline!',
      greeting: 'Hi {firstName},',
      message: "Your account has been created successfully. You're now ready to start managing your sales pipeline like a pro.",
      accountLabel: 'Your Account',
      features: "Here's what you can do:",
      featureList: [
        'Track deals through your sales pipeline',
        'Manage contacts and accounts',
        'Score and convert leads',
        'Get real-time insights and reports'
      ],
      buttonText: 'Get Started',
      helpText: 'Need help? Contact our support team at support@holidaibutler.com'
    },

    // Password reset
    passwordReset: {
      subject: 'Reset Your Password',
      title: 'Reset Your Password',
      greeting: 'Hi {firstName},',
      message: 'We received a request to reset your password. Click the button below to create a new password:',
      buttonText: 'Reset Password',
      expiresIn: 'This link expires in {expiresIn}',
      ignoreMessage: "If you didn't request this reset, you can safely ignore this email. Your password will remain unchanged.",
      securityNote: 'For security, this request was received from your account.'
    },

    // Task reminder
    taskReminder: {
      subject: 'Task Reminder: {taskTitle}',
      title: 'Task Reminder',
      greeting: 'Hi {firstName},',
      message: 'You have a task that requires your attention:',
      dueDate: 'Due Date',
      priority: 'Priority',
      relatedTo: 'Related To',
      buttonText: 'View Task'
    },

    // Deal stage change
    dealStageChange: {
      subject: 'Deal Update: {dealTitle}',
      title: 'Deal Stage Updated',
      greeting: 'Hi {firstName},',
      message: 'A deal in your pipeline has moved to a new stage:',
      stageChange: 'Stage Change',
      probability: 'Probability',
      buttonText: 'View Deal'
    },

    // Lead assigned
    leadAssigned: {
      subject: 'New Lead Assigned: {leadName}',
      title: 'New Lead Assigned',
      greeting: 'Hi {firstName},',
      message: 'A new lead has been assigned to you:',
      noCompany: 'No company',
      leadScore: 'Lead Score',
      source: 'Source',
      assignedBy: 'Assigned By',
      buttonText: 'View Lead',
      tip: 'Tip: Follow up within 5 minutes for the best conversion rates!'
    },

    // Meeting reminder
    meetingReminder: {
      subject: 'Meeting Reminder: {meetingTitle}',
      title: 'Meeting Reminder',
      greeting: 'Hi {firstName},',
      message: 'You have an upcoming meeting:',
      time: 'Time',
      location: 'Location',
      attendees: 'Attendees',
      buttonText: 'Join Meeting'
    },

    // Weekly summary
    weeklySummary: {
      subject: 'Your Weekly Summary',
      title: 'Your Weekly Summary',
      greeting: 'Hi {firstName},',
      message: "Here's your performance summary for {period}:",
      revenue: 'Revenue',
      dealsWon: 'Deals Won',
      closed: 'closed',
      vsLastWeek: 'vs last week',
      newLeads: 'New Leads',
      meetingsHeld: 'Meetings Held',
      callsMade: 'Calls Made',
      emailsSent: 'Emails Sent',
      buttonText: 'View Full Dashboard'
    },

    // Deal won
    dealWon: {
      subject: 'Deal Won: {dealTitle}',
      title: 'Deal Won!',
      congratulations: 'Congratulations {firstName}!',
      closedBy: 'Closed by {name}',
      teamContributors: 'Team contributors: {members}',
      motivation: 'Keep up the great work!'
    },

    // Follow-up reminder
    followUpReminder: {
      subject: 'Follow-up Reminder: {contactName}',
      title: 'Follow-up Reminder',
      greeting: 'Hi {firstName},',
      message: "It's time to reconnect with a contact:",
      lastActivity: 'Last Activity',
      daysSinceContact: 'Days Since Contact',
      days: 'days',
      suggestedAction: 'Suggested Action:',
      buttonText: 'View Contact'
    }
  },

  nl: {
    // Common
    companyName: 'Verkooppijplijn',
    footer: {
      copyright: `© ${new Date().getFullYear()} HolidaiButler. Alle rechten voorbehouden.`,
      managePreferences: 'E-mailvoorkeuren beheren'
    },

    // Welcome email
    welcome: {
      subject: 'Welkom bij Verkooppijplijn!',
      title: 'Welkom bij Verkooppijplijn!',
      greeting: 'Hallo {firstName},',
      message: 'Uw account is succesvol aangemaakt. U bent nu klaar om uw verkooppijplijn als een professional te beheren.',
      accountLabel: 'Uw Account',
      features: 'Dit kunt u doen:',
      featureList: [
        'Deals volgen door uw verkooppijplijn',
        'Contacten en accounts beheren',
        'Leads scoren en converteren',
        'Realtime inzichten en rapporten krijgen'
      ],
      buttonText: 'Aan de slag',
      helpText: 'Hulp nodig? Neem contact op met ons supportteam via support@holidaibutler.com'
    },

    // Password reset
    passwordReset: {
      subject: 'Wachtwoord herstellen',
      title: 'Herstel uw wachtwoord',
      greeting: 'Hallo {firstName},',
      message: 'We hebben een verzoek ontvangen om uw wachtwoord te herstellen. Klik op de onderstaande knop om een nieuw wachtwoord aan te maken:',
      buttonText: 'Wachtwoord herstellen',
      expiresIn: 'Deze link verloopt over {expiresIn}',
      ignoreMessage: 'Als u dit herstel niet heeft aangevraagd, kunt u deze e-mail veilig negeren. Uw wachtwoord blijft ongewijzigd.',
      securityNote: 'Om veiligheidsredenen is dit verzoek ontvangen vanaf uw account.'
    },

    // Task reminder
    taskReminder: {
      subject: 'Taakherinnering: {taskTitle}',
      title: 'Taakherinnering',
      greeting: 'Hallo {firstName},',
      message: 'U heeft een taak die uw aandacht vereist:',
      dueDate: 'Vervaldatum',
      priority: 'Prioriteit',
      relatedTo: 'Gerelateerd aan',
      buttonText: 'Taak bekijken'
    },

    // Deal stage change
    dealStageChange: {
      subject: 'Deal update: {dealTitle}',
      title: 'Dealfase bijgewerkt',
      greeting: 'Hallo {firstName},',
      message: 'Een deal in uw pijplijn is naar een nieuwe fase verplaatst:',
      stageChange: 'Fasewijziging',
      probability: 'Waarschijnlijkheid',
      buttonText: 'Deal bekijken'
    },

    // Lead assigned
    leadAssigned: {
      subject: 'Nieuwe lead toegewezen: {leadName}',
      title: 'Nieuwe lead toegewezen',
      greeting: 'Hallo {firstName},',
      message: 'Er is een nieuwe lead aan u toegewezen:',
      noCompany: 'Geen bedrijf',
      leadScore: 'Leadscore',
      source: 'Bron',
      assignedBy: 'Toegewezen door',
      buttonText: 'Lead bekijken',
      tip: 'Tip: Neem binnen 5 minuten contact op voor de beste conversiepercentages!'
    },

    // Meeting reminder
    meetingReminder: {
      subject: 'Vergaderherinnering: {meetingTitle}',
      title: 'Vergaderherinnering',
      greeting: 'Hallo {firstName},',
      message: 'U heeft een aankomende vergadering:',
      time: 'Tijd',
      location: 'Locatie',
      attendees: 'Deelnemers',
      buttonText: 'Deelnemen aan vergadering'
    },

    // Weekly summary
    weeklySummary: {
      subject: 'Uw wekelijkse samenvatting',
      title: 'Uw wekelijkse samenvatting',
      greeting: 'Hallo {firstName},',
      message: 'Hier is uw prestatieoverzicht voor {period}:',
      revenue: 'Omzet',
      dealsWon: 'Gewonnen deals',
      closed: 'gesloten',
      vsLastWeek: 't.o.v. vorige week',
      newLeads: 'Nieuwe leads',
      meetingsHeld: 'Gehouden vergaderingen',
      callsMade: 'Gevoerde gesprekken',
      emailsSent: 'Verzonden e-mails',
      buttonText: 'Volledig dashboard bekijken'
    },

    // Deal won
    dealWon: {
      subject: 'Deal gewonnen: {dealTitle}',
      title: 'Deal gewonnen!',
      congratulations: 'Gefeliciteerd {firstName}!',
      closedBy: 'Gesloten door {name}',
      teamContributors: 'Teamleden: {members}',
      motivation: 'Ga zo door!'
    },

    // Follow-up reminder
    followUpReminder: {
      subject: 'Opvolgherinnering: {contactName}',
      title: 'Opvolgherinnering',
      greeting: 'Hallo {firstName},',
      message: 'Het is tijd om contact op te nemen met een relatie:',
      lastActivity: 'Laatste activiteit',
      daysSinceContact: 'Dagen sinds contact',
      days: 'dagen',
      suggestedAction: 'Aanbevolen actie:',
      buttonText: 'Contact bekijken'
    }
  }
};

// Priority translations
const priorityTranslations = {
  en: { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', urgent: 'URGENT' },
  nl: { low: 'LAAG', medium: 'GEMIDDELD', high: 'HOOG', urgent: 'URGENT' }
};

// Time translations
const timeTranslations = {
  en: { hour: '1 hour', hours: '{n} hours' },
  nl: { hour: '1 uur', hours: '{n} uur' }
};

/**
 * Get translations for a specific language
 */
export function getTranslations(lang = 'en') {
  return translations[lang] || translations.en;
}

/**
 * Get priority translation
 */
export function getPriorityTranslation(priority, lang = 'en') {
  const trans = priorityTranslations[lang] || priorityTranslations.en;
  return trans[priority] || priority;
}

/**
 * Get time translation
 */
export function getTimeTranslation(hours, lang = 'en') {
  const trans = timeTranslations[lang] || timeTranslations.en;
  if (hours === 1) return trans.hour;
  return trans.hours.replace('{n}', hours);
}

/**
 * Replace placeholders in string
 */
export function replacePlaceholders(str, data) {
  if (!str) return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

export default translations;
