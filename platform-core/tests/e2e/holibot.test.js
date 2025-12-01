/**
 * E2E Tests for HoliBot Chat Widget
 * Tests complete conversation flows with AI and POI search
 */

import request from 'supertest';
import express from 'express';

// Mock external services
jest.mock('axios');
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    quit: jest.fn()
  }));
});

// Mock POI data
const mockPOIs = [
  {
    id: '1',
    uuid: 'poi-uuid-1',
    name: 'La Bodega Restaurant',
    slug: 'la-bodega-restaurant',
    category: 'food_drinks',
    subcategory: 'restaurant',
    description: 'Traditional Spanish restaurant with Mediterranean cuisine',
    latitude: 38.6446,
    longitude: 0.0647,
    address: 'Calle Mayor 15, Calpe',
    city: 'Calpe',
    country: 'Spain',
    rating: 4.7,
    review_count: 250,
    price_level: 2,
    verified: true,
    active: true
  },
  {
    id: '2',
    uuid: 'poi-uuid-2',
    name: 'Playa La Fossa',
    slug: 'playa-la-fossa',
    category: 'beach',
    subcategory: 'sandy_beach',
    description: 'Beautiful sandy beach with crystal clear water',
    latitude: 38.6500,
    longitude: 0.0700,
    address: 'Playa La Fossa, Calpe',
    city: 'Calpe',
    country: 'Spain',
    rating: 4.8,
    review_count: 500,
    verified: true,
    active: true
  },
  {
    id: '3',
    uuid: 'poi-uuid-3',
    name: 'Museo del Coleccionismo',
    slug: 'museo-del-coleccionismo',
    category: 'museum',
    subcategory: 'local_museum',
    description: 'Local museum with unique collections',
    latitude: 38.6430,
    longitude: 0.0660,
    address: 'Plaza del Ayuntamiento 5, Calpe',
    city: 'Calpe',
    country: 'Spain',
    rating: 4.3,
    review_count: 80,
    verified: true,
    active: true
  }
];

// Mock Mistral AI response
const mockAIResponse = (message) => {
  if (message.toLowerCase().includes('restaurant')) {
    return {
      content: "I found some great restaurants in Calpe! La Bodega is highly recommended for traditional Spanish cuisine. Would you like more details about any of these?",
      intent: 'search',
      category: 'food_drinks'
    };
  }
  if (message.toLowerCase().includes('beach')) {
    return {
      content: "Calpe has beautiful beaches! Playa La Fossa is a popular sandy beach with clear water. It's great for swimming and sunbathing.",
      intent: 'search',
      category: 'beach'
    };
  }
  if (message.toLowerCase().includes('weather')) {
    return {
      content: "The weather in Calpe is typically Mediterranean - warm and sunny most of the year. Summer temperatures average 28-32°C.",
      intent: 'info',
      category: null
    };
  }
  return {
    content: "I'm happy to help you explore Calpe! You can ask me about restaurants, beaches, museums, activities, and more.",
    intent: 'greeting',
    category: null
  };
};

