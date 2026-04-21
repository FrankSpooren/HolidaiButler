/**
 * Backfill Media Alt-Text 5 Languages
 * Re-queues media items that have tags but no alt_text_en (processed with old prompt).
 * Also re-queues items still at ai_processed=0.
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Sequelize, QueryTypes } from 'sequelize';

const sequelize = new Sequelize('pxoziy_db1', 'pxoziy_1', 'j8,DrtshJSm$', {
  host: 'jotx.your-database.de', dialect: 'mysql', logging: false
});

async function main() {
  const conn = new Redis();
  const queue = new Queue('media-processing', { connection: conn });

  // Items with tags but no alt-text (old prompt) + still unprocessed
  const items = await sequelize.query(
    `SELECT id, filename, media_type FROM media
     WHERE (ai_processed = 1 AND alt_text_en IS NULL AND media_type = 'image')
        OR (ai_processed = 0)
     ORDER BY id`,
    { type: QueryTypes.SELECT }
  );

  console.log(`[Backfill Alt-Text] Found ${items.length} items needing alt-text`);

  // Reset ai_processed to 0 so pipeline re-runs AI tagging
  if (items.length > 0) {
    const ids = items.map(i => i.id);
    await sequelize.query(
      `UPDATE media SET ai_processed = 0 WHERE id IN (${ids.join(',')})`,
    );
  }

  for (let i = 0; i < items.length; i++) {
    const media = items[i];
    // Only queue ai_tag (not full pipeline - thumbnails/phash already done)
    await queue.add('process-media', { mediaId: media.id, type: 'ai_tag' }, { priority: 5 });
    console.log(`[Backfill] Queued ${i + 1}/${items.length}: media ${media.id}`);
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[Backfill Alt-Text] Done — ${items.length} jobs queued`);
  await queue.close(); await conn.quit(); await sequelize.close();
}

main().catch(err => { console.error(err); process.exit(1); });
