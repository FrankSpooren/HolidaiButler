/**
 * Generate POI Q&A Script
 * Creates Q&A pairs for POIs based on their category and available information
 *
 * Run: node scripts/generate-poi-qa.js
 *
 * This populates the poi_qa table with common questions about POIs
 * to enhance HoliBot's knowledge base.
 */

import { mysqlSequelize } from '../src/config/database.js';
import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Q&A templates per category (multi-language)
const QA_TEMPLATES = {
  'Food & Drinks': {
    nl: [
      { category: 'opening_hours', question: 'Wat zijn de openingstijden van {name}?', answerTemplate: '{name} is {openingHours}. Bel voor de zekerheid: {phone}' },
      { category: 'pricing', question: 'Wat is het prijsniveau van {name}?', answerTemplate: '{name} heeft een {priceLevel} prijsniveau. Perfect voor {occasion}.' },
      { category: 'reservations', question: 'Moet ik reserveren bij {name}?', answerTemplate: 'Bij {name} is reserveren aanbevolen, vooral in het weekend. Bel {phone} of boek online.' },
      { category: 'location', question: 'Waar ligt {name}?', answerTemplate: '{name} ligt op {address}. {locationTip}' },
      { category: 'specialties', question: 'Wat zijn de specialiteiten van {name}?', answerTemplate: '{name} staat bekend om {specialty}. Een aanrader!' }
    ],
    en: [
      { category: 'opening_hours', question: 'What are the opening hours of {name}?', answerTemplate: '{name} is {openingHours}. Call to confirm: {phone}' },
      { category: 'pricing', question: 'What is the price range at {name}?', answerTemplate: '{name} has a {priceLevel} price range. Perfect for {occasion}.' },
      { category: 'reservations', question: 'Do I need a reservation at {name}?', answerTemplate: 'Reservations at {name} are recommended, especially on weekends. Call {phone} or book online.' },
      { category: 'location', question: 'Where is {name} located?', answerTemplate: '{name} is located at {address}. {locationTip}' },
      { category: 'specialties', question: 'What are the specialties at {name}?', answerTemplate: '{name} is known for {specialty}. Highly recommended!' }
    ],
    de: [
      { category: 'opening_hours', question: 'Was sind die Oeffnungszeiten von {name}?', answerTemplate: '{name} ist {openingHours}. Rufen Sie zur Bestaetigung an: {phone}' },
      { category: 'pricing', question: 'Was ist das Preisniveau bei {name}?', answerTemplate: '{name} hat ein {priceLevel} Preisniveau. Perfekt fuer {occasion}.' },
      { category: 'reservations', question: 'Muss ich bei {name} reservieren?', answerTemplate: 'Reservierungen bei {name} werden empfohlen, besonders am Wochenende. Rufen Sie {phone} an.' },
      { category: 'location', question: 'Wo liegt {name}?', answerTemplate: '{name} befindet sich in {address}. {locationTip}' }
    ],
    es: [
      { category: 'opening_hours', question: 'Cual es el horario de {name}?', answerTemplate: '{name} esta {openingHours}. Llame para confirmar: {phone}' },
      { category: 'pricing', question: 'Cual es el rango de precios en {name}?', answerTemplate: '{name} tiene un rango de precios {priceLevel}. Perfecto para {occasion}.' },
      { category: 'reservations', question: 'Necesito reservar en {name}?', answerTemplate: 'Se recomiendan reservas en {name}, especialmente los fines de semana. Llame al {phone}.' },
      { category: 'location', question: 'Donde esta {name}?', answerTemplate: '{name} esta ubicado en {address}. {locationTip}' }
    ]
  },
  'Beaches & Nature': {
    nl: [
      { category: 'facilities', question: 'Welke faciliteiten zijn er bij {name}?', answerTemplate: '{name} biedt {facilities}. Een perfecte plek voor een dagje strand!' },
      { category: 'parking', question: 'Is er parkeergelegenheid bij {name}?', answerTemplate: 'Bij {name} kun je parkeren {parkingInfo}. Kom vroeg in het hoogseizoen.' },
      { category: 'accessibility', question: 'Is {name} toegankelijk voor rolstoelen?', answerTemplate: '{name} is {accessibilityInfo}.' },
      { category: 'best_time', question: 'Wat is de beste tijd om {name} te bezoeken?', answerTemplate: 'De beste tijd voor {name} is {bestTime}.' },
      { category: 'activities', question: 'Wat kan ik doen bij {name}?', answerTemplate: 'Bij {name} kun je {activities}.' }
    ],
    en: [
      { category: 'facilities', question: 'What facilities are available at {name}?', answerTemplate: '{name} offers {facilities}. A perfect spot for a beach day!' },
      { category: 'parking', question: 'Is there parking at {name}?', answerTemplate: 'At {name} you can park {parkingInfo}. Arrive early in peak season.' },
      { category: 'accessibility', question: 'Is {name} wheelchair accessible?', answerTemplate: '{name} is {accessibilityInfo}.' },
      { category: 'best_time', question: 'What is the best time to visit {name}?', answerTemplate: 'The best time to visit {name} is {bestTime}.' },
      { category: 'activities', question: 'What can I do at {name}?', answerTemplate: 'At {name} you can {activities}.' }
    ]
  },
  'Culture & History': {
    nl: [
      { category: 'opening_hours', question: 'Wanneer is {name} open?', answerTemplate: '{name} is open {openingHours}.' },
      { category: 'pricing', question: 'Wat kost de entree voor {name}?', answerTemplate: 'De entree voor {name} kost {entryFee}. {discountInfo}' },
      { category: 'guided_tours', question: 'Zijn er rondleidingen bij {name}?', answerTemplate: 'Bij {name} {tourInfo}.' },
      { category: 'history', question: 'Wat is de geschiedenis van {name}?', answerTemplate: '{name} {historyInfo}.' }
    ],
    en: [
      { category: 'opening_hours', question: 'When is {name} open?', answerTemplate: '{name} is open {openingHours}.' },
      { category: 'pricing', question: 'What is the entrance fee for {name}?', answerTemplate: 'The entrance fee for {name} is {entryFee}. {discountInfo}' },
      { category: 'guided_tours', question: 'Are there guided tours at {name}?', answerTemplate: 'At {name} {tourInfo}.' },
      { category: 'history', question: 'What is the history of {name}?', answerTemplate: '{name} {historyInfo}.' }
    ]
  },
  'Active': {
    nl: [
      { category: 'booking', question: 'Hoe kan ik boeken bij {name}?', answerTemplate: 'Je kunt bij {name} boeken via {bookingInfo}.' },
      { category: 'requirements', question: 'Wat heb ik nodig voor {name}?', answerTemplate: 'Voor {name} heb je nodig: {requirements}.' },
      { category: 'difficulty', question: 'Hoe moeilijk is {name}?', answerTemplate: '{name} is {difficultyLevel}.' },
      { category: 'duration', question: 'Hoe lang duurt een activiteit bij {name}?', answerTemplate: 'Een activiteit bij {name} duurt {duration}.' }
    ],
    en: [
      { category: 'booking', question: 'How can I book at {name}?', answerTemplate: 'You can book at {name} via {bookingInfo}.' },
      { category: 'requirements', question: 'What do I need for {name}?', answerTemplate: 'For {name} you need: {requirements}.' },
      { category: 'difficulty', question: 'How difficult is {name}?', answerTemplate: '{name} is {difficultyLevel}.' },
      { category: 'duration', question: 'How long does an activity at {name} take?', answerTemplate: 'An activity at {name} takes {duration}.' }
    ]
  },
  'Shopping': {
    nl: [
      { category: 'opening_hours', question: 'Wat zijn de openingstijden van {name}?', answerTemplate: '{name} is open {openingHours}.' },
      { category: 'products', question: 'Wat verkopen ze bij {name}?', answerTemplate: '{name} verkoopt {products}.' },
      { category: 'payment', question: 'Welke betaalmethoden accepteert {name}?', answerTemplate: '{name} accepteert {paymentMethods}.' }
    ],
    en: [
      { category: 'opening_hours', question: 'What are the opening hours of {name}?', answerTemplate: '{name} is open {openingHours}.' },
      { category: 'products', question: 'What do they sell at {name}?', answerTemplate: '{name} sells {products}.' },
      { category: 'payment', question: 'What payment methods does {name} accept?', answerTemplate: '{name} accepts {paymentMethods}.' }
    ]
  },
  'Recreation': {
    nl: [
      { category: 'facilities', question: 'Welke faciliteiten heeft {name}?', answerTemplate: '{name} biedt {facilities}.' },
      { category: 'pricing', question: 'Wat kost het bij {name}?', answerTemplate: 'Prijzen bij {name}: {pricing}.' },
      { category: 'family', question: 'Is {name} geschikt voor kinderen?', answerTemplate: '{name} is {familyFriendly}.' }
    ],
    en: [
      { category: 'facilities', question: 'What facilities does {name} have?', answerTemplate: '{name} offers {facilities}.' },
      { category: 'pricing', question: 'How much does it cost at {name}?', answerTemplate: 'Prices at {name}: {pricing}.' },
      { category: 'family', question: 'Is {name} suitable for children?', answerTemplate: '{name} is {familyFriendly}.' }
    ]
  }
};

