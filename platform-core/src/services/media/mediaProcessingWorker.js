/**
 * Media Processing Worker — BullMQ
 * Queue: media-processing
 * Jobs: thumbnail, exif_extract, quality_classify, phash_generate, ai_tag, video_process
 */
import { Worker } from 'bullmq';
import { connection } from '../orchestrator/queues.js';
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import path from 'path';
import fs from 'fs';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';

let mediaWorker = null;

async function processMediaJob(job) {
  const { mediaId, type } = job.data;
  console.log(`[MediaProcessing] Job ${type} for media ${mediaId}`);

  const [media] = await mysqlSequelize.query(
    'SELECT * FROM media WHERE id = ?', { replacements: [mediaId], type: QueryTypes.SELECT }
  );
  if (!media) throw new Error(`Media ${mediaId} not found`);

  const filePath = path.join(STORAGE_ROOT, 'media', String(media.destination_id), media.filename);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  switch (type) {
    case 'thumbnail':
      await generateThumbnails(media, filePath);
      break;
    case 'exif_extract':
      await extractExif(media, filePath);
      break;
    case 'quality_classify':
      await classifyQuality(media, filePath);
      break;
    case 'phash_generate':
      await generatePHash(media, filePath);
      break;
    case 'ai_tag':
      await aiTag(media, filePath);
      break;
    case 'video_process':
      await processVideo(media, filePath);
      break;
    case 'audio_process':
      await processAudio(media, filePath);
      break;
    case 'gpx_process':
      await processGpx(media, filePath);
      break;
    case 'full_pipeline':
      await runFullPipeline(media, filePath);
      break;
    default:
      throw new Error(`Unknown job type: ${type}`);
  }

  return { mediaId, type, success: true };
}

async function generateThumbnails(media, filePath) {
  const sharp = (await import('sharp')).default;
  const thumbDir = path.join(STORAGE_ROOT, 'media', 'thumbnails');
  fs.mkdirSync(thumbDir, { recursive: true });

  const sizes = [150, 400, 800];
  for (const size of sizes) {
    const thumbPath = path.join(thumbDir, `${media.id}_${size}.webp`);
    try {
      await sharp(filePath)
        .resize(size, size, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbPath);
    } catch (err) {
      // Try JPEG fallback
      const jpgPath = path.join(thumbDir, `${media.id}_${size}.jpg`);
      await sharp(filePath)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(jpgPath);
    }
  }
  console.log(`[MediaProcessing] Thumbnails generated for media ${media.id}`);
}

async function extractExif(media, filePath) {
  const sharp = (await import('sharp')).default;
  try {
    const metadata = await sharp(filePath).metadata();
    const updates = {};

    if (metadata.width) updates.width = metadata.width;
    if (metadata.height) updates.height = metadata.height;

    // EXIF data
    if (metadata.exif) {
      try {
        // Sharp exposes basic EXIF via metadata
        if (metadata.orientation) updates.orientation = metadata.orientation;
      } catch { /* ignore */ }
    }

    // Try to get GPS and date from EXIF
    try {
      const { exif } = await sharp(filePath).metadata();
      // Sharp doesn't parse GPS natively, but we can get creation date
      if (metadata.density) updates.dpi = metadata.density;
    } catch { /* ignore */ }

    if (Object.keys(updates).length > 0) {
      const sets = Object.entries(updates).map(([k, v]) => `${k} = ?`).join(', ');
      const vals = [...Object.values(updates), media.id];
      await mysqlSequelize.query(`UPDATE media SET ${sets} WHERE id = ?`, { replacements: vals });
    }

    console.log(`[MediaProcessing] EXIF extracted for media ${media.id}`);
  } catch (err) {
    console.warn(`[MediaProcessing] EXIF extraction failed for ${media.id}:`, err.message);
  }
}

