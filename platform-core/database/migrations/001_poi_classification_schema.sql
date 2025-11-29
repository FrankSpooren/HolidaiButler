-- POI Classification System - Database Schema
-- Migration: 001 - POI Classification Tables

-- Main POI table (migrated from MongoDB to MySQL)
CREATE TABLE IF NOT EXISTS pois (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category ENUM('food_drinks', 'museum', 'beach', 'historical', 'routes', 'healthcare', 'shopping', 'activities', 'accommodation', 'nightlife') NOT NULL,

    -- Location
    address TEXT,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'Netherlands',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),

    -- Classification (AI-driven tier system)
    tier TINYINT DEFAULT 4 COMMENT '1=realtime, 2=daily, 3=weekly, 4=monthly',
    poi_score DECIMAL(4, 2) DEFAULT 0.00 COMMENT 'Weighted score 0-10',

    -- Score Components (updated by aggregation service)
    review_count INT DEFAULT 0 COMMENT 'Last 24 months',
    average_rating DECIMAL(3, 2) DEFAULT 0.00 COMMENT 'Last 24 months, 0-5 scale',
    tourist_relevance DECIMAL(3, 2) DEFAULT 0.00 COMMENT '0-10 scale',
    booking_frequency INT DEFAULT 0 COMMENT 'Monthly average',

    -- External IDs (for data aggregation)
    google_place_id VARCHAR(255) UNIQUE,
    tripadvisor_id VARCHAR(255),
    thefork_id VARCHAR(255),
    booking_com_id VARCHAR(255),
    getyourguide_id VARCHAR(255),

    -- Status
    verified BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    last_scraped_at DATETIME,
    last_classified_at DATETIME,
    next_update_at DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_tier (tier),
    INDEX idx_category (category),
    INDEX idx_city (city),
    INDEX idx_score (poi_score DESC),
    INDEX idx_next_update (next_update_at),
    INDEX idx_location (latitude, longitude),
    FULLTEXT INDEX idx_search (name, description, address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- POI Score History (track changes over time)
CREATE TABLE IF NOT EXISTS poi_score_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    poi_id CHAR(36) NOT NULL,

    -- Score data
    poi_score DECIMAL(4, 2) NOT NULL,
    review_count INT,
    average_rating DECIMAL(3, 2),
    tourist_relevance DECIMAL(3, 2),
    booking_frequency INT,

    -- Tier change tracking
    old_tier TINYINT,
    new_tier TINYINT,

    -- Metadata
    calculation_method VARCHAR(50) DEFAULT 'weighted_average',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
    INDEX idx_poi_date (poi_id, createdAt DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- POI Data Sources (multi-source aggregation)
CREATE TABLE IF NOT EXISTS poi_data_sources (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    poi_id CHAR(36) NOT NULL,

    -- Source info
    source_name ENUM('google_places', 'tripadvisor', 'thefork', 'trustpilot', 'booking_com', 'getyourguide', 'airbnb', 'viator', 'mindtrip') NOT NULL,
    source_id VARCHAR(255) NOT NULL COMMENT 'External ID at source',
    source_url TEXT,

    -- Source data
    rating DECIMAL(3, 2),
    review_count INT,
    price_level TINYINT COMMENT '1-4 scale',
    ranking INT COMMENT 'Position in category/city',

    -- Raw data (JSON)
    raw_data JSON,

    -- Status
    last_scraped_at DATETIME,
    scrape_status ENUM('pending', 'success', 'failed', 'rate_limited') DEFAULT 'pending',
    scrape_error TEXT,

    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
    UNIQUE KEY unique_poi_source (poi_id, source_name),
    INDEX idx_poi_source (poi_id, source_name),
    INDEX idx_last_scraped (last_scraped_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- POI Top Attractions (from external datasets)
CREATE TABLE IF NOT EXISTS poi_top_attractions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    poi_id CHAR(36) NOT NULL,

    -- Ranking data
    city VARCHAR(100) NOT NULL,
    ranking_position INT NOT NULL,
    total_in_category INT,

    -- Source
    source ENUM('tripadvisor', 'getyourguide', 'booking_com', 'airbnb', 'mindtrip') NOT NULL,
    category VARCHAR(100),

    -- Relevance boost
    relevance_boost DECIMAL(3, 2) DEFAULT 0.00 COMMENT 'Added to tourist_relevance score',

    -- Validity
    valid_from DATE,
    valid_until DATE,

    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
    INDEX idx_city_ranking (city, ranking_position),
    INDEX idx_validity (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Usage Tracking (budget monitoring)
CREATE TABLE IF NOT EXISTS api_usage_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    -- API details
    service_name ENUM('apify', 'google_places', 'tripadvisor', 'thefork', 'other') NOT NULL,
    endpoint VARCHAR(255),
    actor_id VARCHAR(100) COMMENT 'Apify actor ID',

    -- Usage
    operation_type ENUM('scrape', 'search', 'details', 'batch') NOT NULL,
    items_processed INT DEFAULT 1,

    -- Cost tracking
    credits_used DECIMAL(10, 4) DEFAULT 0.0000,
    estimated_cost_eur DECIMAL(10, 4) DEFAULT 0.0000,

    -- Performance
    duration_seconds INT,
    status ENUM('success', 'failed', 'partial', 'rate_limited') NOT NULL,
    error_message TEXT,

    -- Context
    poi_id CHAR(36),
    triggered_by VARCHAR(100) COMMENT 'workflow name or user',

    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_service_date (service_name, createdAt DESC),
    INDEX idx_cost_date (createdAt DESC, estimated_cost_eur),
    INDEX idx_poi (poi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Budget Monitoring
CREATE TABLE IF NOT EXISTS budget_monitoring (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    -- Period
    year INT NOT NULL,
    month TINYINT NOT NULL,

    -- Budget
    budget_limit_eur DECIMAL(10, 2) DEFAULT 50.00,
    total_spent_eur DECIMAL(10, 2) DEFAULT 0.00,

    -- Usage breakdown
    apify_cost_eur DECIMAL(10, 2) DEFAULT 0.00,
    other_apis_cost_eur DECIMAL(10, 2) DEFAULT 0.00,

    -- Stats
    total_api_calls INT DEFAULT 0,
    total_pois_updated INT DEFAULT 0,

    -- Status
    budget_exceeded BOOLEAN DEFAULT FALSE,
    alert_sent BOOLEAN DEFAULT FALSE,

    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_period (year, month),
    INDEX idx_period (year DESC, month DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- POI Classification Queue (for batch processing)
CREATE TABLE IF NOT EXISTS poi_classification_queue (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    poi_id CHAR(36) NOT NULL,

    -- Priority
    tier TINYINT NOT NULL,
    priority INT DEFAULT 0 COMMENT 'Higher = more urgent',

    -- Status
    status ENUM('pending', 'processing', 'completed', 'failed', 'skipped') DEFAULT 'pending',

    -- Scheduling
    scheduled_for DATETIME NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,

    -- Results
    new_score DECIMAL(4, 2),
    new_tier TINYINT,
    error_message TEXT,

    -- Metadata
    triggered_by VARCHAR(100),
    attempt_count TINYINT DEFAULT 0,

    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
    INDEX idx_status_scheduled (status, scheduled_for),
    INDEX idx_tier_priority (tier, priority DESC),
    INDEX idx_poi (poi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial budget for current month
INSERT INTO budget_monitoring (year, month, budget_limit_eur)
VALUES (YEAR(NOW()), MONTH(NOW()), 50.00)
ON DUPLICATE KEY UPDATE budget_limit_eur = 50.00;
