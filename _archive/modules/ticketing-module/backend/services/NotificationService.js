/**
 * NotificationService - Handles push notifications via Firebase Cloud Messaging
 * Supports web push, Android, and iOS notifications
 */

const admin = require('firebase-admin');
const { DeviceToken } = require('../models');
const logger = require('../utils/logger');

// Firebase initialization status
let firebaseInitialized = false;

class NotificationService {
  /**
   * Initialize Firebase Admin SDK
   */
  static initialize() {
    if (firebaseInitialized) {
      return;
    }

    try {
      // Check for Firebase credentials
      const firebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : null;

      if (!firebaseConfig && !process.env.FIREBASE_PROJECT_ID) {
        logger.warn('Firebase not configured. Push notifications will be disabled.');
        return;
      }

      // Initialize with service account or default credentials
      if (firebaseConfig) {
        admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig),
        });
      } else {
        // Use application default credentials (for GCP environments)
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }

      firebaseInitialized = true;
      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
    }
  }

  /**
   * Check if Firebase is initialized
   */
  static isInitialized() {
    return firebaseInitialized;
  }

  /**
   * Register a device token for a user
   * @param {string} userId - The user ID
   * @param {string} token - The FCM device token
   * @param {Object} deviceInfo - Device information
   */
  static async registerDevice(userId, token, deviceInfo = {}) {
    try {
      const { platform = 'web', deviceId, appVersion } = deviceInfo;

      // Upsert device token
      await DeviceToken.upsert({
        userId,
        token,
        platform,
        deviceId,
        appVersion,
        isActive: true,
        lastUsedAt: new Date(),
      });

      logger.info(`Device registered for user ${userId} (${platform})`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to register device:', error);
      throw error;
    }
  }

  /**
   * Unregister a device token
   * @param {string} userId - The user ID
   * @param {string} token - The FCM device token
   */
  static async unregisterDevice(userId, token) {
    try {
      await DeviceToken.update(
        { isActive: false },
        { where: { userId, token } }
      );

      logger.info(`Device unregistered for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to unregister device:', error);
      throw error;
    }
  }

  /**
   * Send notification to a specific user
   * @param {string} userId - The user ID
   * @param {Object} notification - Notification content
   */
  static async sendToUser(userId, notification) {
    if (!firebaseInitialized) {
      logger.warn('Firebase not initialized, skipping push notification');
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      // Get active device tokens for user
      const devices = await DeviceToken.findAll({
        where: { userId, isActive: true },
      });

      if (devices.length === 0) {
        logger.info(`No active devices for user ${userId}`);
        return { success: false, reason: 'No active devices' };
      }

      const tokens = devices.map(d => d.token);
      const results = await this._sendToTokens(tokens, notification);

      // Handle invalid tokens
      await this._handleSendResults(devices, results);

      return {
        success: true,
        sent: results.successCount,
        failed: results.failureCount,
      };
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {Object} notification - Notification content
   */
  static async sendToUsers(userIds, notification) {
    if (!firebaseInitialized) {
      logger.warn('Firebase not initialized, skipping push notifications');
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const devices = await DeviceToken.findAll({
        where: {
          userId: userIds,
          isActive: true,
        },
      });

      if (devices.length === 0) {
        return { success: false, reason: 'No active devices' };
      }

      const tokens = devices.map(d => d.token);
      const results = await this._sendToTokens(tokens, notification);

      await this._handleSendResults(devices, results);

      return {
        success: true,
        sent: results.successCount,
        failed: results.failureCount,
      };
    } catch (error) {
      logger.error('Failed to send notifications to users:', error);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   * @param {string} topic - The topic name
   * @param {Object} notification - Notification content
   */
  static async sendToTopic(topic, notification) {
    if (!firebaseInitialized) {
      logger.warn('Firebase not initialized, skipping topic notification');
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const message = this._buildMessage(notification, { topic });
      const response = await admin.messaging().send(message);

      logger.info(`Topic notification sent to ${topic}: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error(`Failed to send topic notification to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe user to a topic
   * @param {string} userId - The user ID
   * @param {string} topic - The topic name
   */
  static async subscribeToTopic(userId, topic) {
    if (!firebaseInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const devices = await DeviceToken.findAll({
        where: { userId, isActive: true },
      });

      if (devices.length === 0) {
        return { success: false, reason: 'No active devices' };
      }

      const tokens = devices.map(d => d.token);
      const response = await admin.messaging().subscribeToTopic(tokens, topic);

      logger.info(`User ${userId} subscribed to topic ${topic}`);
      return { success: true, results: response };
    } catch (error) {
      logger.error(`Failed to subscribe user ${userId} to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from a topic
   * @param {string} userId - The user ID
   * @param {string} topic - The topic name
   */
  static async unsubscribeFromTopic(userId, topic) {
    if (!firebaseInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const devices = await DeviceToken.findAll({
        where: { userId, isActive: true },
      });

      if (devices.length === 0) {
        return { success: false, reason: 'No active devices' };
      }

      const tokens = devices.map(d => d.token);
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);

      logger.info(`User ${userId} unsubscribed from topic ${topic}`);
      return { success: true, results: response };
    } catch (error) {
      logger.error(`Failed to unsubscribe user ${userId} from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Send to specific FCM tokens
   * @param {Array<string>} tokens - FCM tokens
   * @param {Object} notification - Notification content
   */
  static async _sendToTokens(tokens, notification) {
    const message = this._buildMessage(notification);

    // Use sendEachForMulticast for multiple tokens
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message,
    });

    return response;
  }

  /**
   * Build FCM message object
   * @param {Object} notification - Notification content
   * @param {Object} options - Additional options
   */
  static _buildMessage(notification, options = {}) {
    const { title, body, imageUrl, data, clickAction, badge, sound } = notification;

    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: {
        ...data,
        click_action: clickAction || '/',
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#1976d2',
          sound: sound || 'default',
          clickAction: clickAction || 'OPEN_ACTIVITY',
          ...(badge !== undefined && { notificationCount: badge }),
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: sound || 'default',
            badge: badge !== undefined ? badge : 1,
            'mutable-content': 1,
          },
        },
        fcmOptions: {
          ...(imageUrl && { image: imageUrl }),
        },
      },
      webpush: {
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          ...(imageUrl && { image: imageUrl }),
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'Bekijk',
            },
          ],
        },
        fcmOptions: {
          link: clickAction || '/',
        },
      },
      ...options,
    };

    return message;
  }

  /**
   * Handle send results and cleanup invalid tokens
   * @param {Array} devices - Device token records
   * @param {Object} results - Send results from FCM
   */
  static async _handleSendResults(devices, results) {
    const invalidTokens = [];

    results.responses.forEach((response, index) => {
      if (!response.success) {
        const error = response.error;

        // Check for invalid token errors
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(devices[index].token);
        }
      }
    });

    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      await DeviceToken.update(
        { isActive: false },
        { where: { token: invalidTokens } }
      );

      logger.info(`Deactivated ${invalidTokens.length} invalid device tokens`);
    }
  }

  /**
   * Send test notification (for debugging)
   * @param {string} token - FCM token
   */
  static async sendTestNotification(token) {
    if (!firebaseInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    const message = {
      token,
      notification: {
        title: 'Test Notification',
        body: 'This is a test notification from HolidaiButler',
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const response = await admin.messaging().send(message);
      logger.info(`Test notification sent: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('Test notification failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize on module load
NotificationService.initialize();

module.exports = NotificationService;
