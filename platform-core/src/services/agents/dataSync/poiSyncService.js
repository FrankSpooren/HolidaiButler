/**
 * POI Sync Service
 * Handles synchronization of POI data using Apify
 * Bronze → Silver → Gold pipeline with quality checkpoints
 *
 * @module agents/dataSync/poiSyncService
 */

import apifyIntegration from "./apifyIntegration.js";
import poiTierManager from "./poiTierManager.js";
import imageDownloaderService from "../../imageDownloader.js";
import { logAgent, logError } from "../../orchestrator/auditTrail/index.js";

class POISyncService {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  // ═══════════════════════════════════════════════════════
  // QUALITY CHECKPOINT 1: Data Validation
  // ═══════════════════════════════════════════════════════

  validateRawData(data) {
    const warnings = [];
    if (data.permanentlyClosed) warnings.push('PERMANENT_CLOSED');
    if (data.temporarilyClosed) warnings.push('TEMPORARILY_CLOSED');
    if (!data.totalScore && !data.reviewsCount) warnings.push('NO_RATING_DATA');
    if (data.totalScore && (data.totalScore < 0 || data.totalScore > 5)) warnings.push('INVALID_RATING');
    if (data.reviewsCount && data.reviewsCount < 0) warnings.push('INVALID_REVIEW_COUNT');

    return {
      status: warnings.some(w => w.startsWith('PERMANENT') || w.startsWith('INVALID'))
        ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
      notes: warnings.length > 0 ? warnings.join(', ') : null
    };
  }

  // ═══════════════════════════════════════════════════════
  // QUALITY CHECKPOINT 2: Significant Change Detection
  // ═══════════════════════════════════════════════════════

  async detectSignificantChanges(poiId, apifyData) {
    const [current] = await this.sequelize.query(
      'SELECT rating, review_count, is_active FROM POI WHERE id = ?',
      { replacements: [poiId] }
    );
    if (!current.length) return [];

    const poi = current[0];
    const changes = [];

    if (poi.rating && apifyData.totalScore &&
        Math.abs(parseFloat(poi.rating) - apifyData.totalScore) >= 0.5) {
      changes.push(`RATING_CHANGE: ${poi.rating} → ${apifyData.totalScore}`);
    }
    if (apifyData.permanentlyClosed && poi.is_active) {
      changes.push('NOW_PERMANENTLY_CLOSED');
    }
    if (apifyData.temporarilyClosed) {
      changes.push('NOW_TEMPORARILY_CLOSED');
    }

    return changes;
  }

  // ═══════════════════════════════════════════════════════
  // BRONZE LAYER: Raw Data Storage
  // ═══════════════════════════════════════════════════════

