/**
 * TEST: POI Content Quality Audit
 * ================================
 * Quick test on 10 POIs to verify the quality assessment works
 */

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
require('dotenv').config();

async function testQualityAudit() {
  console.log('🧪 Testing Quality Audit on 10 POIs...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('✅ Connected to database');

  try {
    // Get 10 POIs: 5 with good descriptions, 5 without
    const [pois] = await connection.query(`
      (SELECT id, name, description, category
       FROM POI
       WHERE is_active = TRUE
         AND description IS NOT NULL
         AND LENGTH(description) >= 200
       ORDER BY RAND()
       LIMIT 5)
      UNION ALL
      (SELECT id, name, description, category
       FROM POI
       WHERE is_active = TRUE
         AND (description IS NULL OR LENGTH(description) < 100)
       ORDER BY RAND()
       LIMIT 5)
    `);

    console.log(`\n📊 Testing ${pois.length} POIs:\n`);

    for (const poi of pois) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`POI ID: ${poi.id}`);
      console.log(`Name: ${poi.name}`);
      console.log(`Category: ${poi.category}`);
      console.log(`Description Length: ${poi.description?.length || 0} chars`);
      console.log(`Description: ${poi.description?.substring(0, 100) || 'NULL'}${poi.description?.length > 100 ? '...' : ''}`);

      // Assess quality
      console.log(`\n🤖 Assessing with Mistral AI...`);

      const prompt = `Evaluate the quality of this POI description for a travel/tourism platform.

POI Information:
- Name: ${poi.name}
- Category: ${poi.category}
- Description: "${poi.description || 'NO DESCRIPTION'}"

Evaluate on these 5 criteria (score each 1-10):

1. INFORMATIVENESS: Does it provide useful, specific information?
2. ENGAGEMENT: Is it interesting and compelling?
3. ACCURACY: Does it seem factual and objective?
4. COMPLETENESS: Does it cover key aspects?
5. CLARITY: Is it clear and well-written?

Return ONLY a valid JSON object:
{
  "informativeness": <number>,
  "engagement": <number>,
  "accuracy": <number>,
  "completeness": <number>,
  "clarity": <number>,
  "overall_score": <number>,
  "usable": <boolean>,
  "issues": [<string>, ...],
  "recommendation": "keep|improve|replace"
}`;

      try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
          },
          body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' }
          })
        });

        const data = await response.json();
        const quality = JSON.parse(data.choices[0].message.content);

        console.log(`\n✅ Quality Assessment:`);
        console.log(`   Informativeness: ${quality.informativeness}/10`);
        console.log(`   Engagement:      ${quality.engagement}/10`);
        console.log(`   Accuracy:        ${quality.accuracy}/10`);
        console.log(`   Completeness:    ${quality.completeness}/10`);
        console.log(`   Clarity:         ${quality.clarity}/10`);
        console.log(`   ─────────────────────────────`);
        console.log(`   Overall Score:   ${quality.overall_score}/10`);
        console.log(`   Recommendation:  ${quality.recommendation.toUpperCase()}`);
        if (quality.issues && quality.issues.length > 0) {
          console.log(`   Issues:`);
          quality.issues.forEach(issue => console.log(`     - ${issue}`));
        }

      } catch (error) {
        console.error(`\n❌ Assessment failed:`, error.message);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n✅ Test complete! All ${pois.length} POIs assessed.`);
    console.log(`\n💰 Estimated cost: ~$${(pois.length * 0.003).toFixed(3)}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

testQualityAudit()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