async function classifyQuality(media, filePath) {
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(filePath).metadata();
  const w = metadata.width || 0;

  let tier = 'medium';
  if (w < 800) tier = 'low';
  else if (w < 2000) tier = 'medium';
  else if (w < 4000) tier = 'high';
  else tier = 'ultra';

  await mysqlSequelize.query(
    'UPDATE media SET quality_tier = ?, width = ?, height = ? WHERE id = ?',
    { replacements: [tier, metadata.width, metadata.height, media.id] }
  );
  console.log(`[MediaProcessing] Quality classified: ${tier} (${metadata.width}x${metadata.height}) for media ${media.id}`);
}

async function generatePHash(media, filePath) {
  try {
    const sharp = (await import('sharp')).default;
    // Generate a simple perceptual hash using sharp
    // Resize to 8x8 grayscale, compare pixel values to average
    const { data } = await sharp(filePath)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
    let hash = '';
    for (let i = 0; i < data.length; i++) {
      hash += data[i] >= avg ? '1' : '0';
    }
    // Convert binary string to hex
    const hexHash = BigInt('0b' + hash).toString(16).padStart(16, '0');

    await mysqlSequelize.query(
      'UPDATE media SET perceptual_hash = ? WHERE id = ?',
      { replacements: [hexHash, media.id] }
    );
    console.log(`[MediaProcessing] pHash generated for media ${media.id}: ${hexHash}`);
  } catch (err) {
    console.warn(`[MediaProcessing] pHash failed for ${media.id}:`, err.message);
  }
}

async function aiTag(media, filePath) {
  try {
    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
    if (!MISTRAL_API_KEY) {
      console.warn('[MediaProcessing] MISTRAL_API_KEY not set, skipping AI tagging');
      return;
    }

    // Read image as base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = media.mime_type || 'image/jpeg';

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: 'Analyze this image and return a JSON array of 5-15 descriptive tags in English. Include: objects, scene type, mood, colors, setting. Return ONLY a JSON array like ["beach","sunset","ocean","warm","tropical"]. No other text.' }
          ]
        }],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error(`Mistral API error: ${response.status}`);
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '[]';

    // Parse tags from response
    const match = text.match(/\[[\s\S]*\]/);
    const tags = match ? JSON.parse(match[0]) : [];

    if (tags.length > 0) {
      await mysqlSequelize.query(
        'UPDATE media SET tags_ai = ?, ai_processed = 1 WHERE id = ?',
        { replacements: [JSON.stringify(tags), media.id] }
      );
      console.log(`[MediaProcessing] AI tagged media ${media.id}: ${tags.length} tags`);
    }
  } catch (err) {
    console.warn(`[MediaProcessing] AI tagging failed for ${media.id}:`, err.message);
    await mysqlSequelize.query('UPDATE media SET ai_processed = -1 WHERE id = ?', { replacements: [media.id] });
  }
}

async function processVideo(media, filePath) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Get video duration and resolution
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { timeout: 30000 }
    );
    const probe = JSON.parse(stdout);
    const videoStream = probe.streams?.find(s => s.codec_type === 'video');
    const duration = parseFloat(probe.format?.duration || 0);
    const width = videoStream?.width;
    const height = videoStream?.height;

    // Extract thumbnail at 25%
    const thumbDir = path.join(STORAGE_ROOT, 'media', 'thumbnails');
    fs.mkdirSync(thumbDir, { recursive: true });
    const thumbPath = path.join(thumbDir, `${media.id}_400.jpg`);
    const seekTime = Math.max(1, Math.floor(duration * 0.25));

    await execAsync(
      `ffmpeg -y -ss ${seekTime} -i "${filePath}" -vframes 1 -vf "scale=400:-1" "${thumbPath}"`,
      { timeout: 60000 }
    );

    await mysqlSequelize.query(
      'UPDATE media SET width = ?, height = ?, duration_seconds = ? WHERE id = ?',
      { replacements: [width, height, duration, media.id] }
    );

    console.log(`[MediaProcessing] Video processed: ${width}x${height}, ${Math.round(duration)}s, media ${media.id}`);
  } catch (err) {
    console.warn(`[MediaProcessing] Video processing failed for ${media.id}:`, err.message);
  }
}

