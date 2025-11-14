import express from 'express';
import PlatformConfig from '../models/PlatformConfig.js';
import { verifyAdminToken, requirePermission, logActivity } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/platform
 * @desc    Get platform configuration
 * @access  Private (Admin)
 */
router.get(
  '/',
  verifyAdminToken,
  async (req, res) => {
    try {
      const config = await PlatformConfig.getConfig();

      res.json({
        success: true,
        data: {
          config
        }
      });

    } catch (error) {
      console.error('Get platform config error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching platform configuration.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/platform/branding
 * @desc    Update platform branding
 * @access  Private (Admin with platform.branding permission)
 */
router.put(
  '/branding',
  verifyAdminToken,
  requirePermission('platform', 'branding'),
  logActivity('update', 'platform_branding'),
  async (req, res) => {
    try {
      const config = await PlatformConfig.getConfig();

      const updatedConfig = await config.updateSection('branding', req.body, req.adminUser._id);

      res.json({
        success: true,
        message: 'Branding updated successfully.',
        data: {
          branding: updatedConfig.branding
        }
      });

    } catch (error) {
      console.error('Update branding error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating branding.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/platform/content
 * @desc    Update platform content
 * @access  Private (Admin with platform.content permission)
 */
router.put(
  '/content',
  verifyAdminToken,
  requirePermission('platform', 'content'),
  logActivity('update', 'platform_content'),
  async (req, res) => {
    try {
      const config = await PlatformConfig.getConfig();

      const updatedConfig = await config.updateSection('content', req.body, req.adminUser._id);

      res.json({
        success: true,
        message: 'Content updated successfully.',
        data: {
          content: updatedConfig.content
        }
      });

    } catch (error) {
      console.error('Update content error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating content.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/platform/contact
 * @desc    Update platform contact information
 * @access  Private (Admin with platform.content permission)
 */
router.put(
  '/contact',
  verifyAdminToken,
  requirePermission('platform', 'content'),
  logActivity('update', 'platform_contact'),
  async (req, res) => {
    try {
      const config = await PlatformConfig.getConfig();

      const updatedConfig = await config.updateSection('contact', req.body, req.adminUser._id);

      res.json({
        success: true,
        message: 'Contact information updated successfully.',
        data: {
          contact: updatedConfig.contact
        }
      });

    } catch (error) {
      console.error('Update contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating contact information.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/platform/legal
 * @desc    Update platform legal documents
 * @access  Private (Admin with platform.settings permission)
 */
router.put(
  '/legal',
  verifyAdminToken,
  requirePermission('platform', 'settings'),
  logActivity('update', 'platform_legal'),
  async (req, res) => {
    try {
      const config = await PlatformConfig.getConfig();

      const updatedConfig = await config.updateSection('legal', req.body, req.adminUser._id);

      res.json({
        success: true,
        message: 'Legal documents updated successfully.',
        data: {
          legal: updatedConfig.legal
        }
      });

    } catch (error) {
      console.error('Update legal error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating legal documents.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/platform/settings
 * @desc    Update platform settings
 * @access  Private (Admin with platform.settings permission)
 */
router.put(
  '/settings',
  verifyAdminToken,
  requirePermission('platform', 'settings'),
  logActivity('update', 'platform_settings'),
  async (req, res) => {
    try {
      const config = await PlatformConfig.getConfig();

      const updatedConfig = await config.updateSection('settings', req.body, req.adminUser._id);

      res.json({
        success: true,
        message: 'Settings updated successfully.',
        data: {
          settings: updatedConfig.settings
        }
      });

    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating settings.'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/platform/features
 * @desc    Update platform features
 * @access  Private (Admin with platform.settings permission)
 */
router.put(
  '/features',
  verifyAdminToken,
  requirePermission('platform', 'settings'),
  logActivity('update', 'platform_features'),
  async (req, res) => {
    try {
      const config = await PlatformConfig.getConfig();

      const updatedConfig = await config.updateSection('features', req.body, req.adminUser._id);

      res.json({
        success: true,
        message: 'Features updated successfully.',
        data: {
          features: updatedConfig.features
        }
      });

    } catch (error) {
      console.error('Update features error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating features.'
      });
    }
  }
);

export default router;