  async saveRawData(poiId, googlePlaceid, destinationId, apifyData) {
    const scrapedAt = apifyData.scrapedAt ? new Date(apifyData.scrapedAt) : new Date();
    const { status, notes } = this.validateRawData(apifyData);

    await this.sequelize.query(`
      INSERT INTO poi_apify_raw
        (poi_id, google_placeid, destination_id,
         raw_json, google_rating, google_review_count,
         permanently_closed, temporarily_closed, images_count,
         validation_status, validation_notes, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        poiId, googlePlaceid, destinationId,
        JSON.stringify(apifyData),
        apifyData.totalScore || null,
        apifyData.reviewsCount || null,
        apifyData.permanentlyClosed ? 1 : 0,
        apifyData.temporarilyClosed ? 1 : 0,
        apifyData.imagesCount || null,
        status, notes, scrapedAt
      ]
    });

    return { status, notes, scrapedAt };
  }

  // ═══════════════════════════════════════════════════════
  // SILVER LAYER: Review Extraction
  // ═══════════════════════════════════════════════════════

  async extractReviews(poiId, destinationId, apifyReviews) {
    if (!apifyReviews || apifyReviews.length === 0) return 0;

    let inserted = 0;
    for (const review of apifyReviews) {
      if (!review.reviewId) continue;

      const [existing] = await this.sequelize.query(
        'SELECT id FROM reviews WHERE google_review_id = ?',
        { replacements: [review.reviewId] }
      );

      if (existing.length === 0) {
        let ratingVal = review.stars || review.rating || null;
        // Handle "5/5" format ratings
        if (ratingVal && typeof ratingVal === 'string' && ratingVal.includes('/')) {
          const [num, denom] = ratingVal.split('/');
          ratingVal = Math.round((parseFloat(num) / parseFloat(denom)) * 5) || 3;
        }
        if (ratingVal) ratingVal = Math.max(1, Math.min(5, Math.round(parseFloat(ratingVal))));
        const sentiment = ratingVal >= 4 ? 'positive' : (ratingVal <= 2 ? 'negative' : 'neutral');

        await this.sequelize.query(`
          INSERT INTO reviews (poi_id, destination_id, user_name, rating, sentiment,
            travel_party_type, review_text, visit_date, google_review_id, source, created_at)
          VALUES (?, ?, ?, ?, ?, 'solo', ?, ?, ?, 'apify', ?)
        `, {
          replacements: [
            poiId, destinationId || 1,
            review.name || 'Anonymous',
            ratingVal || 3,
            sentiment,
            review.text || review.textTranslated || '',
            review.publishedAtDate ? new Date(review.publishedAtDate) : new Date(),
            review.reviewId,
            review.publishedAtDate ? new Date(review.publishedAtDate) : new Date()
          ]
        });
        inserted++;
      }
    }
    return inserted;
  }

  // ═══════════════════════════════════════════════════════
  // QUALITY CHECKPOINT 3: Freshness Score Update
  // ═══════════════════════════════════════════════════════

  async updateFreshnessScore(poiId) {
    await this.sequelize.query(`
      UPDATE POI SET
        content_freshness_score = 100,
        content_freshness_status = 'fresh'
      WHERE id = ?
    `, { replacements: [poiId] });
  }

  // ═══════════════════════════════════════════════════════
  // IMAGE DOWNLOAD: Download Apify images to local storage
  // ═══════════════════════════════════════════════════════

  async downloadNewImages(poiId, destinationId, googlePlaceid, apifyData) {
    try {
      // Collect all image URLs from Apify output
      const imageUrls = [];

      // 1. imageUrls array (primary — when maxImages > 0)
      if (Array.isArray(apifyData.imageUrls)) {
        for (const url of apifyData.imageUrls) {
          if (typeof url === 'string' && url.startsWith('http')) imageUrls.push(url);
        }
      }

      // 2. imageUrl (single main image — always present)
      if (apifyData.imageUrl && typeof apifyData.imageUrl === 'string' && !imageUrls.includes(apifyData.imageUrl)) {
        imageUrls.push(apifyData.imageUrl);
      }

      if (imageUrls.length === 0) return 0;

      // Check which URLs are already downloaded
      const [existing] = await this.sequelize.query(
        'SELECT image_url FROM imageurls WHERE poi_id = ?',
        { replacements: [poiId] }
      );
      const existingUrls = new Set(existing.map(r => r.image_url));

      let downloaded = 0;
      const maxDisplay = Math.min(imageUrls.length, 10); // Max 10 per POI

      for (let i = 0; i < maxDisplay; i++) {
        const url = imageUrls[i];
        if (existingUrls.has(url)) continue;

        try {
          const result = await imageDownloaderService.downloadImage(url, poiId);
          if (result && result.local_path) {
            const displayOrder = existing.length + downloaded + 1;
            await this.sequelize.query(`
              INSERT INTO imageurls (poi_id, image_url, local_path, source, google_place_id, file_size, file_hash, display_order, downloaded_at)
              VALUES (?, ?, ?, 'apify_refresh', ?, ?, ?, ?, NOW())
            `, {
              replacements: [
                poiId, url, result.local_path, googlePlaceid || null,
                result.file_size || null, result.file_hash || null, displayOrder
              ]
            });
            downloaded++;
          }
        } catch (imgErr) {
          // Skip broken images silently — don't fail the whole sync
          console.log(`[POISyncService] Image download failed for POI ${poiId}: ${imgErr.message}`);
        }
      }

      if (downloaded > 0) {
        console.log(`[POISyncService] Downloaded ${downloaded} new images for POI ${poiId}`);
      }
      return downloaded;
    } catch (error) {
      console.error(`[POISyncService] Image download error for POI ${poiId}:`, error.message);
      return 0;
    }
  }

  // ═══════════════════════════════════════════════════════
  // SILVER LAYER: Full POI Update (Bronze + Silver)
  // ═══════════════════════════════════════════════════════

  async updatePOI(poiId, apifyData, destinationId) {
    const transformed = apifyIntegration.transformToHolidaiButlerFormat(apifyData);

    // ── Bronze: save complete raw JSON ──
    const rawResult = await this.saveRawData(
      poiId,
      transformed.google_placeid || apifyData.placeId || '',
      destinationId || 1,
      apifyData
    );

    // ── Checkpoint 2: detect significant changes ──
    const changes = await this.detectSignificantChanges(poiId, apifyData);
    if (changes.length > 0) {
      console.log(`[POISyncService] ⚠️ POI ${poiId} significant changes: ${changes.join(', ')}`);
      await logAgent('data-sync', 'significant_change_detected', {
        description: `POI ${poiId}: ${changes.join(', ')}`,
        metadata: { poiId, changes }
      });
    }

    // ── Silver: extract structured data ──
    const additionalInfo = apifyData.additionalInfo || {};
    const amenitiesJson = JSON.stringify(additionalInfo.Amenities || additionalInfo.amenities || []);
    const accessibilityJson = JSON.stringify(additionalInfo.Accessibility || additionalInfo.accessibility || []);
    const parkingJson = JSON.stringify(additionalInfo.Parking || additionalInfo.parking || []);
    const serviceOptionsJson = JSON.stringify(additionalInfo['Service options'] || []);
    const reviewsDistJson = apifyData.reviewsDistribution ? JSON.stringify(apifyData.reviewsDistribution) : null;
    const reviewTagsJson = apifyData.reviewsTags && apifyData.reviewsTags.length > 0 ? JSON.stringify(apifyData.reviewsTags) : null;
    const popularTimesJson = apifyData.popularTimesHistogram ? JSON.stringify(apifyData.popularTimesHistogram) : null;
    const peopleAlsoSearch = (apifyData.peopleAlsoSearch || [])
      .map(p => ({ title: p.title, score: p.totalScore, reviews: p.reviewsCount }));
    const peopleAlsoJson = peopleAlsoSearch.length > 0 ? JSON.stringify(peopleAlsoSearch) : null;

    // Social media extraction
    const instagram = (apifyData.instagrams || [])[0] || null;
    const facebook = (apifyData.facebooks || [])[0] || null;
    const email = (apifyData.emails || [])[0] || null;

    // Price level: parse "€10–20" format → 1-4 scale
    let priceLevel = null;
    if (apifyData.price) {
      const priceStr = String(apifyData.price);
      const dollarSigns = (priceStr.match(/[€$£]/g) || []).length;
      if (dollarSigns >= 1) {
        priceLevel = Math.min(dollarSigns, 4);
      } else {
        // Parse numeric: <10=1, 10-25=2, 25-50=3, >50=4
        const nums = priceStr.match(/\d+/g);
        if (nums) {
          const avg = nums.reduce((s, n) => s + parseInt(n), 0) / nums.length;
          priceLevel = avg < 10 ? 1 : avg < 25 ? 2 : avg < 50 ? 3 : 4;
        }
      }
    }

    // Booking & reservation URLs
    const reservationUrl = apifyData.reserveTableUrl || null;
    const bookingUrl = (apifyData.bookingLinks || []).find(l => l?.url)?.url || null;
    const menuUrl = apifyData.menu || null;
    const googleCategory = apifyData.categoryName || (apifyData.categories || [])[0] || null;

    // Live busyness
    const liveBusynessText = apifyData.popularTimesLiveText || null;
    const liveBusynessPercent = apifyData.popularTimesLivePercent || null;

    // is_active: deactivate if permanently closed
    const isActive = apifyData.permanentlyClosed ? 0 : (transformed.is_active ? 1 : 0);

    await this.sequelize.query(`
      UPDATE POI SET
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        website = COALESCE(?, website),
        email = COALESCE(?, email),
        rating = COALESCE(?, rating),
        review_count = COALESCE(?, review_count),
        google_rating = COALESCE(?, google_rating),
        google_review_count = COALESCE(?, google_review_count),
        opening_hours = COALESCE(?, opening_hours),
        opening_hours_json = COALESCE(?, opening_hours_json),
        amenities = COALESCE(?, amenities),
        accessibility_features = COALESCE(?, accessibility_features),
        parking_info = ?,
        service_options = ?,
        reviews_distribution = ?,
        review_tags = ?,
        popular_times_json = ?,
        people_also_search = ?,
        instagram_url = COALESCE(?, instagram_url),
        facebook_url = COALESCE(?, facebook_url),
        price_level = COALESCE(?, price_level),
        menu_url = COALESCE(?, menu_url),
        booking_url = COALESCE(?, booking_url),
        reservation_url = COALESCE(?, reservation_url),
        google_category = COALESCE(?, google_category),
        live_busyness_text = ?,
        live_busyness_percent = ?,
        is_active = ?,
        last_updated = NOW(),
        content_updated_at = NOW(),
        last_apify_sync = NOW()
      WHERE id = ?
    `, {
      replacements: [
        transformed.address, transformed.phone, transformed.website, email,
        transformed.rating, transformed.review_count,
        apifyData.totalScore || null, apifyData.reviewsCount || null,
        transformed.opening_hours,
        apifyData.openingHours ? JSON.stringify(apifyData.openingHours) : null,
        amenitiesJson !== '[]' ? amenitiesJson : null,
        accessibilityJson !== '[]' ? accessibilityJson : null,
        parkingJson !== '[]' ? parkingJson : null,
        serviceOptionsJson !== '[]' ? serviceOptionsJson : null,
        reviewsDistJson, reviewTagsJson, popularTimesJson, peopleAlsoJson,
        instagram, facebook,
        priceLevel, menuUrl, bookingUrl, reservationUrl, googleCategory,
        liveBusynessText, liveBusynessPercent,
        isActive,
        poiId
      ]
    });

    // ── Silver: extract reviews ──
    const newReviews = await this.extractReviews(poiId, destinationId, apifyData.reviews || []);

    // ── Mark raw record as processed ──
    await this.sequelize.query(
      `UPDATE poi_apify_raw SET processed_at = NOW() WHERE poi_id = ? ORDER BY id DESC LIMIT 1`,
      { replacements: [poiId] }
    );

    // ── Checkpoint 3: update freshness score ──
    await this.updateFreshnessScore(poiId);

    console.log(`[POISyncService] Updated POI ${poiId}: ${transformed.name} (bronze+silver, ${rawResult.status}${newReviews > 0 ? `, +${newReviews} reviews` : ''})`);
  }

  // ═══════════════════════════════════════════════════════
  // TIER-BASED SYNC ORCHESTRATION
  // ═══════════════════════════════════════════════════════

  async syncPOIsByTier(tier, destination = "Calpe, Spain") {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized - call setSequelize first");
    }

    const tierConfig = poiTierManager.getTierConfig()[tier];
    console.log(`[POISyncService] Starting tier ${tier} sync for ${destination} (max ${tierConfig.maxPOIs || 'unlimited'} POIs)`);

    try {
      const poisToUpdate = await poiTierManager.getPOIsForUpdate(this.sequelize, tier);
      console.log(`[POISyncService] Found ${poisToUpdate.length} tier ${tier} POIs to update`);

      if (poisToUpdate.length === 0) {
        return { updated: 0, tier, destination, message: "No POIs to update" };
      }

      let totalUpdated = 0;
      const batchSize = 10;
      const errors = [];

      for (let i = 0; i < poisToUpdate.length; i += batchSize) {
        const batch = poisToUpdate.slice(i, i + batchSize);

        for (const poi of batch) {
          try {
            if (poi.google_placeid) {
              const details = await apifyIntegration.getPlaceDetails(poi.google_placeid);
              if (details) {
                await this.updatePOI(poi.id, details, poi.destination_id);
                // Download new images from Apify output
                await this.downloadNewImages(poi.id, poi.destination_id, poi.google_placeid, details);
                totalUpdated++;
              }
            }
          } catch (error) {
            if (error.message.includes("budget")) {
              console.log("[POISyncService] Budget exceeded - stopping sync");
              await logAgent("data-sync", "sync_stopped_budget", {
                description: `Tier ${tier} sync stopped: budget exceeded`,
                metadata: { tier, updated: totalUpdated, remaining: poisToUpdate.length - i }
              });
              return { updated: totalUpdated, tier, destination, stopped: "budget" };
            }
            errors.push({ poiId: poi.id, error: error.message });
            console.error(`[POISyncService] Error updating POI ${poi.id}:`, error.message);
          }
        }

        // Rate limiting between batches
        if (i + batchSize < poisToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      await logAgent("data-sync", "tier_sync_complete", {
        description: `Tier ${tier} sync: updated ${totalUpdated}/${poisToUpdate.length} POIs`,
        metadata: { tier, destination, updated: totalUpdated, total: poisToUpdate.length, errors: errors.length }
      });

      console.log(`[POISyncService] Tier ${tier} sync complete: ${totalUpdated} updated`);

      return {
        updated: totalUpdated,
        tier,
        destination,
        total: poisToUpdate.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      await logError("data-sync", error, { tier, destination });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════
  // POI DISCOVERY
  // ═══════════════════════════════════════════════════════

  async discoverNewPOIs(destination, categories) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    console.log(`[POISyncService] Discovering new POIs in ${destination}`);

    const newPOIs = await apifyIntegration.searchPlaces(destination, categories, {
      maxResults: 100,
      skipClosed: true
    });

    let added = 0;
    let skipped = 0;

    for (const place of newPOIs) {
      const [existing] = await this.sequelize.query(
        "SELECT id FROM POI WHERE google_placeid = ?",
        { replacements: [place.placeId] }
      );

      if (existing.length === 0) {
        const transformed = apifyIntegration.transformToHolidaiButlerFormat(place);

        await this.sequelize.query(`
          INSERT INTO POI (
            google_placeid, name, address, latitude, longitude,
            phone, website, category, subcategory, rating,
            review_count, price_level, opening_hours, is_active,
            city, created_at, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            transformed.google_placeid, transformed.name, transformed.address,
            transformed.latitude, transformed.longitude, transformed.phone,
            transformed.website, transformed.category, transformed.subcategory,
            transformed.rating, transformed.review_count,
            transformed.price_level, transformed.opening_hours,
            transformed.is_active ? 1 : 0, destination.split(",")[0]
          ]
        });
        added++;
      } else {
        skipped++;
      }
    }

    await logAgent("data-sync", "poi_discovery_complete", {
      description: `Discovered ${added} new POIs in ${destination}`,
      metadata: { destination, categories, found: newPOIs.length, added, skipped }
    });

    console.log(`[POISyncService] Discovery complete: ${added} added, ${skipped} already exist`);

    return { found: newPOIs.length, added, skipped, destination };
  }

  async getStatus() {
    if (!this.sequelize) {
      return { initialized: false };
    }

    const [countResult] = await this.sequelize.query(
      "SELECT COUNT(*) as total FROM POI WHERE is_active = 1 OR is_active IS NULL"
    );

    return {
      initialized: true,
      totalPOIs: countResult[0]?.total || 0,
      timestamp: new Date().toISOString()
    };
  }
}

export default new POISyncService();
