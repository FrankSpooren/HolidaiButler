require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🎢 Updating Alucinakis reviews...\n');

    const reviews = [
      {
        id: 1,
        text: "Perfect ride for couples who want something fun but not too extreme! The wooden coaster design is charming and the Roman mine theme is well done. We rode it twice and loved every minute!"
      },
      {
        id: 2,
        text: "Great family ride! Our 6-year-old absolutely loved it. Not too scary but exciting enough to feel like a real roller coaster. The two laps around make it worth the queue time."
      },
      {
        id: 3,
        text: "Decent ride if you are visiting with kids. As a solo adult it is a bit tame, but I can see why families enjoy it. Queue was about 15 minutes on a weekday."
      },
      {
        id: 4,
        text: "Such a fun nostalgia trip! Even as adults we had a blast on this wooden coaster. The Roman theme and going around twice makes it one of the best family rides in Terra Mítica!"
      },
      {
        id: 5,
        text: "Took a break from our business retreat at the park. Surprisingly enjoyable even for adults. Good team bonding experience and not too intense. Well-maintained ride."
      },
      {
        id: 6,
        text: "Expected more thrills based on the wooden coaster design. It is clearly designed for young children. If you want excitement, skip this and go to Magnus Colossus instead."
      },
      {
        id: 7,
        text: "Absolutely charming ride! The attention to detail in the Roman mining theme is impressive. Perfect for couples who enjoy theme parks but prefer milder attractions. Highly recommend!"
      },
      {
        id: 8,
        text: "Nice starter coaster for younger kids. Our 4-year-old enjoyed it but our 10-year-old found it boring. Good for the price of park admission but nothing special."
      },
      {
        id: 9,
        text: "Great ride for photography! The wooden structure and Roman theming provide excellent photo opportunities. Smooth ride, well-designed for all ages. Worth a visit!"
      },
      {
        id: 10,
        text: "Fun group experience! We are all in our 20s and still had a great time. The double lap is a nice touch. Perfect warm-up before hitting the bigger coasters!"
      }
    ];

    let updated = 0;
    for (const review of reviews) {
      await db.query(
        'UPDATE reviews SET review_text = ? WHERE id = ? AND poi_id = 437',
        [review.text, review.id]
      );
      updated++;
      console.log(`✓ Review ${review.id} updated`);
    }

    console.log(`\n✅ All ${updated} reviews updated successfully!\n`);

    console.log('📝 Verification - Updated reviews:\n');
    const [allReviews] = await db.query(
      'SELECT id, user_name, rating, travel_party_type, review_text FROM reviews WHERE poi_id = 437 ORDER BY id'
    );

    allReviews.forEach(r => {
      console.log(`\n[${r.id}] ${r.user_name} (${r.travel_party_type}, ${r.rating}★):`);
      console.log(`    "${r.review_text.substring(0, 100)}..."`);
    });

    console.log('\n\n🎯 All reviews are now about Alucinakis - Terra Mítica wooden coaster!');
    console.log('🌐 View at: http://localhost:5176/pois/437\n');

    await db.end();
    console.log('✅ Database connection closed.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
