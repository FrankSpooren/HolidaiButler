-- Update Reviews for POI 437 (Alucinakis - Terra Mítica)
-- Making reviews contextually relevant to the actual attraction

-- Update review 1 (Sarah M. - couples - 5 stars - positive)
UPDATE reviews SET
  review_text = 'Perfect ride for couples who want something fun but not too extreme! The wooden coaster design is charming and the Roman mine theme is well done. We rode it twice and loved every minute!'
WHERE id = 1 AND poi_id = 437;

-- Update review 2 (John & Family - families - 4 stars - positive)
UPDATE reviews SET
  review_text = 'Great family ride! Our 6-year-old absolutely loved it. Not too scary but exciting enough to feel like a real roller coaster. The two laps around make it worth the queue time.'
WHERE id = 2 AND poi_id = 437;

-- Update review 3 (Mark T. - solo - 3 stars - neutral)
UPDATE reviews SET
  review_text = 'Decent ride if you are visiting with kids. As a solo adult it is a bit tame, but I can see why families enjoy it. Queue was about 15 minutes on a weekday.'
WHERE id = 3 AND poi_id = 437;

-- Update review 4 (Emma & Friends - friends - 5 stars - positive)
UPDATE reviews SET
  review_text = 'Such a fun nostalgia trip! Even as adults we had a blast on this wooden coaster. The Roman theme and going around twice makes it one of the best family rides in Terra Mítica!'
WHERE id = 4 AND poi_id = 437;

-- Update review 5 (David R. - business - 4 stars - positive)
UPDATE reviews SET
  review_text = 'Took a break from our business retreat at the park. Surprisingly enjoyable even for adults. Good team bonding experience and not too intense. Well-maintained ride.'
WHERE id = 5 AND poi_id = 437;

-- Update review 6 (Lisa K. - couples - 2 stars - negative)
UPDATE reviews SET
  review_text = 'Expected more thrills based on the wooden coaster design. It is clearly designed for young children. If you want excitement, skip this and go to Magnus Colossus instead.'
WHERE id = 6 AND poi_id = 437;

-- Update review 7 (Tom & Amy - couples - 5 stars - positive)
UPDATE reviews SET
  review_text = 'Absolutely charming ride! The attention to detail in the Roman mining theme is impressive. Perfect for couples who enjoy theme parks but prefer milder attractions. Highly recommend!'
WHERE id = 7 AND poi_id = 437;

-- Update review 8 (Jennifer S. - families - 3 stars - neutral)
UPDATE reviews SET
  review_text = 'Nice starter coaster for younger kids. Our 4-year-old enjoyed it but our 10-year-old found it boring. Good for the price of park admission but nothing special.'
WHERE id = 8 AND poi_id = 437;

-- Update review 9 (Mike P. - solo - 4 stars - positive)
UPDATE reviews SET
  review_text = 'Great ride for photography! The wooden structure and Roman theming provide excellent photo opportunities. Smooth ride, well-designed for all ages. Worth a visit!'
WHERE id = 9 AND poi_id = 437;

-- Update review 10 (Rachel & Co. - friends - 4 stars - positive)
UPDATE reviews SET
  review_text = 'Fun group experience! We are all in our 20s and still had a great time. The double lap is a nice touch. Perfect warm-up before hitting the bigger coasters!'
WHERE id = 10 AND poi_id = 437;