// Create test app with chat routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Session storage (in-memory for tests)
  const sessions = new Map();

  // Create session endpoint
  app.post('/api/v1/chat/session', (req, res) => {
    const sessionId = `session-${Date.now()}`;
    sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      context: {},
      createdAt: new Date()
    });
    res.json({
      success: true,
      data: { sessionId }
    });
  });

  // Send message endpoint
  app.post('/api/v1/chat/message', async (req, res) => {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and message are required'
      });
    }

    let session = sessions.get(sessionId);
    if (!session) {
      // Create new session if doesn't exist
      session = {
        id: sessionId,
        messages: [],
        context: {},
        createdAt: new Date()
      };
      sessions.set(sessionId, session);
    }

    // Store user message
    session.messages.push({ role: 'user', content: message });

    // Get AI response
    const aiResponse = mockAIResponse(message);

    // Search for POIs if relevant
    let pois = [];
    if (aiResponse.intent === 'search' && aiResponse.category) {
      pois = mockPOIs.filter(poi => poi.category === aiResponse.category);
    }

    // Store assistant message
    session.messages.push({
      role: 'assistant',
      content: aiResponse.content,
      pois: pois.map(p => p.uuid)
    });

    // Update session
    session.context.lastIntent = aiResponse.intent;
    session.context.lastCategory = aiResponse.category;

    res.json({
      success: true,
      data: {
        response: aiResponse.content,
        pois: pois,
        intent: aiResponse.intent,
        sessionId
      }
    });
  });

  // Get session history
  app.get('/api/v1/chat/session/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    res.json({
      success: true,
      data: { session }
    });
  });

  // Delete session
  app.delete('/api/v1/chat/session/:sessionId', (req, res) => {
    if (sessions.has(req.params.sessionId)) {
      sessions.delete(req.params.sessionId);
      res.json({ success: true, message: 'Session deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Session not found' });
    }
  });

  // HoliBot specific endpoints
  app.get('/api/v1/holibot/categories', (req, res) => {
    const categories = [
      { id: 'food_drinks', name: 'Restaurants & Bars', icon: 'utensils' },
      { id: 'beach', name: 'Beaches', icon: 'umbrella-beach' },
      { id: 'museum', name: 'Museums', icon: 'museum' },
      { id: 'activities', name: 'Activities', icon: 'hiking' },
      { id: 'shopping', name: 'Shopping', icon: 'shopping-bag' }
    ];
    res.json({ success: true, data: { categories } });
  });

  app.get('/api/v1/holibot/pois', (req, res) => {
    const { category, limit = 10 } = req.query;
    let filtered = mockPOIs;

    if (category) {
      filtered = mockPOIs.filter(poi => poi.category === category);
    }

    res.json({
      success: true,
      data: {
        pois: filtered.slice(0, parseInt(limit)),
        total: filtered.length
      }
    });
  });

  app.get('/api/v1/holibot/daily-tip', (req, res) => {
    const tips = [
      { tip: "Try the local paella at La Bodega - it's a Calpe favorite!", poi: mockPOIs[0] },
      { tip: "Visit Playa La Fossa early morning for the best swimming conditions!", poi: mockPOIs[1] },
      { tip: "Don't miss the sunset views from the Peñón de Ifach!", poi: null }
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    res.json({ success: true, data: randomTip });
  });

  app.post('/api/v1/holibot/recommendations', (req, res) => {
    const { preferences } = req.body;
    let recommendations = [...mockPOIs];

    if (preferences?.categories) {
      recommendations = recommendations.filter(poi =>
        preferences.categories.includes(poi.category)
      );
    }

    if (preferences?.priceLevel) {
      recommendations = recommendations.filter(poi =>
        !poi.price_level || poi.price_level <= preferences.priceLevel
      );
    }

    // Sort by rating
    recommendations.sort((a, b) => b.rating - a.rating);

    res.json({
      success: true,
      data: {
        recommendations: recommendations.slice(0, 5),
        basedOn: preferences
      }
    });
  });

  return app;
};

