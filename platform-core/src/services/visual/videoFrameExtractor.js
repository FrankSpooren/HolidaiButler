/**
 * Video Frame Extractor — extracts key frames from video URLs using ffmpeg
 * Used by visualAnalyzer.js for video content analysis
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

const videoFrameExtractor = {

  /**
   * Extract key frames from a video URL
   * @param {string} videoUrl - URL of the video (YouTube, direct MP4, etc.)
   * @param {object} options - { maxFrames: 3, width: 1280 }
   * @returns {Buffer[]} Array of JPEG buffers for each extracted frame
   */
  async extractFrames(videoUrl, { maxFrames = 3, width = 1280 } = {}) {
    const tmpDir = path.join(os.tmpdir(), `hb-frames-${Date.now()}`);

    try {
      fs.mkdirSync(tmpDir, { recursive: true });

      // For YouTube URLs, we need yt-dlp to get the actual stream URL
      let streamUrl = videoUrl;
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        streamUrl = await this._getYouTubeStreamUrl(videoUrl);
        if (!streamUrl) {
          logger.warn('[FrameExtractor] Could not get YouTube stream URL, using thumbnail fallback');
          return [];
        }
      }

      // Extract frames using ffmpeg — select scene changes or evenly spaced
      const outputPattern = path.join(tmpDir, 'frame_%03d.jpg');
      const ffmpegCmd = [
        'ffmpeg', '-y',
        '-i', `"${streamUrl}"`,
        '-vf', `select='not(mod(n\\,30))',scale=${width}:-1`,
        '-frames:v', String(maxFrames),
        '-q:v', '2',
        '-f', 'image2',
        `"${outputPattern}"`
      ].join(' ');

      await execAsync(ffmpegCmd, { timeout: 60000 });

      // Read extracted frames
      const frames = [];
      for (let i = 1; i <= maxFrames; i++) {
        const framePath = path.join(tmpDir, `frame_${String(i).padStart(3, '0')}.jpg`);
        if (fs.existsSync(framePath)) {
          frames.push(fs.readFileSync(framePath));
        }
      }

      logger.info(`[FrameExtractor] Extracted ${frames.length} frames from video`);
      return frames;
    } catch (err) {
      logger.error('[FrameExtractor] Frame extraction failed:', err.message);
      return [];
    } finally {
      // Cleanup temp dir
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch (e) { /* ignore cleanup errors */ }
    }
  },

  /**
   * Get direct stream URL from YouTube using yt-dlp
   */
  async _getYouTubeStreamUrl(youtubeUrl) {
    try {
      const { stdout } = await execAsync(
        `yt-dlp --get-url -f "best[height<=720]" "${youtubeUrl}"`,
        { timeout: 30000 }
      );
      return stdout.trim().split('\n')[0];
    } catch (err) {
      logger.warn('[FrameExtractor] yt-dlp failed:', err.message);
      return null;
    }
  },

  /**
   * Download a thumbnail URL to a buffer
   * Fallback when video frame extraction is not possible
   */
  async downloadThumbnail(thumbnailUrl) {
    try {
      const resp = await fetch(thumbnailUrl);
      if (!resp.ok) return null;
      const arrayBuffer = await resp.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      logger.warn('[FrameExtractor] Thumbnail download failed:', err.message);
      return null;
    }
  }
};

export default videoFrameExtractor;