// Default fallback templates for any category
const DEFAULT_TEMPLATES = {
  nl: [
    { category: 'general', question: 'Waar ligt {name}?', answerTemplate: '{name} is te vinden op {address} in Calpe.' },
    { category: 'general', question: 'Wat is {name}?', answerTemplate: '{name} is een {category} in Calpe. {description}' },
    { category: 'rating', question: 'Hoe goed is {name}?', answerTemplate: '{name} heeft een beoordeling van {rating} sterren met {reviewCount} reviews.' }
  ],
  en: [
    { category: 'general', question: 'Where is {name} located?', answerTemplate: '{name} can be found at {address} in Calpe.' },
    { category: 'general', question: 'What is {name}?', answerTemplate: '{name} is a {category} in Calpe. {description}' },
    { category: 'rating', question: 'How good is {name}?', answerTemplate: '{name} has a rating of {rating} stars with {reviewCount} reviews.' }
  ]
};

// Helper functions for filling templates
function formatOpeningHours(openingHours) {
  if (!openingHours) return 'dagelijks geopend (check de website voor actuele tijden)';
  try {
    const hours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    if (typeof hours === 'object') {
      // Simplified format
      return 'van maandag tot zondag open (zie website voor exacte tijden)';
    }
  } catch (e) {
    // Return as-is if it's already formatted
  }
  return openingHours || 'dagelijks geopend';
}