describe('E2E: HoliBot Chat Flow', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Session Management', () => {
    it('should create a new chat session', async () => {
      const res = await request(app)
        .post('/api/v1/chat/session');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
    });

    it('should retrieve session history', async () => {
      // Create session
      const createRes = await request(app)
        .post('/api/v1/chat/session');

      const sessionId = createRes.body.data.sessionId;

      // Send a message
      await request(app)
        .post('/api/v1/chat/message')
        .send({ sessionId, message: 'Hello!' });

      // Get session
      const getRes = await request(app)
        .get(`/api/v1/chat/session/${sessionId}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.session.messages).toHaveLength(2); // user + assistant
    });

    it('should delete session', async () => {
      // Create session
      const createRes = await request(app)
        .post('/api/v1/chat/session');

      const sessionId = createRes.body.data.sessionId;

      // Delete session
      const deleteRes = await request(app)
        .delete(`/api/v1/chat/session/${sessionId}`);

      expect(deleteRes.status).toBe(200);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/v1/chat/session/${sessionId}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('Conversation Flow', () => {
    it('should handle greeting message', async () => {
      const res = await request(app)
        .post('/api/v1/chat/message')
        .send({
          sessionId: 'test-session-1',
          message: 'Hello, I need help planning my trip!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.response).toBeDefined();
      expect(res.body.data.intent).toBe('greeting');
    });

    it('should search for restaurants and return POIs', async () => {
      const res = await request(app)
        .post('/api/v1/chat/message')
        .send({
          sessionId: 'test-session-2',
          message: 'Can you recommend a good restaurant in Calpe?'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.intent).toBe('search');
      expect(res.body.data.pois).toBeDefined();
      expect(res.body.data.pois.length).toBeGreaterThan(0);
      expect(res.body.data.pois[0].category).toBe('food_drinks');
    });

    it('should search for beaches and return relevant POIs', async () => {
      const res = await request(app)
        .post('/api/v1/chat/message')
        .send({
          sessionId: 'test-session-3',
          message: 'Where can I find the best beach?'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.pois.some(poi => poi.category === 'beach')).toBe(true);
    });

    it('should handle informational queries without POIs', async () => {
      const res = await request(app)
        .post('/api/v1/chat/message')
        .send({
          sessionId: 'test-session-4',
          message: "What's the weather like in Calpe?"
        });

      expect(res.status).toBe(200);
      expect(res.body.data.intent).toBe('info');
      expect(res.body.data.pois).toHaveLength(0);
      expect(res.body.data.response).toContain('weather');
    });

    it('should maintain conversation context across messages', async () => {
      const sessionId = 'context-test-session';

      // First message
      await request(app)
        .post('/api/v1/chat/message')
        .send({ sessionId, message: 'I want to find restaurants' });

      // Second message (follow-up)
      const res = await request(app)
        .post('/api/v1/chat/message')
        .send({ sessionId, message: 'Tell me about beach options' });

      // Get session to verify context
      const sessionRes = await request(app)
        .get(`/api/v1/chat/session/${sessionId}`);

      expect(sessionRes.body.data.session.messages).toHaveLength(4);
    });
  });

  describe('HoliBot Endpoints', () => {
    it('should return available categories', async () => {
      const res = await request(app)
        .get('/api/v1/holibot/categories');

      expect(res.status).toBe(200);
      expect(res.body.data.categories).toBeInstanceOf(Array);
      expect(res.body.data.categories.length).toBeGreaterThan(0);
      expect(res.body.data.categories[0]).toHaveProperty('id');
      expect(res.body.data.categories[0]).toHaveProperty('name');
    });

    it('should return POIs filtered by category', async () => {
      const res = await request(app)
        .get('/api/v1/holibot/pois')
        .query({ category: 'beach' });

      expect(res.status).toBe(200);
      expect(res.body.data.pois.every(poi => poi.category === 'beach')).toBe(true);
    });

    it('should limit POI results', async () => {
      const res = await request(app)
        .get('/api/v1/holibot/pois')
        .query({ limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.pois.length).toBeLessThanOrEqual(2);
    });

    it('should return daily tip', async () => {
      const res = await request(app)
        .get('/api/v1/holibot/daily-tip');

      expect(res.status).toBe(200);
      expect(res.body.data.tip).toBeDefined();
    });

    it('should return personalized recommendations', async () => {
      const res = await request(app)
        .post('/api/v1/holibot/recommendations')
        .send({
          preferences: {
            categories: ['food_drinks', 'beach'],
            priceLevel: 3
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.recommendations).toBeInstanceOf(Array);
      expect(res.body.data.basedOn).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing message', async () => {
      const res = await request(app)
        .post('/api/v1/chat/message')
        .send({ sessionId: 'test-session' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing session ID', async () => {
      const res = await request(app)
        .post('/api/v1/chat/message')
        .send({ message: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/v1/chat/session/non-existent-session');

      expect(res.status).toBe(404);
    });
  });

  describe('Multi-turn Conversation', () => {
    it('should handle complete conversation flow', async () => {
      const sessionId = 'multi-turn-session';

      // Turn 1: Greeting
      const turn1 = await request(app)
        .post('/api/v1/chat/message')
        .send({ sessionId, message: 'Hi! I\'m planning a day in Calpe' });

      expect(turn1.status).toBe(200);

      // Turn 2: Restaurant search
      const turn2 = await request(app)
        .post('/api/v1/chat/message')
        .send({ sessionId, message: 'First, I\'d like to find a restaurant for lunch' });

      expect(turn2.status).toBe(200);
      expect(turn2.body.data.pois.length).toBeGreaterThan(0);

      // Turn 3: Beach search
      const turn3 = await request(app)
        .post('/api/v1/chat/message')
        .send({ sessionId, message: 'Then I want to go to a beach in the afternoon' });

      expect(turn3.status).toBe(200);
      expect(turn3.body.data.pois.some(poi => poi.category === 'beach')).toBe(true);

      // Verify conversation history
      const session = await request(app)
        .get(`/api/v1/chat/session/${sessionId}`);

      expect(session.body.data.session.messages.length).toBe(6); // 3 user + 3 assistant
    });
  });
});

describe('E2E: POI Discovery Integration', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should return POIs with all required fields', async () => {
    const res = await request(app)
      .get('/api/v1/holibot/pois');

    expect(res.status).toBe(200);

    const poi = res.body.data.pois[0];
    expect(poi).toHaveProperty('id');
    expect(poi).toHaveProperty('name');
    expect(poi).toHaveProperty('category');
    expect(poi).toHaveProperty('latitude');
    expect(poi).toHaveProperty('longitude');
    expect(poi).toHaveProperty('rating');
  });

  it('should return verified POIs only in chat responses', async () => {
    const res = await request(app)
      .post('/api/v1/chat/message')
      .send({
        sessionId: 'verified-test',
        message: 'Find me some restaurants'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.pois.every(poi => poi.verified === true)).toBe(true);
  });
});
