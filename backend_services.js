/**
 * HolidaiButler - Additional Backend Services
 * WeatherService, POIService, EmailService
 */

// WeatherService.js
const axios = require('axios');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.cacheTtl = 600; // 10 minutes
  }

  async getCurrentWeather(lat, lon) {
    const cacheKey = `weather_${lat}_${lon}`;
    
    try {
      // Check cache first
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'en',
        },
        timeout: 5000,
      });

      const weatherData = {
        temperature: Math.round(response.data.main.temp),
        condition: response.data.weather[0].main,
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        visibility: response.data.visibility,
        sunrise: new Date(response.data.sys.sunrise * 1000),
        sunset: new Date(response.data.sys.sunset * 1000),
        icon: response.data.weather[0].icon,
        location: response.data.name,
      };

      // Cache the result
      await CacheService.set(cacheKey, weatherData, this.cacheTtl);
      
      return weatherData;
    } catch (error) {
      logger.error('Weather service error:', error);
      return this.getFallbackWeather();
    }
  }

  async getWeatherForecast(lat, lon, days = 5) {
    const cacheKey = `forecast_${lat}_${lon}_${days}`;
    
    try {
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          cnt: days * 8, // 8 forecasts per day (3-hour intervals)
        },
        timeout: 5000,
      });

      const forecast = response.data.list.map(item => ({
        date: new Date(item.dt * 1000),
        temperature: {
          min: Math.round(item.main.temp_min),
          max: Math.round(item.main.temp_max),
          current: Math.round(item.main.temp),
        },
        condition: item.weather[0].main,
        description: item.weather[0].description,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        icon: item.weather[0].icon,
      }));

      await CacheService.set(cacheKey, forecast, this.cacheTtl);
      return forecast;
    } catch (error) {
      logger.error('Weather forecast error:', error);
      return [];
    }
  }

  getFallbackWeather() {
    return {
      temperature: 22,
      condition: 'Clear',
      description: 'Beautiful Mediterranean weather',
      humidity: 65,
      windSpeed: 3.2,
      location: 'Costa Blanca',
    };
  }

  isGoodWeatherForActivity(weather, activity) {
    const temp = weather.temperature;
    const condition = weather.condition.toLowerCase();
    
    switch (activity) {
      case 'beach':
        return temp >= 20 && !condition.includes('rain');
      case 'hiking':
        return temp >= 15 && temp <= 30 && !condition.includes('rain');
      case 'outdoor':
        return temp >= 10 && !condition.includes('rain');
      case 'indoor':
        return true; // Indoor activities always work
      default:
        return temp >= 15 && !condition.includes('rain');
    }
  }
}

// POIService.js
const { POI } = require('../models');

class POIService {
  async getNearbyPOIs(lat, lon, radius = 5000, category = null, limit = 10) {
    try {
      const query = {
        coordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            $maxDistance: radius,
          },
        },
        verified: true,
      };

      if (category) {
        query.category = category;
      }

      const pois = await POI.find(query)
        .limit(limit)
        .sort({ rating: -1 })
        .lean();