function formatPriceLevel(priceLevel) {
  const levels = {
    '$': 'budget',
    '$$': 'gemiddeld',
    '$$$': 'hoger',
    '$$$$': 'luxe',
    'budget': 'budget',
    'mid-range': 'gemiddeld',
    'expensive': 'hoger',
    'luxury': 'luxe'
  };
  return levels[priceLevel] || 'gemiddeld';
}

function generateAnswer(template, poi) {
  let answer = template;

  const replacements = {
    '{name}': poi.name,
    '{address}': poi.address || 'het centrum van Calpe',
    '{phone}': poi.phone || 'het restaurant',
    '{website}': poi.website || 'de website',
    '{openingHours}': formatOpeningHours(poi.opening_hours),
    '{priceLevel}': formatPriceLevel(poi.price_level),
    '{rating}': poi.rating || '4+',
    '{reviewCount}': poi.review_count || 'meerdere',
    '{category}': poi.category,
    '{subcategory}': poi.subcategory || poi.category,
    '{description}': (poi.description || '').substring(0, 200),
    // Defaults for missing data
    '{occasion}': 'een ontspannen maaltijd',
    '{specialty}': 'lokale gerechten en verse ingredienten',
    '{locationTip}': 'Makkelijk bereikbaar vanuit het centrum.',
    '{facilities}': 'douches, toiletten en strandtenten',
    '{parkingInfo}': 'in de buurt (betaald parkeren)',
    '{accessibilityInfo}': 'gedeeltelijk toegankelijk',
    '{bestTime}': 'in de ochtend of late middag',
    '{activities}': 'zwemmen, zonnen en snorkelen',
    '{entryFee}': 'enkele euros (variabel)',
    '{discountInfo}': 'Kortingen voor kinderen en groepen mogelijk.',
    '{tourInfo}': 'zijn rondleidingen beschikbaar op aanvraag',
    '{historyInfo}': 'heeft een rijke geschiedenis in de regio.',
    '{bookingInfo}': 'telefoon of de website',
    '{requirements}': 'comfortabele kleding en water',
    '{difficultyLevel}': 'geschikt voor alle niveaus',
    '{duration}': 'ongeveer 1-2 uur',
    '{products}': 'lokale producten en souvenirs',
    '{paymentMethods}': 'contant en kaart',
    '{pricing}': 'variabel - check de website',
    '{familyFriendly}': 'geschikt voor het hele gezin'
  };

  for (const [key, value] of Object.entries(replacements)) {
    answer = answer.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || '');
  }

  return answer;
}

