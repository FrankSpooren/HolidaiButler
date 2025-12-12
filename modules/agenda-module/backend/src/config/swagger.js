const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger API Documentation Configuration
 * OpenAPI 3.0 specification for investor presentations
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HolidaiButler Agenda API',
      version: '2.0.0',
      description: `
Enterprise-level Events & Activities API for Calpe Tourism Platform

## Features
- 🔍 Multi-source event aggregation
- 🌍 Multilingual support (NL, EN, ES, DE, FR)
- 🎯 Advanced filtering (16 categories, audience, time, location)
- ⚡ Redis caching for optimal performance
- 🛡️ Enterprise security (rate limiting, sanitization)
- 📊 Real-time metrics and analytics

## Authentication
Most endpoints are public. Admin endpoints require JWT token:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Rate Limits
- Public API: 100 requests/15 minutes per IP
- Search endpoint: 30 requests/minute per IP
- Admin endpoints: 50 requests/15 minutes per IP
      `,
      contact: {
        name: 'HolidaiButler API Support',
        email: 'api@holidaibutler.com',
        url: 'https://holidaibutler.com',
      },
      license: {
        name: 'Proprietary',
        url: 'https://holidaibutler.com/license',
      },
    },
    servers: [
      {
        url: 'http://localhost:5003',
        description: 'Development server',
      },
      {
        url: 'https://api.holidaibutler.com',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.holidaibutler.com',
        description: 'Staging server',
      },
    ],
    tags: [
      {
        name: 'Events',
        description: 'Event management endpoints',
      },
      {
        name: 'Featured',
        description: 'Featured events and highlights',
      },
      {
        name: 'Statistics',
        description: 'Analytics and metrics',
      },
      {
        name: 'Health',
        description: 'System health and monitoring',
      },
      {
        name: 'Admin',
        description: 'Administrative operations (requires authentication)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Event: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            title: {
              type: 'object',
              properties: {
                nl: { type: 'string', example: 'Zomerfestival aan Zee' },
                en: { type: 'string', example: 'Summer Festival by the Sea' },
                es: { type: 'string', example: 'Festival de Verano junto al Mar' },
              },
            },
            description: {
              type: 'object',
              properties: {
                nl: { type: 'string' },
                en: { type: 'string' },
                es: { type: 'string' },
              },
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-15T18:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-15T23:00:00.000Z',
            },
            location: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Playa del Arenal-Bol' },
                city: { type: 'string', example: 'Calpe' },
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number', example: 38.6458 },
                    lng: { type: 'number', example: 0.0520 },
                  },
                },
              },
            },
            primaryCategory: {
              type: 'string',
              enum: ['culture', 'beach', 'active-sports', 'relaxation', 'food-drink', 'nature', 'entertainment', 'folklore', 'festivals', 'tours', 'workshops', 'markets', 'sports-events', 'exhibitions', 'music', 'family'],
              example: 'music',
            },
            pricing: {
              type: 'object',
              properties: {
                isFree: { type: 'boolean', example: true },
                price: {
                  type: 'object',
                  properties: {
                    amount: { type: 'number', example: 25 },
                    currency: { type: 'string', example: 'EUR' },
                  },
                },
              },
            },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri' },
                  isPrimary: { type: 'boolean' },
                },
              },
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'cancelled', 'postponed', 'completed', 'archived'],
              example: 'published',
            },
            featured: {
              type: 'boolean',
              example: false,
            },
            metrics: {
              type: 'object',
              properties: {
                views: { type: 'number', example: 1250 },
                clicks: { type: 'number', example: 340 },
                bookmarks: { type: 'number', example: 89 },
              },
            },
          },
        },
        EventList: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Event',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 150 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 50 },
                pages: { type: 'number', example: 3 },
              },
            },
          },
        },
        Statistics: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 150 },
            upcoming: { type: 'number', example: 120 },
            today: { type: 'number', example: 5 },
            thisWeek: { type: 'number', example: 45 },
            byCategory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string', example: 'music' },
                  count: { type: 'number', example: 25 },
                },
              },
            },
            featured: { type: 'number', example: 10 },
            verified: { type: 'number', example: 135 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'An error occurred',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
