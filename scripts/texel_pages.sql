-- Texel pages for hb-websites (Fase V.3)
-- destination_id = 2

INSERT INTO pages (destination_id, slug, title_nl, title_en, title_de, seo_title_nl, seo_title_en, seo_description_nl, seo_description_en, layout, status, sort_order)
VALUES
(2, 'home', 'Welkom op Texel', 'Welcome to Texel', 'Willkommen auf Texel',
 'TexelMaps - Jouw Persoonlijke Eilandgids', 'TexelMaps - Your Personal Island Guide',
 'Ontdek Texel met je persoonlijke AI-reisassistent Tessa. Restaurants, stranden, natuur en meer.',
 'Discover Texel with your personal AI travel assistant Tessa. Restaurants, beaches, nature and more.',
 '{"blocks":[{"id":"hero-1","type":"hero","props":{"headline":"Welkom op Texel","description":"Ontdek het mooiste Waddeneiland met je persoonlijke AI-reisassistent Tessa","tagline":"Powered by AI","buttons":[{"label":"Verken","href":"/explore","variant":"primary"},{"label":"Chat met Tessa","href":"#chatbot","variant":"secondary"}]}},{"id":"poi-grid-1","type":"poi_grid","props":{"categoryFilter":["Eten & Drinken"],"limit":6,"columns":3}},{"id":"events-1","type":"event_calendar","props":{"limit":4,"layout":"grid"}},{"id":"map-1","type":"map","props":{"center":[53.08,4.80],"zoom":12}},{"id":"cta-1","type":"rich_text","props":{"content":"Texel is het grootste en meest westelijke Waddeneiland van Nederland. Met 30 km strand, prachtige natuur en gezellige dorpen is er voor iedereen iets te ontdekken."}}]}',
 'published', 0),

(2, 'explore', 'Ontdek Texel', 'Explore Texel', 'Texel entdecken',
 'Ontdek Texel - Alle bezienswaardigheden', 'Explore Texel - All Attractions',
 'Bekijk alle bezienswaardigheden, restaurants, stranden en activiteiten op Texel.',
 'Browse all attractions, restaurants, beaches and activities on Texel.',
 '{"blocks":[{"id":"hero-explore","type":"hero","props":{"headline":"Ontdek Texel","description":"Alle bezienswaardigheden op het eiland","tagline":"1.600+ locaties"}},{"id":"poi-all","type":"poi_grid","props":{"limit":24,"columns":3}},{"id":"map-explore","type":"map","props":{"center":[53.08,4.80],"zoom":12}}]}',
 'published', 1),

(2, 'events', 'Evenementen op Texel', 'Events on Texel', 'Veranstaltungen auf Texel',
 'Evenementen op Texel - Agenda', 'Events on Texel - Calendar',
 'Bekijk alle evenementen, festivals en activiteiten op Texel.',
 'Browse all events, festivals and activities on Texel.',
 '{"blocks":[{"id":"hero-events","type":"hero","props":{"headline":"Evenementen op Texel","description":"Ontdek concerten, festivals en culturele evenementen"}},{"id":"events-all","type":"event_calendar","props":{"limit":12,"layout":"grid"}}]}',
 'published', 2),

(2, 'restaurants', 'Restaurants op Texel', 'Restaurants on Texel', 'Restaurants auf Texel',
 'Restaurants op Texel - Eten & Drinken', 'Restaurants on Texel - Food & Drinks',
 'De beste restaurants, cafes en eetgelegenheden op Texel.',
 'The best restaurants, cafes and dining spots on Texel.',
 '{"blocks":[{"id":"hero-rest","type":"hero","props":{"headline":"Restaurants op Texel","description":"Van visrestaurants tot gezellige eilandcafes"}},{"id":"poi-food","type":"poi_grid","props":{"categoryFilter":["Eten & Drinken"],"limit":18,"columns":3}}]}',
 'published', 3),

(2, 'about', 'Over TexelMaps', 'About TexelMaps', 'Uber TexelMaps',
 'Over TexelMaps - Jouw Eilandgids', 'About TexelMaps - Your Island Guide',
 'TexelMaps is je persoonlijke AI-reisassistent voor Texel, powered by Tessa.',
 'TexelMaps is your personal AI travel assistant for Texel, powered by Tessa.',
 '{"blocks":[{"id":"hero-about","type":"hero","props":{"headline":"Over TexelMaps","description":"Je persoonlijke AI-eilandgids voor Texel"}},{"id":"text-about","type":"rich_text","props":{"content":"TexelMaps is je slimme reisassistent voor Texel, het mooiste Waddeneiland van Nederland. Met meer dan 1.600 zorgvuldig geselecteerde locaties, actuele evenementen en een AI-chatbot Tessa die Texel door en door kent, zorgen wij ervoor dat je het maximale uit je bezoek haalt. Van de vuurtoren bij De Cocksdorp tot de zeehonden bij Ecomare, van verse vis in Oudeschild tot fietsen door de duinen - Tessa weet alles."}},{"id":"reviews-about","type":"testimonials","props":{"limit":3,"minRating":4}}]}',
 'published', 4),

(2, 'contact', 'Contact', 'Contact', 'Kontakt',
 'Contact TexelMaps', 'Contact TexelMaps',
 'Neem contact op met TexelMaps voor vragen over Texel.',
 'Get in touch with TexelMaps for questions about Texel.',
 '{"blocks":[{"id":"hero-contact","type":"hero","props":{"headline":"Contact","description":"Neem contact met ons op"}},{"id":"text-contact","type":"rich_text","props":{"content":"Heb je vragen over Texel of hulp nodig bij het plannen van je bezoek? Wij helpen je graag! Mail ons op info@holidaibutler.com of gebruik onze AI-chatbot Tessa (rechtsonder) voor directe antwoorden over restaurants, activiteiten, evenementen en meer op Texel."}}]}',
 'published', 5);
