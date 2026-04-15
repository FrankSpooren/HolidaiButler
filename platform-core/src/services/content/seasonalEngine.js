/**
 * Seasonal Engine — Content Module Fase C
 * Manages seasonal configuration transitions and homepage overrides.
 *
 * Daily check: compares current date with seasonal_config periods.
 * On season transition: updates homepage blocks (hero, featured POIs, themes).
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Get the currently active season for a destination
 * @param {number} destinationId
 * @returns {Object|null} Active season config or null
 */
export async function getCurrentSeason(destinationId) {
  const [seasons] = await mysqlSequelize.query(
    `SELECT * FROM seasonal_config
     WHERE destination_id = :destId AND is_active = 1 AND ((start_month < MONTH(CURDATE())) OR (start_month = MONTH(CURDATE()) AND start_day <= DAY(CURDATE()))) AND ((end_month > MONTH(CURDATE())) OR (end_month = MONTH(CURDATE()) AND end_day >= DAY(CURDATE())))
     ORDER BY start_month ASC, start_day ASC LIMIT 1`,
    { replacements: { destId: destinationId } }
  );
  return seasons?.[0] || null;
}

/**
 * Check all destinations for season transitions
 * Called daily by BullMQ seasonal-check job
 * @returns {Array} List of transitions detected
 */
export async function checkSeasonTransitions() {
  const transitions = [];

  // Get all destinations
  const [destinations] = await mysqlSequelize.query(
    `SELECT DISTINCT destination_id FROM seasonal_config`
  );

  for (const dest of (destinations || [])) {
    const destId = dest.destination_id;

    // Find season that should be active today
    const [activeSeasons] = await mysqlSequelize.query(
      `SELECT * FROM seasonal_config
       WHERE destination_id = :destId AND ((start_month < MONTH(CURDATE())) OR (start_month = MONTH(CURDATE()) AND start_day <= DAY(CURDATE()))) AND ((end_month > MONTH(CURDATE())) OR (end_month = MONTH(CURDATE()) AND end_day >= DAY(CURDATE())))
       ORDER BY start_month ASC, start_day ASC LIMIT 1`,
      { replacements: { destId } }
    );

    const shouldBeActive = activeSeasons?.[0] || null;

    // Find currently marked as active
    const [currentlyActive] = await mysqlSequelize.query(
      `SELECT * FROM seasonal_config WHERE destination_id = :destId AND is_active = 1 LIMIT 1`,
      { replacements: { destId } }
    );
    const wasActive = currentlyActive?.[0] || null;

    // Check for transition
    const shouldBeId = shouldBeActive?.id || null;
    const wasId = wasActive?.id || null;

    if (shouldBeId !== wasId) {
      // Deactivate old season
      if (wasId) {
        await mysqlSequelize.query(
          `UPDATE seasonal_config SET is_active = 0, updated_at = NOW() WHERE id = :id`,
          { replacements: { id: wasId } }
        );
      }

      // Activate new season
      if (shouldBeId) {
        await mysqlSequelize.query(
          `UPDATE seasonal_config SET is_active = 1, updated_at = NOW() WHERE id = :id`,
          { replacements: { id: shouldBeId } }
        );

        // Apply homepage overrides if configured
        await applySeasonalOverrides(destId, shouldBeActive);
      }

      transitions.push({
        destinationId: destId,
        from: wasActive?.season_name || 'none',
        to: shouldBeActive?.season_name || 'none',
      });

      logger.info(`[SeasonalEngine] Transition for dest ${destId}: ${wasActive?.season_name || 'none'} → ${shouldBeActive?.season_name || 'none'}`);
    }
  }

  return transitions;
}

/**
 * Apply seasonal overrides to the homepage
 * Updates the homepage page record with seasonal hero image, featured POIs, etc.
 */
async function applySeasonalOverrides(destinationId, season) {
  if (!season) return;

  const heroImagePath = season.hero_image_path;
  const featuredPoiIds = season.featured_poi_ids;
  const homepageBlocks = season.homepage_blocks;

  // If homepage_blocks JSON is provided, update the homepage layout directly
  if (homepageBlocks) {
    const blocks = typeof homepageBlocks === 'string' ? JSON.parse(homepageBlocks) : homepageBlocks;

    // Get current homepage
    const [pages] = await mysqlSequelize.query(
      `SELECT id, layout FROM pages WHERE destination_id = :destId AND slug = 'home' AND status = 'published' LIMIT 1`,
      { replacements: { destId: destinationId } }
    );

    if (pages?.[0]) {
      const page = pages[0];
      const currentLayout = typeof page.layout === 'string' ? JSON.parse(page.layout) : page.layout;

      // Save current layout as revision before overriding
      await mysqlSequelize.query(
        `INSERT INTO page_revisions (page_id, layout, changed_by, change_summary, created_at)
         VALUES (:pageId, :layout, 'seasonal-engine', :summary, NOW())`,
        {
          replacements: {
            pageId: page.id,
            layout: JSON.stringify(currentLayout),
            summary: `Pre-season backup: ${season.season_name}`,
          },
        }
      );

      // Apply seasonal overrides to hero block if present
      if (currentLayout?.blocks) {
        for (const block of currentLayout.blocks) {
          if (block.type === 'hero' && heroImagePath) {
            block.props = block.props || {};
            block.props.image = heroImagePath;
          }
          if (block.type === 'poi_grid' && featuredPoiIds) {
            block.props = block.props || {};
            block.props.featured_poi_ids = typeof featuredPoiIds === 'string' ? JSON.parse(featuredPoiIds) : featuredPoiIds;
          }
        }

        await mysqlSequelize.query(
          `UPDATE pages SET layout = :layout, updated_at = NOW() WHERE id = :id`,
          { replacements: { layout: JSON.stringify(currentLayout), id: page.id } }
        );

        logger.info(`[SeasonalEngine] Applied overrides to homepage for dest ${destinationId}: season '${season.season_name}'`);
      }
    }
  }
}

export default { getCurrentSeason, checkSeasonTransitions };