async function processAudio(media, filePath) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format "${filePath}"`,
      { timeout: 15000 }
    );
    const probe = JSON.parse(stdout);
    const duration = parseFloat(probe.format?.duration || 0);

    await mysqlSequelize.query(
      'UPDATE media SET duration_seconds = ? WHERE id = ?',
      { replacements: [duration, media.id] }
    );

    console.log(`[MediaProcessing] Audio processed: ${Math.round(duration)}s, media ${media.id}`);
  } catch (err) {
    console.warn(`[MediaProcessing] Audio processing failed for ${media.id}:`, err.message);
  }
}

async function processGpx(media, filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract lat/lng coordinates from GPX XML
    const latMatches = content.match(/lat="([^"]+)"/g) || [];
    const lonMatches = content.match(/lon="([^"]+)"/g) || [];

    if (latMatches.length > 0 && lonMatches.length > 0) {
      const lats = latMatches.map(m => parseFloat(m.match(/lat="([^"]+)"/)[1]));
      const lons = lonMatches.map(m => parseFloat(m.match(/lon="([^"]+)"/)[1]));

      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lons) + Math.max(...lons)) / 2;

      await mysqlSequelize.query(
        'UPDATE media SET location_lat = ?, location_lng = ? WHERE id = ?',
        { replacements: [centerLat, centerLng, media.id] }
      );

      console.log(`[MediaProcessing] GPX processed: center ${centerLat.toFixed(4)},${centerLng.toFixed(4)}, ${lats.length} waypoints, media ${media.id}`);
    }
  } catch (err) {
    console.warn(`[MediaProcessing] GPX processing failed for ${media.id}:`, err.message);
  }
}

async function runFullPipeline(media, filePath) {
  const isImage = (media.mime_type || '').startsWith('image/');
  const isVideo = (media.mime_type || '').startsWith('video/');
  const isAudio = (media.mime_type || '').startsWith('audio/');
  const isGpx = (media.original_name || media.filename || '').toLowerCase().endsWith('.gpx');

  if (isImage) {
    await generateThumbnails(media, filePath);
    await extractExif(media, filePath);
    await classifyQuality(media, filePath);
    await generatePHash(media, filePath);
    await aiTag(media, filePath);
  } else if (isVideo) {
    await processVideo(media, filePath);
    await classifyQuality(media, filePath);
  } else if (isAudio) {
    await processAudio(media, filePath);
  } else if (isGpx) {
    await processGpx(media, filePath);
  }

  // Mark as fully processed
  await mysqlSequelize.query(
    'UPDATE media SET ai_processed = CASE WHEN ai_processed = -1 THEN -1 ELSE 1 END WHERE id = ? AND ai_processed != 1',
    { replacements: [media.id] }
  );

  console.log(`[MediaProcessing] Full pipeline complete for media ${media.id}`);
}

export function startMediaWorker() {
  mediaWorker = new Worker('media-processing', processMediaJob, {
    connection,
    concurrency: 2,
    lockDuration: 120000, // 2 min
  });

  mediaWorker.on('failed', (job, err) => {
    console.error(`[MediaProcessing] Job ${job?.data?.type} failed for media ${job?.data?.mediaId}:`, err.message);
  });

  mediaWorker.on('completed', (job) => {
    console.log(`[MediaProcessing] Job ${job.data.type} completed for media ${job.data.mediaId}`);
  });

  console.log('[MediaProcessing] Media processing worker started (concurrency: 2)');
  return mediaWorker;
}

export async function stopMediaWorker() {
  if (mediaWorker) await mediaWorker.close();
}

export { mediaWorker };