      return pois.map(poi => ({
        ...poi,
        distance: this.calculateDistance(lat, lon, poi.coordinates.lat, poi.coordinates.lng),
      }));
    } catch (error) {
      logger.error('POI service error:', error);
      return [];
    }
  }

  async searchPOIs(searchTerm, location = null, category = null, filters = {}) {
    try {
      const query = {
        verified: true,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { aiTags: { $in: [new RegExp(searchTerm, 'i')] } },
        ],
      };

      if (location) {
        query.location = { $regex: location, $options: 'i' };
      }

      if (category) {
        query.category = category;
      }

      if (filters.rating) {
        query.rating = { $gte: filters.rating };
      }

      if (filters.priceCategory) {
        query.priceCategory = filters.priceCategory;
      }

      const pois = await POI.find(query)
        .limit(20)
        .sort({ rating: -1, reviews: -1 })
        .lean();

      return pois;
    } catch (error) {
      logger.error('POI search error:', error);
      return [];
    }
  }

  async findByName(name) {
    try {
      return await POI.findOne({
        name: { $regex: name, $options: 'i' },
        verified: true,
      }).lean();
    } catch (error) {
      logger.error('POI find by name error:', error);
      return null;
    }
  }

  async getPopularPOIs(category = null, location = null) {
    try {
      const query = { verified: true };
      
      if (category) query.category = category;
      if (location) query.location = { $regex: location, $options: 'i' };

      return await POI.find(query)
        .sort({ rating: -1, reviews: -1 })
        .limit(10)
        .lean();
    } catch (error) {
      logger.error('Popular POIs error:', error);
      return [];
    }
  }

  async getPOIById(id) {
    try {
      return await POI.findById(id).lean();
    } catch (error) {
      logger.error('Get POI by ID error:', error);
      return null;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  async updatePOIRating(poiId, newRating) {
    try {
      await POI.findByIdAndUpdate(poiId, {
        $inc: { reviews: 1 },
        // You'd implement proper rating calculation here
      });
    } catch (error) {
      logger.error('Update POI rating error:', error);
    }
  }
}

// EmailService.js
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    this.fromEmail = process.env.FROM_EMAIL || 'hello@holidaibutler.com';
    this.templates = {
      welcome: 'd-welcome-template-id',
      passwordReset: 'd-password-reset-template-id',
      bookingConfirmation: 'd-booking-confirmation-template-id',
    };
  }

  async sendWelcomeEmail(user) {
    try {
      const msg = {
        to: user.email,
        from: {
          email: this.fromEmail,
          name: 'HolidAI Butler 🧭',
        },
        subject: '¡Bienvenido! Welcome to your Mediterranean AI travel companion',
        html: this.generateWelcomeEmailHtml(user),
      };

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg);
        logger.info(`Welcome email sent to ${user.email}`);
      } else {
        logger.info(`Welcome email would be sent to ${user.email} (SendGrid not configured)`);
      }
    } catch (error) {
      logger.error('Send welcome email error:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const msg = {
        to: user.email,
        from: {
          email: this.fromEmail,
          name: 'HolidAI Butler 🧭',
        },
        subject: 'Reset your HolidAI Butler password',
        html: this.generatePasswordResetEmailHtml(user, resetUrl),
      };

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg);
        logger.info(`Password reset email sent to ${user.email}`);
      } else {
        logger.info(`Password reset email would be sent to ${user.email}`);
      }
    } catch (error) {
      logger.error('Send password reset email error:', error);
      throw error;
    }
  }

  async sendBookingConfirmationEmail(user, booking) {
    try {
      const msg = {
        to: user.email,
        from: {
          email: this.fromEmail,
          name: 'HolidAI Butler 🧭',
        },
        subject: `Booking Confirmed: ${booking.poi?.name}`,
        html: this.generateBookingConfirmationEmailHtml(user, booking),
      };

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg);
        logger.info(`Booking confirmation email sent to ${user.email}`);
      } else {
        logger.info(`Booking confirmation email would be sent to ${user.email}`);
      }
    } catch (error) {
      logger.error('Send booking confirmation email error:', error);
      throw error;
    }
  }

  generateWelcomeEmailHtml(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to HolidAI Butler</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 40px 0; background: linear-gradient(135deg, #5E8B7E, #D4AF37); color: white; border-radius: 10px;">
            <h1 style="margin: 0;">🧭 HolidAI Butler</h1>
            <p style="margin: 10px 0 0 0; font-style: italic;">Je persoonlijke AI-reiscompas</p>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #5E8B7E;">¡Hola ${user.profile.firstName}!</h2>
            
            <p>Welcome to HolidAI Butler, your personal Mediterranean AI travel companion! 🌊</p>
            
            <p>You're now ready to discover the authentic Costa Blanca with official tourism authority endorsement and local insider knowledge.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #5E8B7E; margin-top: 0;">What you can do:</h3>
              <ul>
                <li>🏖️ Discover the best beaches and hidden coves</li>
                <li>🍽️ Find authentic local restaurants and tapas bars</li>
                <li>🎯 Get personalized activity recommendations</li>
                <li>🏛️ Explore cultural sites and museums</li>
                <li>📅 Book experiences directly through the app</li>
              </ul>
            </div>
            
            <p>Start your Mediterranean adventure by asking me anything about Costa Blanca!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" style="background: #5E8B7E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Start Exploring</a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>HolidAI Butler - Your Mediterranean AI Travel Companion</p>
            <p>Officially endorsed by Costa Blanca tourism authorities</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetEmailHtml(user, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 40px 0;">
            <h1 style="color: #5E8B7E;">🧭 HolidAI Butler</h1>
          </div>
          
          <div style="padding: 30px 0;">
            <h2>Password Reset Request</h2>
            
            <p>Hi ${user.profile.firstName},</p>
            
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #5E8B7E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Reset Password</a>
            </div>
            
            <p>This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this reset, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateBookingConfirmationEmailHtml(user, booking) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 40px 0; background: linear-gradient(135deg, #5E8B7E, #D4AF37); color: white; border-radius: 10px;">
            <h1 style="margin: 0;">✅ Booking Confirmed!</h1>
          </div>
          
          <div style="padding: 30px 0;">
            <h2>Your Mediterranean Experience Awaits</h2>
            
            <p>Hi ${user.profile.firstName},</p>
            
            <p>Great news! Your booking has been confirmed.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #5E8B7E; margin-top: 0;">${booking.poi?.name}</h3>
              <p><strong>Date:</strong> ${booking.details.date}</p>
              <p><strong>Time:</strong> ${booking.details.time}</p>
              <p><strong>Guests:</strong> ${booking.details.guestCount}</p>
              <p><strong>Confirmation Code:</strong> ${booking.confirmation.code}</p>
            </div>
            
            <p>We hope you have an amazing experience! Don't forget to share your photos with us.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// CacheService.js (Redis implementation)
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis error:', error);
      });

      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      // Continue without cache
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async healthCheck() {
    if (!this.isConnected) return false;
    
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = {
  WeatherService: new WeatherService(),
  POIService: new POIService(),
  EmailService: new EmailService(),
  CacheService: new CacheService(),
};