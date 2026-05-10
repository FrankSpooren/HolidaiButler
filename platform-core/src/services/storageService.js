/**
 * S3 Storage Service — Hetzner Object Storage
 *
 * Centralized S3 client for uploading/downloading/checking files.
 * Used by imageDownloader, imageResize, and media routes.
 *
 * @module services/storageService
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from '../utils/logger.js';

class StorageService {
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'fsn1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
    this.bucket = process.env.S3_BUCKET || 'holidaibutler';
    this.publicUrl = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${this.bucket}`;
  }

  /**
   * Upload a buffer to S3
   * @param {string} key - S3 object key (e.g. "poi-images/171/abc123.jpg")
   * @param {Buffer} buffer - File data
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} Public URL
   */
  async upload(key, buffer, contentType = 'image/jpeg') {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=2592000, immutable',
    }));

    const url = `${this.publicUrl}/${key}`;
    logger.debug('[S3] Uploaded', { key, size: buffer.length });
    return url;
  }

  /**
   * Download a file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<Buffer>}
   */
  async download(key) {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Check if a file exists in S3
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key
   */
  async delete(key) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    logger.debug('[S3] Deleted', { key });
  }

  /**
   * Get the public URL for an S3 key
   * @param {string} key
   * @returns {string}
   */
  getPublicUrl(key) {
    return `${this.publicUrl}/${key}`;
  }
}

const storageService = new StorageService();
export default storageService;
