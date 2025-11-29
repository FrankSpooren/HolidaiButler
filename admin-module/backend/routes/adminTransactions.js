import express from 'express';
import { Op } from 'sequelize';
import { Transaction } from '../models/index.js';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with filtering and pagination
 * @access  Private (Admin, Editor)
 */
router.get('/', verifyAdminToken, requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      paymentMethod,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sortBy === 'createdAt' ? 'created_at' : sortBy, sortOrder.toUpperCase()]];

    const { rows: transactions, count: total } = await Transaction.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private (Admin, Editor)
 */
router.get('/stats', verifyAdminToken, requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const total = await Transaction.count();
    const completed = await Transaction.count({ where: { status: 'completed' } });
    const pending = await Transaction.count({ where: { status: { [Op.in]: ['pending', 'processing', 'authorized'] } } });
    const failed = await Transaction.count({ where: { status: { [Op.in]: ['failed', 'cancelled'] } } });
    const refunded = await Transaction.count({ where: { status: { [Op.in]: ['refunded', 'partially_refunded'] } } });

    res.json({
      success: true,
      data: {
        overview: { total, completed, pending, failed, refunded, disputed: 0, totalRevenue: 0, totalRefunded: 0, avgTransactionValue: 0, totalProcessingFees: 0 },
        byStatus: [],
        byType: [],
        byPaymentMethod: [],
        byProvider: [],
        revenueByDate: [],
        pendingReviewsCount: 0,
        unreconciledCount: 0
      }
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/transactions/:id
 * @desc    Get single transaction by ID
 * @access  Private (Admin, Editor)
 */
router.get('/:id', verifyAdminToken, requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions
 * @desc    Create new transaction (manual entry)
 * @access  Private (Admin)
 */
router.post('/', verifyAdminToken, requirePermission('transactions', 'create'), async (req, res) => {
  try {
    const transactionData = {
      ...req.body,
      createdById: req.adminUser.id,
      updatedById: req.adminUser.id
    };

    const transaction = await Transaction.create(transactionData);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/refund
 * @desc    Refund transaction
 * @access  Private (Admin)
 */
router.post('/:id/refund', verifyAdminToken, requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { amount, reason, refundMethod } = req.body;
    const transaction = await Transaction.findByPk(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed transactions can be refunded'
      });
    }

    await transaction.refundTransaction({
      amount: amount || transaction.amountTotal,
      reason,
      refundMethod,
      refundTransactionId: `REF-${transaction.transactionNumber}`
    }, req.adminUser.id);

    res.json({
      success: true,
      message: 'Transaction refunded successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error refunding transaction:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to refund transaction',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/notes
 * @desc    Add note to transaction
 * @access  Private (Admin, Editor)
 */
router.post('/:id/notes', verifyAdminToken, requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { note, isInternal } = req.body;
    const transaction = await Transaction.findByPk(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.addNote(note, req.adminUser.id, isInternal !== false);

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
});

export default router;
