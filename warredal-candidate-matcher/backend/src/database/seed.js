import sequelize from '../config/database.js';
import { User, Vacancy, Criterion, Candidate, CandidateScore } from '../models/index.js';
import MatchingEngine from '../services/matcher/MatchingEngine.js';
import { logger } from '../utils/logger.js';

const matcher = new MatchingEngine();

/**
 * INVESTOR-READY DEMO DATA
 * Warredal Marketing & Sales Recruitment
 */

const seedDatabase = async () => {
  try {
    logger.info('🌱 Starting database seed...');

    // Sync database (drop all tables and recreate)
    await sequelize.sync({ force: true });
    logger.info('✅ Database synced');

    // 1. Create Demo User
    const adminUser = await User.create({
      email: 'demo@warredal.be',
      password: 'Demo123!',
      firstName: 'Demo',
      lastName: 'Recruiter',
      role: 'admin',
      linkedinProfile: 'https://linkedin.com/in/demo-warredal'
    });
    logger.info('✅ Admin user created: demo@warredal.be / Demo123!');

    // 2. Create Warredal Marketing & Sales Vacancy
    const vacancy = await Vacancy.create({
      title: 'Marketing & Sales Manager',
      organization: 'Warredal',
      location: 'Maaseik, België',
      description: `Warredal, gevestigd in het prachtige Maaseik, is op zoek naar een gedreven en creatieve **Marketing & Sales Manager** om ons team te versterken.

**Over Warredal:**
Warredal is een toonaangevende organisatie in de toerisme- en recreatiesector, gespecialiseerd in het ontwikkelen van unieke vrijetijdservaringen in de regio Maaseik. Met onze focus op innovatie, duurzaamheid en gasttevredenheid, streven we ernaar om bezoekers een onvergetelijke ervaring te bieden.

**De Rol:**
Als Marketing & Sales Manager ben je verantwoordelijk voor het ontwikkelen en uitvoeren van onze marketing- en verkoopstrategie. Je werkt nauw samen met het directieteam en bent de drijvende kracht achter onze groei in zowel de Belgische als Nederlandse markt.

**Jouw Verantwoordelijkheden:**
• Ontwikkelen en implementeren van marketing- en salesstrategieën
• Opbouwen en onderhouden van B2B-partnerships in Vlaanderen en Nederland
• Leiden van marketing campagnes (online en offline)
• Analyseren van markttrends en concurrentiepositionering
• Beheren van het marketing budget
• Samenwerken met externe partners en agentschappen
• Rapporteren aan de directie over resultaten en ROI`,
      requirements: `**Wat Wij Zoeken:**
• Afgeronde hogere opleiding (HBO/WO) in Marketing, Communicatie, Commercie, Toerisme of gerelateerd
• Minimaal 5 jaar relevante werkervaring in marketing & sales binnen de toerisme- of vrijetijdssector
• Aantoonbaar uitgebreid B2B-netwerk in Vlaanderen (ervaring in Nederland is een sterke pre)
• Leidinggevende ervaring of duidelijk potentieel om een team te leiden
• Uitstekende communicatieve vaardigheden in Nederlands (Frans is een plus)
• Sterke analytische vaardigheden en data-driven mindset
• Hands-on mentaliteit en resultaatgericht

**Persoonlijkheid:**
• Teamplayer met een positieve instelling
• Analytisch en strategisch denkvermogen
• Commercieel en ondernemend
• Daadkrachtig en proactief
• Creatief en innovatief
• Netwerker die gemakkelijk relaties opbouwt`,
      websiteUrl: 'https://www.warredal.be',
      status: 'active',
      targetCount: 15,
      createdBy: adminUser.id
    });
    logger.info('✅ Vacancy created: Marketing & Sales Manager');

    // 3. Create Criteria (Weighted Scoring System)
    const criteria = await Criterion.bulkCreate([
      {
        vacancyId: vacancy.id,
        category: 'education',
        name: 'Hogere Opleiding Marketing/Communicatie/Toerisme',
        description: 'HBO of WO diploma in marketing, communicatie, commercie, toerisme of gerelateerd vakgebied',
        weight: 8.0,
        scoreType: 'scale',
        required: true,
        keywords: ['marketing', 'communicatie', 'commercie', 'toerisme', 'vrijetijdskunde', 'hospitality'],
        order: 1
      },
      {
        vacancyId: vacancy.id,
        category: 'location',
        name: 'Belgische of Nederlandse Nationaliteit',
        description: 'Woont in België (Vlaanderen) of Nederland voor lokaal netwerk',
        weight: 7.0,
        scoreType: 'boolean',
        required: true,
        keywords: ['belgië', 'belgi', 'vlaanderen', 'nederland', 'limburg', 'maaseik'],
        order: 2
      },
      {
        vacancyId: vacancy.id,
        category: 'experience',
        name: '5+ Jaar Ervaring Toerisme & Marketing',
        description: 'Minimaal 5 jaar relevante werkervaring in toerisme, recreatie of hospitality sector met marketing & sales focus',
        weight: 9.0,
        scoreType: 'scale',
        required: true,
        keywords: ['toerisme', 'tourism', 'recreatie', 'hospitality', 'leisure', 'marketing', 'sales', 'vrijetijd'],
        order: 3
      },
      {
        vacancyId: vacancy.id,
        category: 'network',
        name: 'B2B Netwerk Vlaanderen',
        description: 'Aantoonbaar uitgebreid B2B-netwerk in Vlaanderen en bij voorkeur ook in Nederland',
        weight: 8.0,
        scoreType: 'scale',
        required: false,
        keywords: ['b2b', 'business', 'netwerk', 'partnerships', 'relaties', 'vlaanderen'],
        order: 4
      },
      {
        vacancyId: vacancy.id,
        category: 'experience',
        name: 'Leidinggevende Ervaring',
        description: 'Ervaring met het aansturen van een team of duidelijk potentieel om te groeien naar een leidinggevende rol',
        weight: 6.0,
        scoreType: 'scale',
        required: false,
        keywords: ['manager', 'lead', 'director', 'teamlead', 'leiding', 'management'],
        order: 5
      },
      {
        vacancyId: vacancy.id,
        category: 'personality',
        name: 'Teamplayer & Analytisch',
        description: 'Sterke teamplayer met analytische vaardigheden en data-driven mindset',
        weight: 5.0,
        scoreType: 'scale',
        required: false,
        keywords: ['teamwork', 'analytics', 'data', 'samenwerking'],
        order: 6
      },
      {
        vacancyId: vacancy.id,
        category: 'personality',
        name: 'Commercieel & Daadkrachtig',
        description: 'Commerciële drive met hands-on mentaliteit en resultaatgerichtheid',
        weight: 6.0,
        scoreType: 'scale',
        required: false,
        keywords: ['commercieel', 'sales', 'resultaat', 'proactief', 'aanpakker'],
        order: 7
      }
    ]);
    logger.info(`✅ Created ${criteria.length} criteria with weighted scoring`);

    // 4. Create Realistic Demo Candidates
    const candidates = await Candidate.bulkCreate([
      {
        vacancyId: vacancy.id,
        firstName: 'Sarah',
        lastName: 'Van den Berg',
        email: 'sarah.vandenberg@example.com',
        phone: '+32 498 76 54 32',
        location: 'Hasselt, België',
        nationality: 'Belgisch',
        linkedinUrl: 'https://linkedin.com/in/sarah-vandenberg',
        currentTitle: 'Marketing Manager',
        currentCompany: 'Visit Limburg',
        experience: [
          {
            title: 'Marketing Manager',
            company: 'Visit Limburg',
            duration: '2019 - Present (5 years)',
            description: 'Verantwoordelijk voor marketing strategie en B2B partnerships in de toerismesector'
          },
          {
            title: 'Marketing Coordinator',
            company: 'Toeris Vlaanderen',
            duration: '2016 - 2019 (3 years)',
            description: 'Coördinatie van marketingcampagnes en evenementen'
          }
        ],
        education: [
          {
            school: 'Universiteit Hasselt',
            degree: 'Master',
            field: 'Marketing & Communications',
            duration: '2012 - 2016'
          }
        ],
        skills: ['Marketing Strategy', 'B2B Sales', 'Tourism Marketing', 'Event Management', 'Digital Marketing', 'Analytics'],
        languages: [{ language: 'Nederlands', level: 'Native' }, { language: 'Engels', level: 'Fluent' }, { language: 'Frans', level: 'Good' }],
        source: 'linkedin_scrape',
        status: 'qualified',
        addedBy: adminUser.id
      },
      {
        vacancyId: vacancy.id,
        firstName: 'Marc',
        lastName: 'Peters',
        email: 'marc.peters@example.com',
        phone: '+31 6 12 34 56 78',
        location: 'Roermond, Nederland',
        nationality: 'Nederlands',
        linkedinUrl: 'https://linkedin.com/in/marc-peters',
        currentTitle: 'Sales Director',
        currentCompany: 'Designer Outlet Roermond',
        experience: [
          {
            title: 'Sales Director',
            company: 'Designer Outlet Roermond',
            duration: '2017 - Present (7 years)',
            description: 'Leiding aan sales team, ontwikkeling B2B partnerships met toerisme organisaties'
          },
          {
            title: 'Business Development Manager',
            company: 'McArthurGlen Group',
            duration: '2014 - 2017 (3 years)',
            description: 'B2B sales en partnership development'
          }
        ],
        education: [
          {
            school: 'Hogeschool Zuyd',
            degree: 'Bachelor',
            field: 'Commerciële Economie',
            duration: '2010 - 2014'
          }
        ],
        skills: ['B2B Sales', 'Business Development', 'Team Leadership', 'Partnership Management', 'Commercial Strategy'],
        languages: [{ language: 'Nederlands', level: 'Native' }, { language: 'Engels', level: 'Fluent' }, { language: 'Duits', level: 'Good' }],
        source: 'linkedin_scrape',
        status: 'contacted',
        addedBy: adminUser.id
      },
      {
        vacancyId: vacancy.id,
        firstName: 'Lisa',
        lastName: 'Janssens',
        email: 'lisa.janssens@example.com',
        phone: '+32 476 89 12 34',
        location: 'Antwerpen, België',
        nationality: 'Belgisch',
        linkedinUrl: 'https://linkedin.com/in/lisa-janssens',
        currentTitle: 'Marketing & Communications Lead',
        currentCompany: 'Tourism Flanders',
        experience: [
          {
            title: 'Marketing & Communications Lead',
            company: 'Tourism Flanders',
            duration: '2018 - Present (6 years)',
            description: 'Leiding marketing team, internationale campagnes, B2B partnerships'
          },
          {
            title: 'Digital Marketing Manager',
            company: 'Plopsaland',
            duration: '2015 - 2018 (3 years)',
            description: 'Online marketing strategie voor pretpark'
          }
        ],
        education: [
          {
            school: 'KU Leuven',
            degree: 'Master',
            field: 'Marketing & Toerisme',
            duration: '2013 - 2015'
          }
        ],
        skills: ['Tourism Marketing', 'Team Leadership', 'Campaign Management', 'B2B Relations', 'Strategic Planning', 'Digital Marketing'],
        languages: [{ language: 'Nederlands', level: 'Native' }, { language: 'Engels', level: 'Fluent' }],
        source: 'linkedin_applicant',
        status: 'responded',
        addedBy: adminUser.id
      },
      {
        vacancyId: vacancy.id,
        firstName: 'Tom',
        lastName: 'De Vries',
        email: 'tom.devries@example.com',
        phone: '+31 6 98 76 54 32',
        location: 'Venlo, Nederland',
        nationality: 'Nederlands',
        linkedinUrl: 'https://linkedin.com/in/tom-devries',
        currentTitle: 'Commercial Manager',
        currentCompany: 'Center Parcs',
        experience: [
          {
            title: 'Commercial Manager',
            company: 'Center Parcs',
            duration: '2016 - Present (8 years)',
            description: 'Commerciële strategie, B2B sales, partnership development'
          },
          {
            title: 'Sales Manager',
            company: 'Landal GreenParks',
            duration: '2013 - 2016 (3 years)',
            description: 'B2B verkoop en relatiemanagement'
          }
        ],
        education: [
          {
            school: 'NHTV Breda',
            degree: 'Bachelor',
            field: 'Leisure Management',
            duration: '2009 - 2013'
          }
        ],
        skills: ['Commercial Strategy', 'B2B Sales', 'Tourism', 'Partnership Development', 'Revenue Management'],
        languages: [{ language: 'Nederlands', level: 'Native' }, { language: 'Engels', level: 'Fluent' }],
        source: 'linkedin_scrape',
        status: 'interview',
        addedBy: adminUser.id
      },
      {
        vacancyId: vacancy.id,
        firstName: 'Emma',
        lastName: 'Hermans',
        email: 'emma.hermans@example.com',
        phone: '+32 495 12 34 56',
        location: 'Genk, België',
        nationality: 'Belgisch',
        linkedinUrl: 'https://linkedin.com/in/emma-hermans',
        currentTitle: 'Marketing Coordinator',
        currentCompany: 'C-Mine',
        experience: [
          {
            title: 'Marketing Coordinator',
            company: 'C-Mine',
            duration: '2020 - Present (4 years)',
            description: 'Marketing coördinatie voor cultuur en recreatie complex'
          },
          {
            title: 'Event Manager',
            company: 'Ethias Arena',
            duration: '2018 - 2020 (2 years)',
            description: 'Event management en marketing'
          }
        ],
        education: [
          {
            school: 'PXL Hogeschool',
            degree: 'Bachelor',
            field: 'Event & Project Management',
            duration: '2015 - 2018'
          }
        ],
        skills: ['Event Marketing', 'Project Management', 'Social Media', 'Communications'],
        languages: [{ language: 'Nederlands', level: 'Native' }, { language: 'Engels', level: 'Good' }],
        source: 'linkedin_applicant',
        status: 'sourced',
        addedBy: adminUser.id
      },
      {
        vacancyId: vacancy.id,
        firstName: 'Kevin',
        lastName: 'Smits',
        email: 'kevin.smits@example.com',
        phone: '+32 478 90 12 34',
        location: 'Tongeren, België',
        nationality: 'Belgisch',
        linkedinUrl: 'https://linkedin.com/in/kevin-smits',
        currentTitle: 'Business Development Manager',
        currentCompany: 'Terhills',
        experience: [
          {
            title: 'Business Development Manager',
            company: 'Terhills',
            duration: '2019 - Present (5 years)',
            description: 'B2B ontwikkeling voor recreatie en shopping destination'
          },
          {
            title: 'Marketing Manager',
            company: 'Maasmechelen Village',
            duration: '2016 - 2019 (3 years)',
            description: 'Marketing strategie outlet center'
          }
        ],
        education: [
          {
            school: 'Universiteit Antwerpen',
            degree: 'Master',
            field: 'Marketing Management',
            duration: '2014 - 2016'
          }
        ],
        skills: ['Business Development', 'B2B Marketing', 'Strategic Partnerships', 'Retail Marketing', 'Analytics'],
        languages: [{ language: 'Nederlands', level: 'Native' }, { language: 'Engels', level: 'Fluent' }, { language: 'Frans', level: 'Good' }],
        source: 'linkedin_scrape',
        status: 'qualified',
        addedBy: adminUser.id
      }
    ]);
    logger.info(`✅ Created ${candidates.length} realistic demo candidates`);

    // 5. Auto-score all candidates
    logger.info('🎯 Scoring candidates...');
    for (const candidate of candidates) {
      await matcher.scoreCandidate(candidate.id, adminUser.id);
    }

    // Reload to get scores
    const scoredCandidates = await Candidate.findAll({
      where: { vacancyId: vacancy.id },
      order: [['matchPercentage', 'DESC']]
    });

    logger.info('✅ All candidates scored:');
    scoredCandidates.forEach(c => {
      logger.info(`  • ${c.firstName} ${c.lastName}: ${c.matchPercentage}% match (${c.status})`);
    });

    logger.info('\n🎉 DATABASE SEEDED SUCCESSFULLY!');
    logger.info('\n📊 DEMO CREDENTIALS:');
    logger.info('  Email: demo@warredal.be');
    logger.info('  Password: Demo123!');
    logger.info('\n🎯 DEMO DATA:');
    logger.info(`  • 1 Active Vacancy: ${vacancy.title}`);
    logger.info(`  • 7 Weighted Criteria`);
    logger.info(`  • ${candidates.length} Realistic Candidates (scored)`);
    logger.info('  • Statuses: sourced, qualified, contacted, responded, interview');
    logger.info('\n✨ Ready for investor demo!');

  } catch (error) {
    logger.error('❌ Seed error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run seed
seedDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
