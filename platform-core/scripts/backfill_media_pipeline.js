/**
 * Backfill Media Processing Pipeline
 * Queues all unprocessed media items (ai_processed=0) for full pipeline processing.
 * Rate-limited: 1 job per second to avoid Mistral API throttling.
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Sequelize, QueryTypes } from 'sequelize';

const DB_HOST = process.env.DB_HOST || 'jotx.your-database.de';
const DB_NAME = process.env.DB_NAME || 'pxoziy_db1';
const DB_USER = process.env.DB_USER || 'pxoziy_1';
const DB_PASS = process.env.DB_PASS || 'j8,DrtshJSm$';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST, dialect: 'mysql', logging: false
});

async function main() {
  const conn = new Redis();
  const queue = new Queue('media-processing', { connection: conn });

  const unprocessed = await sequelize.query(
    'SELECT id, filename, media_type FROM media WHERE ai_processed = 0 ORDER BY id',
    { type: QueryTypes.SELECT }
  );

  console.log(`[Backfill] Found ${unprocessed.length} unprocessed media items`);

  for (let i = 0; i < unprocessed.length; i++) {
    const media = unprocessed[i];
    await queue.add('process-media', { mediaId: media.id, type: 'full_pipeline' }, { priority: 5 });
    console.log(`[Backfill] Queued ${i + 1}/${unprocessed.length}: media ${media.id} (${media.media_type})`);

    // Rate limit: 1 per second (Mistral API limit ~60/min)
    if (i < unprocessed.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`[Backfill] Done — ${unprocessed.length} jobs queued`);
  await queue.close();
  await conn.quit();
  await sequelize.close();
}

main().catch(err => { console.error(err); process.exit(1); });
