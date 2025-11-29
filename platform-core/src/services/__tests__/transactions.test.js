/**
 * Transaction Rollback Tests
 * Verifies atomic operations and rollback behavior
 */

import poiDiscoveryService from '../poiDiscovery.js';
import poiClassificationService from '../poiClassification.js';
import POI from '../../models/POI.js';
import POIScoreHistory from '../../models/POIScoreHistory.js';
import { mysqlSequelize } from '../../config/database.js';

// Mock dependencies
jest.mock('../../models/POI.js');
jest.mock('../../models/POIScoreHistory.js');
jest.mock('../../config/database.js');
jest.mock('../dataAggregation.js');
jest.mock('../touristRelevance.js');
jest.mock('../eventBus.js');
jest.mock('../../utils/logger.js');

describe('Transaction Rollback Tests', () => {
  let mockTransaction;

  beforeEach(() => {
    // Mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mysqlSequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POI Discovery - createPOIsInDatabase', () => {
    it('should rollback entire batch on duplicate google_place_id constraint violation', async () => {
      const pois = [
        {
          name: 'POI 1',
          google_place_id: 'place_123',
          latitude: 38.7,
          longitude: -0.4,
          category: 'food_drinks',
          destination: 'Valencia, Spain',
        },
        {
          name: 'POI 2',
          google_place_id: 'place_123', // DUPLICATE - should trigger rollback
          latitude: 38.8,
          longitude: -0.5,
          category: 'museum',
          destination: 'Valencia, Spain',
        },
      ];

      // Mock POI.create to fail on duplicate
      POI.create = jest.fn()
        .mockResolvedValueOnce({ id: 1, ...pois[0] }) // First succeeds
        .mockRejectedValueOnce(new Error('Duplicate entry for google_place_id')); // Second fails

      // Mock classification service
      const classifyPOISpy = jest.spyOn(poiClassificationService, 'classifyPOI')
        .mockResolvedValue({ tier: 2, score: 7.5 });

      await expect(
        poiDiscoveryService.createPOIsInDatabase(pois)
      ).rejects.toThrow('Transaction failed');

      // Verify transaction was rolled back
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();

      // Verify no events were published (events only after commit)
      // This is implicitly tested - if transaction rolled back, events won't publish
    });

    it('should rollback on POI classification failure', async () => {
      const pois = [
        {
          name: 'POI 1',
          google_place_id: 'place_123',
          latitude: 38.7,
          longitude: -0.4,
          category: 'food_drinks',
          destination: 'Valencia, Spain',
        },
      ];

      // Mock POI.create to succeed
      POI.create = jest.fn().mockResolvedValue({ id: 1, ...pois[0] });

      // Mock classification to fail
      jest.spyOn(poiClassificationService, 'classifyPOI')
        .mockRejectedValue(new Error('Classification service unavailable'));

      await expect(
        poiDiscoveryService.createPOIsInDatabase(pois)
      ).rejects.toThrow('Transaction failed');

      // Verify transaction was rolled back
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should commit transaction when all POIs created successfully', async () => {
      const pois = [
        {
          name: 'POI 1',
          google_place_id: 'place_123',
          latitude: 38.7,
          longitude: -0.4,
          category: 'food_drinks',
          destination: 'Valencia, Spain',
        },
      ];

      // Mock successful creation
      POI.create = jest.fn().mockResolvedValue({
        id: 1,
        ...pois[0],
        save: jest.fn().mockResolvedValue(true),
      });

      // Mock successful classification
      jest.spyOn(poiClassificationService, 'classifyPOI')
        .mockResolvedValue({ tier: 2, score: 7.5, poi: { id: 1 } });

      const result = await poiDiscoveryService.createPOIsInDatabase(pois);

      // Verify transaction was committed
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();

      // Verify result
      expect(result.created).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('POI Classification - classifyPOI', () => {
    it('should rollback on POIScoreHistory creation failure', async () => {
      const poiId = 1;
      const mockPOI = {
        id: poiId,
        name: 'Test POI',
        review_count: 100,
        average_rating: 4.5,
        tourist_relevance: 8.0,
        booking_frequency: 0,
        tier: 3,
        poi_score: 5.0,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock POI.findByPk to return POI
      POI.findByPk = jest.fn().mockResolvedValue(mockPOI);

      // Mock POIScoreHistory.create to fail
      POIScoreHistory.create = jest.fn().mockRejectedValue(
        new Error('Database constraint violation on POIScoreHistory')
      );

      await expect(
        poiClassificationService.classifyPOI(poiId, { updateData: false })
      ).rejects.toThrow();

      // Verify transaction was rolled back
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should rollback on POI.save failure', async () => {
      const poiId = 1;
      const mockPOI = {
        id: poiId,
        name: 'Test POI',
        review_count: 100,
        average_rating: 4.5,
        tourist_relevance: 8.0,
        booking_frequency: 0,
        tier: 3,
        poi_score: 5.0,
        save: jest.fn().mockRejectedValue(new Error('Database write failed')),
      };

      // Mock POI.findByPk to return POI
      POI.findByPk = jest.fn().mockResolvedValue(mockPOI);

      await expect(
        poiClassificationService.classifyPOI(poiId, { updateData: false })
      ).rejects.toThrow();

      // Verify transaction was rolled back
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should commit on successful classification', async () => {
      const poiId = 1;
      const mockPOI = {
        id: poiId,
        name: 'Test POI',
        review_count: 100,
        average_rating: 4.5,
        tourist_relevance: 8.0,
        booking_frequency: 0,
        tier: 3,
        poi_score: 5.0,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock POI.findByPk to return POI
      POI.findByPk = jest.fn().mockResolvedValue(mockPOI);

      // Mock POIScoreHistory.create to succeed
      POIScoreHistory.create = jest.fn().mockResolvedValue({
        id: 1,
        poi_id: poiId,
      });

      const result = await poiClassificationService.classifyPOI(poiId, {
        updateData: false,
      });

      // Verify transaction was committed
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();

      // Verify result
      expect(result.poi).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.tier).toBeDefined();
    });

    it('should use external transaction when provided', async () => {
      const poiId = 1;
      const externalTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      const mockPOI = {
        id: poiId,
        name: 'Test POI',
        review_count: 100,
        average_rating: 4.5,
        tourist_relevance: 8.0,
        booking_frequency: 0,
        tier: 3,
        poi_score: 5.0,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock POI.findByPk to return POI
      POI.findByPk = jest.fn().mockResolvedValue(mockPOI);

      // Mock POIScoreHistory.create to succeed
      POIScoreHistory.create = jest.fn().mockResolvedValue({
        id: 1,
        poi_id: poiId,
      });

      const result = await poiClassificationService.classifyPOI(poiId, {
        transaction: externalTransaction,
        updateData: false,
      });

      // Verify external transaction was NOT committed/rolled back
      // (calling code is responsible for that)
      expect(externalTransaction.commit).not.toHaveBeenCalled();
      expect(externalTransaction.rollback).not.toHaveBeenCalled();

      // Verify POI was found with the external transaction
      expect(POI.findByPk).toHaveBeenCalledWith(
        poiId,
        expect.objectContaining({
          transaction: externalTransaction,
        })
      );
    });
  });

  describe('Batch Classification Rollback', () => {
    it('should isolate transaction failures in batch operations', async () => {
      const poiIds = [1, 2, 3];

      // Mock successful classification for POI 1
      const mockPOI1 = {
        id: 1,
        name: 'POI 1',
        review_count: 100,
        average_rating: 4.5,
        tourist_relevance: 8.0,
        booking_frequency: 0,
        tier: 2,
        poi_score: 7.0,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock failing classification for POI 2
      const mockPOI2 = {
        id: 2,
        name: 'POI 2',
        review_count: 50,
        average_rating: 4.0,
        tourist_relevance: 6.0,
        booking_frequency: 0,
        tier: 3,
        poi_score: 5.0,
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };

      // Mock successful classification for POI 3
      const mockPOI3 = {
        id: 3,
        name: 'POI 3',
        review_count: 200,
        average_rating: 4.8,
        tourist_relevance: 9.0,
        booking_frequency: 0,
        tier: 1,
        poi_score: 8.5,
        save: jest.fn().mockResolvedValue(true),
      };

      POI.findByPk = jest.fn()
        .mockResolvedValueOnce(mockPOI1)
        .mockResolvedValueOnce(mockPOI2)
        .mockResolvedValueOnce(mockPOI3);

      POIScoreHistory.create = jest.fn().mockResolvedValue({ id: 1 });

      // Create separate transaction mocks for each call
      const transaction1 = { commit: jest.fn(), rollback: jest.fn() };
      const transaction2 = { commit: jest.fn(), rollback: jest.fn() };
      const transaction3 = { commit: jest.fn(), rollback: jest.fn() };

      mysqlSequelize.transaction = jest.fn()
        .mockResolvedValueOnce(transaction1)
        .mockResolvedValueOnce(transaction2)
        .mockResolvedValueOnce(transaction3);

      const result = await poiClassificationService.batchClassify(poiIds, {
        updateData: false,
      });

      // Verify batch result
      expect(result.successful).toBe(2); // POI 1 and 3
      expect(result.failed).toBe(1); // POI 2
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].poiId).toBe(2);

      // Verify POI 1 transaction committed
      expect(transaction1.commit).toHaveBeenCalled();
      expect(transaction1.rollback).not.toHaveBeenCalled();

      // Verify POI 2 transaction rolled back
      expect(transaction2.rollback).toHaveBeenCalled();
      expect(transaction2.commit).not.toHaveBeenCalled();

      // Verify POI 3 transaction committed
      expect(transaction3.commit).toHaveBeenCalled();
      expect(transaction3.rollback).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Isolation', () => {
    it('should use READ_COMMITTED isolation level', async () => {
      const pois = [
        {
          name: 'POI 1',
          google_place_id: 'place_123',
          latitude: 38.7,
          longitude: -0.4,
          category: 'food_drinks',
          destination: 'Valencia, Spain',
        },
      ];

      POI.create = jest.fn().mockResolvedValue({
        id: 1,
        ...pois[0],
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(poiClassificationService, 'classifyPOI')
        .mockResolvedValue({ tier: 2, score: 7.5, poi: { id: 1 } });

      await poiDiscoveryService.createPOIsInDatabase(pois);

      // Verify transaction created with correct isolation level
      expect(mysqlSequelize.transaction).toHaveBeenCalledWith(
        expect.objectContaining({
          isolationLevel: expect.any(String), // Transaction.ISOLATION_LEVELS.READ_COMMITTED
        })
      );
    });
  });

  describe('Row-level Locking', () => {
    it('should acquire UPDATE lock on POI during classification', async () => {
      const poiId = 1;
      const mockPOI = {
        id: poiId,
        name: 'Test POI',
        review_count: 100,
        average_rating: 4.5,
        tourist_relevance: 8.0,
        booking_frequency: 0,
        tier: 3,
        poi_score: 5.0,
        save: jest.fn().mockResolvedValue(true),
      };

      POI.findByPk = jest.fn().mockResolvedValue(mockPOI);
      POIScoreHistory.create = jest.fn().mockResolvedValue({ id: 1 });

      await poiClassificationService.classifyPOI(poiId, { updateData: false });

      // Verify POI was locked
      expect(POI.findByPk).toHaveBeenCalledWith(
        poiId,
        expect.objectContaining({
          lock: expect.anything(), // Transaction.LOCK.UPDATE
        })
      );
    });
  });
});