async function main() {
  console.log('Starting POI Q&A generation...\n');

  try {
    // Check database connection
    await mysqlSequelize.authenticate();
    console.log('Database connected successfully.\n');

    // Get all active POIs
    const pois = await mysqlSequelize.query(`
      SELECT id, name, category, subcategory, description, address,
             phone, website, rating, review_count, price_level, opening_hours
      FROM POI
      WHERE is_active = 1
      ORDER BY rating DESC
      LIMIT 500
    `, { type: QueryTypes.SELECT });

    console.log(`Found ${pois.length} active POIs.\n`);

    // Check current poi_qa count
    const existingCount = await mysqlSequelize.query(
      'SELECT COUNT(*) as count FROM poi_qa',
      { type: QueryTypes.SELECT }
    );
    console.log(`Existing Q&A entries: ${existingCount[0]?.count || 0}\n`);

    // Generate Q&A pairs
    const qaEntries = [];
    const languages = ['nl', 'en'];

    for (const poi of pois) {
      // Get templates for this category
      const categoryTemplates = QA_TEMPLATES[poi.category] || {};

      for (const lang of languages) {
        // Use category-specific templates if available, otherwise defaults
        const templates = categoryTemplates[lang] || DEFAULT_TEMPLATES[lang] || [];

        for (const template of templates) {
          const question = template.question.replace(/{name}/g, poi.name);
          const answer = generateAnswer(template.answerTemplate, poi);

          // Generate keywords from question and category
          const keywords = [
            poi.name.toLowerCase(),
            poi.category?.toLowerCase(),
            poi.subcategory?.toLowerCase(),
            template.category,
            ...question.toLowerCase().split(' ').filter(w => w.length > 3)
          ].filter(Boolean);

          qaEntries.push({
            id: uuidv4(),
            poi_id: poi.id,
            question,
            answer,
            language: lang,
            category: template.category,
            keywords: JSON.stringify([...new Set(keywords)]),
            is_active: true,
            is_verified: false,
            source: 'ai_generated',
            confidence_score: 0.85
          });
        }
      }
    }

    console.log(`Generated ${qaEntries.length} Q&A entries.\n`);

    // Insert in batches (to avoid memory issues)
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < qaEntries.length; i += batchSize) {
      const batch = qaEntries.slice(i, i + batchSize);

      // Use INSERT IGNORE to skip duplicates
      const values = batch.map(qa => [
        qa.id,
        qa.poi_id,
        qa.question,
        qa.answer,
        qa.language,
        qa.category,
        qa.keywords,
        qa.is_active,
        qa.is_verified,
        qa.source,
        qa.confidence_score
      ]);

      try {
        await mysqlSequelize.query(`
          INSERT IGNORE INTO poi_qa
            (id, poi_id, question, answer, language, category, keywords, is_active, is_verified, source, confidence_score)
          VALUES ?
        `, {
          replacements: [values],
          type: QueryTypes.INSERT
        });
        inserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(qaEntries.length / batchSize)}`);
      } catch (error) {
        console.error(`Error inserting batch: ${error.message}`);
        // Try individual inserts for this batch
        for (const qa of batch) {
          try {
            await mysqlSequelize.query(`
              INSERT IGNORE INTO poi_qa
                (id, poi_id, question, answer, language, category, keywords, is_active, is_verified, source, confidence_score)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, {
              replacements: [
                qa.id, qa.poi_id, qa.question, qa.answer, qa.language,
                qa.category, qa.keywords, qa.is_active, qa.is_verified, qa.source, qa.confidence_score
              ],
              type: QueryTypes.INSERT
            });
            inserted++;
          } catch (e) {
            // Skip on duplicate
          }
        }
      }
    }

    // Final count
    const finalCount = await mysqlSequelize.query(
      'SELECT COUNT(*) as count FROM poi_qa',
      { type: QueryTypes.SELECT }
    );

    console.log(`\nQ&A Generation complete!`);
    console.log(`Total Q&A entries in database: ${finalCount[0]?.count || 0}`);
    console.log(`New entries added: ~${inserted}`);

  } catch (error) {
    console.error('Error generating Q&A:', error);
    process.exit(1);
  } finally {
    await mysqlSequelize.close();
  }
}

main();
