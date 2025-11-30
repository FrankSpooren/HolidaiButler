-- Migration: Add Reviews Table
-- Sprint: 7.6 - Personalized Reviews System
-- Created: 2025-11-08

-- Create enum types for travel party and sentiment
CREATE TYPE travel_party_type AS ENUM ('couples', 'families', 'solo', 'friends', 'business');
CREATE TYPE sentiment_type AS ENUM ('positive', 'neutral', 'negative');

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  poi_id INTEGER NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  travel_party_type travel_party_type NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  sentiment sentiment_type NOT NULL DEFAULT 'neutral',
  helpful_count INTEGER DEFAULT 0,
  visit_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint
  CONSTRAINT fk_poi
    FOREIGN KEY (poi_id)
    REFERENCES pois(id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_reviews_poi_id ON reviews(poi_id);
CREATE INDEX idx_reviews_travel_party ON reviews(travel_party_type);
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_helpful_count ON reviews(helpful_count DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reviews_timestamp
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_reviews_updated_at();

-- Insert mock data for testing (POI ID 437 - Ca'n Manolo)
INSERT INTO reviews (poi_id, user_name, travel_party_type, rating, review_text, sentiment, helpful_count, visit_date, created_at) VALUES
(437, 'Sarah M.', 'couples', 5, 'Amazing restaurant with stunning views! The paella was exceptional and the service was impeccable. Perfect for a romantic dinner.', 'positive', 24, '2024-10-15', '2024-10-16T10:30:00Z'),
(437, 'John & Family', 'families', 4, 'Great place for families. Kids enjoyed the playground area while we waited for food. Menu has good variety.', 'positive', 18, '2024-10-10', '2024-10-11T14:20:00Z'),
(437, 'Mark T.', 'solo', 3, 'Food was decent but service was a bit slow. Good for solo dining, quiet atmosphere.', 'neutral', 7, '2024-10-05', '2024-10-06T09:15:00Z'),
(437, 'Emma & Friends', 'friends', 5, 'Best tapas in the area! We had a fantastic time with our group. The sangria was delicious and the portions were generous.', 'positive', 31, '2024-10-20', '2024-10-21T16:45:00Z'),
(437, 'David R.', 'business', 4, 'Good spot for a business lunch. Professional atmosphere, quick service. WiFi available.', 'positive', 12, '2024-10-18', '2024-10-18T19:30:00Z'),
(437, 'Lisa K.', 'couples', 2, 'Disappointing experience. The food was cold when it arrived and we waited over an hour. Not what we expected.', 'negative', 5, '2024-10-12', '2024-10-13T11:00:00Z'),
(437, 'Tom & Amy', 'couples', 5, 'Absolutely loved this place! The sunset view from the terrace is breathtaking. Will definitely come back!', 'positive', 28, '2024-10-22', '2024-10-23T08:15:00Z'),
(437, 'Jennifer S.', 'families', 3, 'Nice location but a bit pricey for what you get. Kids menu is limited.', 'neutral', 9, '2024-10-08', '2024-10-09T13:45:00Z'),
(437, 'Mike P.', 'solo', 4, 'Great local cuisine. Enjoyed the authentic Spanish dishes. Service staff very friendly.', 'positive', 15, '2024-10-17', '2024-10-17T20:10:00Z'),
(437, 'Rachel & Co.', 'friends', 4, 'Fun atmosphere for a group outing. Live music on weekends is a bonus!', 'positive', 21, '2024-10-19', '2024-10-20T10:30:00Z');

-- Add more reviews for POI ID 454 (Sant Joan Market)
INSERT INTO reviews (poi_id, user_name, travel_party_type, rating, review_text, sentiment, helpful_count, visit_date, created_at) VALUES
(454, 'Carlos M.', 'families', 5, 'Fantastic market! Fresh produce and local delicacies. Kids loved the fruit stalls.', 'positive', 19, '2024-10-14', '2024-10-15T09:20:00Z'),
(454, 'Anna B.', 'solo', 4, 'Great variety of vendors. Perfect for solo travelers looking for authentic local food.', 'positive', 14, '2024-10-11', '2024-10-12T11:30:00Z'),
(454, 'Peter & Jane', 'couples', 3, 'Nice market but can get very crowded on weekends. Go early morning for best experience.', 'neutral', 11, '2024-10-16', '2024-10-17T14:00:00Z'),
(454, 'Sophie L.', 'friends', 5, 'Amazing food tour with friends! So many unique items to try. Highly recommend the cheese stall!', 'positive', 26, '2024-10-21', '2024-10-22T12:15:00Z'),
(454, 'Robert K.', 'business', 2, 'Too noisy and chaotic for a business meeting. Better options available in the area.', 'negative', 3, '2024-10-09', '2024-10-10T16:00:00Z');

-- Add reviews for POI ID 507 (Bellver Castle)
INSERT INTO reviews (poi_id, user_name, travel_party_type, rating, review_text, sentiment, helpful_count, visit_date, created_at) VALUES
(507, 'Jessica T.', 'families', 5, 'Incredible castle with stunning panoramic views! Kids loved exploring the courtyard and museum. Educational and fun!', 'positive', 42, '2024-10-13', '2024-10-14T10:00:00Z'),
(507, 'William H.', 'solo', 4, 'Beautiful historical site. The circular architecture is unique. Allow 2-3 hours for full visit.', 'positive', 33, '2024-10-15', '2024-10-16T15:30:00Z'),
(507, 'Maria & Diego', 'couples', 5, 'Perfect romantic spot! Sunset from the castle is unforgettable. Worth the climb!', 'positive', 38, '2024-10-18', '2024-10-19T09:45:00Z'),
(507, 'James & Team', 'friends', 4, 'Great group activity. Lots of photo opportunities. The forest walk around is peaceful.', 'positive', 27, '2024-10-20', '2024-10-21T11:20:00Z'),
(507, 'Patricia W.', 'families', 3, 'Nice castle but not much for very young children. Museum is interesting for older kids and adults.', 'neutral', 16, '2024-10-12', '2024-10-13T13:50:00Z'),
(507, 'George F.', 'solo', 5, 'Must-visit in Palma! Rich history and amazing views. Audio guide is very informative.', 'positive', 29, '2024-10-23', '2024-10-24T08:30:00Z');

COMMENT ON TABLE reviews IS 'User reviews for POIs with travel party type and sentiment analysis';
COMMENT ON COLUMN reviews.poi_id IS 'Foreign key reference to the POI being reviewed';
COMMENT ON COLUMN reviews.travel_party_type IS 'Type of travel party: couples, families, solo, friends, or business';
COMMENT ON COLUMN reviews.sentiment IS 'Automated or manual sentiment classification';
COMMENT ON COLUMN reviews.helpful_count IS 'Number of users who found this review helpful';
