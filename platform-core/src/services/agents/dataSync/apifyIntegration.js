/**
 * Apify Integration
 * Handles Google Places data fetching with budget management
 *
 * Budget: €100/maand
 *
 * @module agents/dataSync/apifyIntegration
 */

import { ApifyClient } from "apify-client";
import { logAgent, logError } from "../../orchestrator/auditTrail/index.js";
import { logCost, getCosts } from "../../orchestrator/costController/index.js";
import { sendAlert } from "../../orchestrator/ownerInterface/index.js";

const APIFY_MONTHLY_BUDGET = 100; // €100/maand
const BUDGET_WARNING_THRESHOLD = 0.90; // Warn at 90%

class ApifyIntegration {
  constructor() {
    this.client = null;
    this.actorId = "compass/crawler-google-places";
  }

  getClient() {
    if (!this.client) {
      const token = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
      if (!token) {
        throw new Error("APIFY_TOKEN not configured");
      }
      this.client = new ApifyClient({ token });
    }
    return this.client;
  }

  async checkBudget() {
    try {
      const costs = await getCosts();
      const apifyCost = costs.apify?.spent || 0;
      const percentageUsed = apifyCost / APIFY_MONTHLY_BUDGET;

      if (percentageUsed >= 1.0) {
        console.log("[Apify] Budget exceeded - blocking API calls");
        await sendAlert({
          urgency: 4,
          title: "Apify Budget Exceeded",
          message: `Apify budget 100% gebruikt (€${apifyCost.toFixed(2)}/€${APIFY_MONTHLY_BUDGET}). Sync gepauzeerd.`
        });
        return { allowed: false, reason: "budget_exceeded", percentageUsed };
      }

      if (percentageUsed >= BUDGET_WARNING_THRESHOLD) {
        await sendAlert({
          urgency: 3,
          title: "Apify Budget Warning",
          message: `Apify budget op ${(percentageUsed * 100).toFixed(1)}%`
        });
      }

      return { allowed: true, percentageUsed, remaining: APIFY_MONTHLY_BUDGET - apifyCost };
    } catch (error) {
      console.error("[Apify] Budget check error:", error.message);
      // Allow if we cannot check (fail open for development)
      return { allowed: true, percentageUsed: 0, error: error.message };
    }
  }

  async searchPlaces(location, searchTerms, options = {}) {
    const budgetCheck = await this.checkBudget();
    if (!budgetCheck.allowed) {
      throw new Error(`Apify budget exceeded: ${budgetCheck.reason}`);
    }

    const { maxResults = 50, language = "en", skipClosed = true } = options;

    console.log(`[Apify] Searching "${searchTerms.join(", ")}" in ${location}`);

    try {
      const input = {
        searchStringsArray: searchTerms,
        locationQuery: location,
        maxCrawledPlacesPerSearch: maxResults,
        language,
        skipClosedPlaces: skipClosed,
        scrapePlaceDetailPage: true,
        maxReviews: 5,
        reviewsSort: "newest"
      };

      const run = await this.getClient().actor(this.actorId).call(input);
      const { items } = await this.getClient().dataset(run.defaultDatasetId).listItems();

      // Estimate cost: ~€0.002 per result
      const estimatedCost = items.length * 0.002;
      await logCost("apify", "google_places_search", estimatedCost, {
        location,
        searchTerms,
        resultsCount: items.length
      });

      await logAgent("data-sync", "apify_search_complete", {
        description: `Found ${items.length} places in ${location}`,
        metadata: { location, results: items.length, cost: estimatedCost }
      });

      console.log(`[Apify] Found ${items.length} places (est. cost: €${estimatedCost.toFixed(3)})`);

      return items;
    } catch (error) {
      await logError("apify", error, { location, searchTerms });
      throw error;
    }
  }

  async getPlaceDetails(placeId) {
    const budgetCheck = await this.checkBudget();
    if (!budgetCheck.allowed) {
      throw new Error("Apify budget exceeded");
    }

    console.log(`[Apify] Getting details for place: ${placeId}`);

    try {
      const input = {
        startUrls: [{ url: `https://www.google.com/maps/place/?q=place_id:${placeId}` }],
        scrapePlaceDetailPage: true,
        maxReviews: 10,
        reviewsSort: "newest",
        scrapeContacts: true
      };

      const run = await this.getClient().actor(this.actorId).call(input);
      const { items } = await this.getClient().dataset(run.defaultDatasetId).listItems();

      // Estimate cost: ~€0.005 per detail fetch
      await logCost("apify", "place_details", 0.005, { placeId });

      return items[0] || null;
    } catch (error) {
      await logError("apify", error, { placeId });
      throw error;
    }
  }

  transformToHolidaiButlerFormat(apifyPlace) {
    return {
      google_placeid: apifyPlace.placeId,
      name: apifyPlace.title,
      address: apifyPlace.address,
      latitude: apifyPlace.location?.lat,
      longitude: apifyPlace.location?.lng,
      phone: apifyPlace.phone,
      website: apifyPlace.website,
      category: this.mapCategory(apifyPlace.categoryName),
      subcategory: apifyPlace.categoryName,
      rating: apifyPlace.totalScore,
      review_count: apifyPlace.reviewsCount,
      price_level: apifyPlace.priceLevel,
      opening_hours: JSON.stringify(apifyPlace.openingHours || {}),
      is_active: !apifyPlace.permanentlyClosed,
      last_updated: new Date()
    };
  }

  mapCategory(googleCategory) {
    const categoryMap = {
      "restaurant": "Food & Drinks",
      "cafe": "Food & Drinks",
      "bar": "Food & Drinks",
      "food": "Food & Drinks",
      "hotel": "Accommodation (do not communicate)",
      "lodging": "Accommodation (do not communicate)",
      "beach": "Beaches & Nature",
      "park": "Beaches & Nature",
      "nature": "Beaches & Nature",
      "museum": "Culture & History",
      "store": "Shopping",
      "shop": "Shopping",
      "spa": "Health & Wellbeing",
      "gym": "Active"
    };

    const lowerCategory = (googleCategory || "").toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) return value;
    }
    return "Practical";
  }

  async getAccountInfo() {
    try {
      const client = this.getClient();
      const user = await client.user().get();
      return {
        username: user.username,
        email: user.email,
        plan: user.plan,
        usageUsd: user.usageUsd
      };
    } catch (error) {
      console.error("[Apify] Failed to get account info:", error.message);
      return null;
    }
  }
}

export default new ApifyIntegration();
