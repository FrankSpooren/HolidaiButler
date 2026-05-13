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
import { sanitizeAIText } from '../agents/contentRedacteur/contentSanitizer.js';

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
        model: process.env.MISTRAL_VISION_MODEL || 'mistral-medium-latest',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: 'Analyze this image and return a JSON object with these exact keys: 1) "tags": array of 5-15 descriptive tags in English. 2) "alt_text_en": concise alt-text in English (max 120 chars). 3) "alt_text_nl": same in Dutch. 4) "alt_text_de": same in German. 5) "alt_text_es": same in Spanish. 6) "alt_text_fr": same in French. 7) "weather_conditions": array from [sunny,partly_cloudy,cloudy,rainy,stormy,snowy,foggy] or null if indoor/unclear. 8) "seasons": array from [spring,early_summer,summer,late_summer,autumn,winter] or null. 9) "time_of_day": one of [dawn,morning,midday,afternoon,golden_hour,dusk,night,unknown]. 10) "persona_fit": array from [families_with_kids,couples,active_50plus,solo_travelers,groups,business_travelers,luxury_seekers,budget_travelers]. 11) "content_purposes": array from [blog_hero,social_post,email_header,booking_page,destination_overview,poi_detail,event_promotion]. Return null for any field where uncertain. Return ONLY valid JSON.' }
          ]
        }],
        max_tokens: 800,
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error(`Mistral API error: ${response.status}`);
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '[]';

    // Parse structured response (tags + alt-text 5 languages)
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch { parsed = null; }

    // Fallback: if response is just an array (old format)
    if (!parsed) {
      const arrMatch = text.match(/\[[\s\S]*\]/);
      const tags = arrMatch ? JSON.parse(arrMatch[0]) : [];
      if (tags.length > 0) {
        await mysqlSequelize.query(
          'UPDATE media SET tags_ai = ?, ai_processed = 1 WHERE id = ?',
          { replacements: [JSON.stringify(tags), media.id] }
        );
      }
      return;
    }

    const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
    const updates = [];
    const params = [];
    if (tags.length > 0) { updates.push('tags_ai = ?'); params.push(JSON.stringify(tags)); }
    if (parsed.alt_text_en) { updates.push('alt_text_en = ?'); params.push(sanitizeAIText(parsed.alt_text_en).substring(0, 500)); }
    if (parsed.alt_text_nl) { updates.push('alt_text_nl = ?'); params.push(sanitizeAIText(parsed.alt_text_nl).substring(0, 500)); }
    if (parsed.alt_text_de) { updates.push('alt_text_de = ?'); params.push(sanitizeAIText(parsed.alt_text_de).substring(0, 500)); }
    if (parsed.alt_text_es) { updates.push('alt_text_es = ?'); params.push(sanitizeAIText(parsed.alt_text_es).substring(0, 500)); }
    if (parsed.alt_text_fr) { updates.push('alt_text_fr = ?'); params.push(sanitizeAIText(parsed.alt_text_fr).substring(0, 500)); }
    if (parsed.weather_conditions) { updates.push('weather_conditions = ?'); params.push(JSON.stringify(parsed.weather_conditions)); }
    if (parsed.seasons) { updates.push('seasons = ?'); params.push(JSON.stringify(parsed.seasons)); }
    if (parsed.time_of_day && parsed.time_of_day !== 'unknown') { updates.push('time_of_day = ?'); params.push(parsed.time_of_day); }
    if (parsed.persona_fit) { updates.push('persona_fit = ?'); params.push(JSON.stringify(parsed.persona_fit)); }
    if (parsed.content_purposes) { updates.push('content_purposes = ?'); params.push(JSON.stringify(parsed.content_purposes)); }
    if (parsed.event_relevance) { updates.push('event_relevance = ?'); params.push(JSON.stringify(parsed.event_relevance)); }
    updates.push('ai_processed = 1');
    params.push(media.id);

    if (updates.length > 1) {
      await mysqlSequelize.query(
        `UPDATE media SET ${updates.join(', ')} WHERE id = ?`,
        { replacements: params }
      );
      console.log(`[MediaProcessing] AI tagged media ${media.id}: ${tags.length} tags + alt-text 5 langs + context`);
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

    // Aspect ratio detection: 9:16 portrait → reel
    let mediaType = 'video';
    if (width && height && height > width && (height / width) >= 1.5) {
      mediaType = 'reel';
    }

    await mysqlSequelize.query(
      'UPDATE media SET width = ?, height = ?, duration_seconds = ?, media_type = ? WHERE id = ?',
      { replacements: [width, height, duration, mediaType, media.id] }
    );

    // MOV/WebM → MP4 normalization (H.264 baseline for universal playback)
    const ext = path.extname(filePath).toLowerCase();
    if (['.mov', '.webm', '.avi', '.mkv'].includes(ext)) {
      const mp4Path = filePath.replace(/\.[^.]+$/, '.mp4');
      try {
        await execAsync(
          `ffmpeg -y -i "${filePath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -movflags +faststart "${mp4Path}"`,
          { timeout: 300000 }
        );
        // Update filename in DB
        const newFilename = media.filename.replace(/\.[^.]+$/, '.mp4');
        await mysqlSequelize.query(
          'UPDATE media SET filename = ?, mime_type = ? WHERE id = ?',
          { replacements: [newFilename, 'video/mp4', media.id] }
        );
        // Remove original if different path
        if (mp4Path !== filePath && fs.existsSync(mp4Path)) {
          fs.unlinkSync(filePath);
        }
        console.log(`[MediaProcessing] Video normalized: ${ext} → .mp4, media ${media.id}`);
      } catch (normErr) {
        console.warn(`[MediaProcessing] Video normalization failed for ${media.id}:`, normErr.message);
      }
    }

    console.log(`[MediaProcessing] Video processed: ${width}x${height}, ${Math.round(duration)}s, type=${mediaType}, media ${media.id}`);
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
    const gpxContent = fs.readFileSync(filePath, 'utf-8');

    // Extract lat/lng coordinates from GPX XML
    const latMatches = gpxContent.match(/lat="([^"]+)"/g) || [];
    const lonMatches = gpxContent.match(/lon="([^"]+)"/g) || [];

    if (latMatches.length < 2) {
      console.warn(`[MediaProcessing] GPX has < 2 waypoints, skipping: media ${media.id}`);
      return;
    }

    const lats = latMatches.map(m => parseFloat(m.match(/lat="([^"]+)"/)[1]));
    const lons = lonMatches.map(m => parseFloat(m.match(/lon="([^"]+)"/)[1]));

    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lons) + Math.max(...lons)) / 2;

    // Build GeoJSON LineString
    const coordinates = [];
    for (let i = 0; i < Math.min(lats.length, lons.length); i++) {
      coordinates.push([lons[i], lats[i]]);
    }

    // Calculate route distance (Haversine)
    let totalDistKm = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1];
      const [lon2, lat2] = coordinates[i];
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      totalDistKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    totalDistKm = Math.round(totalDistKm * 10) / 10;

    // Extract GPX metadata (track name, type)
    const trackNameMatch = gpxContent.match(/<name>([^<]+)<\/name>/);
    const trackName = trackNameMatch ? trackNameMatch[1].trim() : (media.original_name || '').replace('.gpx', '');
    const typeMatch = gpxContent.match(/<type>([^<]+)<\/type>/);
    const gpxType = typeMatch ? typeMatch[1].toLowerCase() : '';

    // Reverse geocode center point via Nominatim (free, no API key)
    let locationName = '', region = '', country = '';
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${centerLat}&lon=${centerLng}&format=json&zoom=12&accept-language=nl`, {
        headers: { 'User-Agent': 'HolidaiButler/1.0 (info@holidaibutler.com)' }
      });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        const addr = geo.address || {};
        locationName = addr.town || addr.city || addr.village || addr.municipality || addr.hamlet || '';
        region = addr.state || addr.province || addr.county || '';
        country = addr.country || '';
      }
    } catch (geoErr) {
      console.warn(`[MediaProcessing] Reverse geocode failed for GPX ${media.id}:`, geoErr.message);
    }

    // Determine route type from distance + name
    let routeType = 'route';
    if (gpxType.includes('cycling') || gpxType.includes('biking') || totalDistKm > 30) routeType = 'cycling';
    else if (gpxType.includes('hiking') || gpxType.includes('walking') || totalDistKm <= 15) routeType = 'hiking';
    else if (gpxType.includes('running') || gpxType.includes('trail')) routeType = 'trail_running';
    // Check name for hints
    const nameLower = trackName.toLowerCase();
    if (nameLower.includes('fiets') || nameLower.includes('cycling') || nameLower.includes('bike')) routeType = 'cycling';
    if (nameLower.includes('wandel') || nameLower.includes('hike') || nameLower.includes('walk')) routeType = 'hiking';

    // Distance category
    let distCategory = '';
    if (totalDistKm < 5) distCategory = 'short_walk';
    else if (totalDistKm < 10) distCategory = 'medium_hike';
    else if (totalDistKm < 25) distCategory = 'long_hike';
    else if (totalDistKm < 50) distCategory = 'short_cycle';
    else distCategory = 'long_cycle';

    // Build tags
    const tags = [routeType, distCategory, 'gpx', 'outdoor', 'nature'];
    if (locationName) tags.push(locationName.toLowerCase().replace(/\s+/g, '_'));
    if (region) tags.push(region.toLowerCase().replace(/\s+/g, '_'));
    if (country) tags.push(country.toLowerCase().replace(/\s+/g, '_'));
    tags.push(`${totalDistKm}km`);
    // Extract keywords from track name
    trackName.split(/[\s_-]+/).forEach(word => {
      if (word.length > 3) tags.push(word.toLowerCase());
    });
    // Deduplicate
    const uniqueTags = [...new Set(tags)].slice(0, 20);

    // Build alt-text
    const distStr = totalDistKm < 1 ? `${Math.round(totalDistKm * 1000)}m` : `${totalDistKm}km`;
    const locStr = [locationName, region].filter(Boolean).join(', ');
    const routeLabel = { hiking: 'Wandelroute', cycling: 'Fietsroute', trail_running: 'Trailroute', route: 'Route' }[routeType] || 'Route';
    const altNl = `${routeLabel} "${trackName}" — ${distStr}${locStr ? ` bij ${locStr}` : ''}`;
    const altEn = `${routeType === 'hiking' ? 'Hiking trail' : routeType === 'cycling' ? 'Cycling route' : 'Route'} "${trackName}" — ${distStr}${locStr ? ` near ${locStr}` : ''}`;
    const altDe = `${routeType === 'hiking' ? 'Wanderweg' : routeType === 'cycling' ? 'Radroute' : 'Route'} "${trackName}" — ${distStr}${locStr ? ` bei ${locStr}` : ''}`;
    const altEs = `${routeType === 'hiking' ? 'Ruta de senderismo' : routeType === 'cycling' ? 'Ruta ciclista' : 'Ruta'} "${trackName}" — ${distStr}${locStr ? ` cerca de ${locStr}` : ''}`;
    const altFr = `${routeType === 'hiking' ? 'Sentier de randonnée' : routeType === 'cycling' ? 'Piste cyclable' : 'Itinéraire'} "${trackName}" — ${distStr}${locStr ? ` près de ${locStr}` : ''}`;

    const geojson = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: {
        name: trackName, points: coordinates.length, distance_km: totalDistKm,
        route_type: routeType, location: locStr,
        bounds: { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lons), maxLng: Math.max(...lons) }
      }
    });

    await mysqlSequelize.query(
      `UPDATE media SET location_lat = ?, location_lng = ?, location_name = ?, route_geojson = ?,
        tags_ai = ?, alt_text_en = ?, alt_text_nl = ?, alt_text_de = ?, alt_text_es = ?, alt_text_fr = ?,
        duration_seconds = ?, ai_processed = 1
       WHERE id = ?`,
      { replacements: [
        centerLat, centerLng, locStr || null, geojson,
        JSON.stringify(uniqueTags), altEn.substring(0, 500), altNl.substring(0, 500),
        altDe.substring(0, 500), altEs.substring(0, 500), altFr.substring(0, 500),
        totalDistKm * 60, // rough estimate: 1 km ≈ 1 min for display purposes
        media.id
      ] }
    );

    console.log(`[MediaProcessing] GPX auto-tagged: ${trackName}, ${distStr}, ${routeType}, ${locStr || 'unknown location'}, ${uniqueTags.length} tags, media ${media.id}`);
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
