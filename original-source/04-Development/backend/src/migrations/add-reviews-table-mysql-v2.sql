-- Migration: Add Reviews Table (MySQL/MariaDB) - VERSION 2 (Foreign Key Fixed)
-- Sprint: 7.6 - Personalized Reviews System
-- Database: pxoziy_db1 @ Hetzner
-- Created: 2025-11-08
-- Fixed: Removed problematic foreign key constraint

-- Create reviews table WITHOUT foreign key constraint
-- (Foreign keys can cause issues if pois table structure is different)
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poi_id INT NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  travel_party_type ENUM('couples', 'families', 'solo', 'friends', 'business') NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  sentiment ENUM('positive', 'neutral', 'negative') NOT NULL DEFAULT 'neutral',
  helpful_count INT DEFAULT 0,
  visit_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX idx_reviews_poi_id (poi_id),
  INDEX idx_reviews_travel_party (travel_party_type),
  INDEX idx_reviews_sentiment (sentiment),
  INDEX idx_reviews_rating (rating),
  INDEX idx_reviews_helpful_count (helpful_count DESC),
  INDEX idx_reviews_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert mock data for testing (POI ID 437 - Ca'n Manolo)
INSERT INTO reviews (poi_id, user_name, travel_party_type, rating, review_text, sentiment, helpful_count, visit_date, created_at) VALUES
(437, 'Sarah M.', 'couples', 5, 'Amazing restaurant with stunning views! The paella was exceptional and the service was impeccable. Perfect for a romantic dinner.', 'positive', 24, '2024-10-15', '2024-10-16 10:30:00'),
(437, 'John & Family', 'families', 4, 'Great place for families. Kids enjoyed the playground area while we waited for food. Menu has good variety.', 'positive', 18, '2024-10-10', '2024-10-11 14:20:00'),
(437, 'Mark T.', 'solo', 3, 'Food was decent but service was a bit slow. Good for solo dining, quiet atmosphere.', 'neutral', 7, '2024-10-05', '2024-10-06 09:15:00'),
(437, 'Emma & Friends', 'friends', 5, 'Best tapas in the area! We had a fantastic time with our group. The sangria was delicious and the portions were generous.', 'positive', 31, '2024-10-20', '2024-10-21 16:45:00'),
(437, 'David R.', 'business', 4, 'Good spot for a business lunch. Professional atmosphere, quick service. WiFi available.', 'positive', 12, '2024-10-18', '2024-10-18 19:30:00'),
(437, 'Lisa K.', 'couples', 2, 'Disappointing experience. The food was cold when it arrived and we waited over an hour. Not what we expected.', 'negative', 5, '2024-10-12', '2024-10-13 11:00:00'),
(437, 'Tom & Amy', 'couples', 5, 'Absolutely loved this place! The sunset view from the terrace is breathtaking. Will definitely come back!', 'positive', 28, '2024-10-22', '2024-10-23 08:15:00'),
(437, 'Jennifer S.', 'families', 3, 'Nice location but a bit pricey for what you get. Kids menu is limited.', 'neutral', 9, '2024-10-08', '2024-10-09 13:45:00'),
(437, 'Mike P.', 'solo', 4, 'Great local cuisine. Enjoyed the authentic Spanish dishes. Service staff very friendly.', 'positive', 15, '2024-10-17', '2024-10-17 20:10:00'),
(437, 'Rachel & Co.', 'friends', 4, 'Fun atmosphere for a group outing. Live music on weekends is a bonus!', 'positive', 21, '2024-10-19', '2024-10-20 10:30:00');

-- Insert reviews for POI ID 454 (Sant Joan Market)
INSERT INTO reviews (poi_id, user_name, travel_party_type, rating, review_text, sentiment, helpful_count, visit_date, created_at) VALUES
(454, 'Carlos M.', 'families', 5, 'Fantastic market! Fresh produce and local delicacies. Kids loved the fruit stalls.', 'positive', 19, '2024-10-14', '2024-10-15 09:20:00'),
(454, 'Anna B.', 'solo', 4, 'Great variety of vendors. Perfect for solo travelers looking for authentic local food.', 'positive', 14, '2024-10-11', '2024-10-12 11:30:00'),
(454, 'Peter & Jane', 'couples', 3, 'Nice market but can get very crowded on weekends. Go early morning for best experience.', 'neutral', 11, '2024-10-16', '2024-10-17 14:00:00'),
(454, 'Sophie L.', 'friends', 5, 'Amazing food tour with friends! So many unique items to try. Highly recommend the cheese stall!', 'positive', 26, '2024-10-21', '2024-10-22 12:15:00'),
(454, 'Robert K.', 'business', 2, 'Too noisy and chaotic for a business meeting. Better options available in the area.', 'negative', 3, '2024-10-09', '2024-10-10 16:00:00');

-- Insert reviews for POI ID 507 (Bellver Castle)
INSERT INTO reviews (poi_id, user_name, travel_party_type, rating, review_text, sentiment, helpful_count, visit_date, created_at) VALUES
(507, 'Jessica T.', 'families', 5, 'Incredible castle with stunning panoramic views! Kids loved exploring the courtyard and museum. Educational and fun!', 'positive', 42, '2024-10-13', '2024-10-14 10:00:00'),
(507, 'William H.', 'solo', 4, 'Beautiful historical site. The circular architecture is unique. Allow 2-3 hours for full visit.', 'positive', 33, '2024-10-15', '2024-10-16 15:30:00'),
(507, 'Maria & Diego', 'couples', 5, 'Perfect romantic spot! Sunset from the castle is unforgettable. Worth the climb!', 'positive', 38, '2024-10-18', '2024-10-19 09:45:00'),
(507, 'James & Team', 'friends', 4, 'Great group activity. Lots of photo opportunities. The forest walk around is peaceful.', 'positive', 27, '2024-10-20', '2024-10-21 11:20:00'),
(507, 'Patricia W.', 'families', 3, 'Nice castle but not much for very young children. Museum is interesting for older kids and adults.', 'neutral', 16, '2024-10-12', '2024-10-13 13:50:00'),
(507, 'George F.', 'solo', 5, 'Must-visit in Palma! Rich history and amazing views. Audio guide is very informative.', 'positive', 29, '2024-10-23', '2024-10-24 08:30:00');
