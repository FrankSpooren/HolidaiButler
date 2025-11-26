/**
 * Validation Middleware Tests
 */

import { validate, discoverySchemas } from '../validate.js';

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('destination schema', () => {
    it('should validate valid destination request', () => {
      req.body = {
        destination: 'Valencia, Spain',
        categories: ['food_drinks', 'museum'],
        criteria: {
          minReviews: 50,
          minRating: 4.0,
        },
        sources: ['google_places'],
      };

      const middleware = validate(discoverySchemas.destination);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject empty destination', () => {
      req.body = {
        destination: '',
      };

      const middleware = validate(discoverySchemas.destination);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject destination that is too short', () => {
      req.body = {
        destination: 'AB',
      };

      const middleware = validate(discoverySchemas.destination);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid category', () => {
      req.body = {
        destination: 'Valencia, Spain',
        categories: ['invalid_category'],
      };

      const middleware = validate(discoverySchemas.destination);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should apply default values', () => {
      req.body = {
        destination: 'Valencia, Spain',
      };

      const middleware = validate(discoverySchemas.destination);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.criteria).toBeDefined();
      expect(req.body.sources).toEqual(['google_places']);
      expect(req.body.autoClassify).toBe(true);
    });

    it('should sanitize unknown fields', () => {
      req.body = {
        destination: 'Valencia, Spain',
        unknownField: 'should be removed',
      };

      const middleware = validate(discoverySchemas.destination);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.unknownField).toBeUndefined();
    });

    it('should validate criteria ranges', () => {
      req.body = {
        destination: 'Valencia, Spain',
        criteria: {
          minReviews: -10, // Invalid: negative
          minRating: 6.0, // Invalid: > 5
        },
      };

      const middleware = validate(discoverySchemas.destination);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('config schema', () => {
    it('should validate valid config', () => {
      req.body = {
        name: 'Test Config',
        description: 'Test description',
        categories: ['food_drinks', 'museum'],
        criteria: {
          minReviews: 50,
          minRating: 4.0,
        },
        sources: ['google_places'],
        tags: ['test', 'beach'],
      };

      const middleware = validate(discoverySchemas.config);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should require name for config', () => {
      req.body = {
        categories: ['food_drinks'],
        criteria: { minReviews: 50 },
        sources: ['google_places'],
      };

      const middleware = validate(discoverySchemas.config);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should trim and sanitize name', () => {
      req.body = {
        name: '  Test Config  ',
        categories: ['food_drinks'],
        criteria: { minReviews: 50 },
        sources: ['google_places'],
      };

      const middleware = validate(discoverySchemas.config);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.name).toBe('Test Config');
    });

    it('should limit tags array size', () => {
      req.body = {
        name: 'Test Config',
        categories: ['food_drinks'],
        criteria: { minReviews: 50 },
        sources: ['google_places'],
        tags: Array(20).fill('tag'), // Too many tags
      };

      const middleware = validate(discoverySchemas.config);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
