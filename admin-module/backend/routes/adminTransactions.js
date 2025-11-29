import express from 'express';
import Transaction from '../models/Transaction.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(adminAuth);

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with filtering and pagination
 * @access  Private (Admin, Editor)
 */
router.get('/', requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      paymentMethod,
      provider,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Search in transaction number, customer email, or external ID
    if (search) {
      filter.$or = [
        { transactionNumber: { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { externalTransactionId: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (provider) {
      filter['provider.name'] = provider;
    }

    // Date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Amount range
    if (minAmount || maxAmount) {
      filter['amount.total'] = {};
      if (minAmount) {
        filter['amount.total'].$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter['amount.total'].$lte = parseFloat(maxAmount);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('booking', 'bookingNumber customer')
        .populate('ticket', 'ticketNumber')
        .populate('reservation', 'reservationNumber')
        .populate('customer.userId', 'profile email')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

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
router.get('/stats', requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const filter = {};
    if (type) filter.type = type;

    const dateFilter = { ...filter };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      overview,
      byStatus,
      byType,
      byPaymentMethod,
      byProvider,
      revenueByDate,
      pendingReviews,
      unreconciledTransactions
    ] = await Promise.all([
      // Overview stats
      Transaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $in: ['$status', ['pending', 'processing', 'authorized']] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $in: ['$status', ['failed', 'cancelled']] }, 1, 0] }
            },
            refunded: {
              $sum: { $cond: [{ $in: ['$status', ['refunded', 'partially_refunded']] }, 1, 0] }
            },
            disputed: {
              $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'completed'] },
                  '$amount.total',
                  0
                ]
              }
            },
            totalRefunded: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['refunded', 'partially_refunded']] },
                  { $ifNull: ['$refund.amount', 0] },
                  0
                ]
              }
            },
            avgTransactionValue: { $avg: '$amount.total' },
            totalProcessingFees: { $sum: '$amount.processingFee' }
          }
        }
      ]),

      // By status
      Transaction.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // By type
      Transaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount.total' }
          }
        }
      ]),

      // By payment method
      Transaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount.total' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // By provider
      Transaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$provider.name',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount.total' }
          }
        }
      ]),

      // Revenue by date (last 30 days or custom range)
      Transaction.getRevenueByDateRange(
        startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate ? new Date(endDate) : new Date()
      ),

      // Pending fraud reviews
      Transaction.getPendingReviews(),

      // Unreconciled transactions
      Transaction.getUnreconciledTransactions(new Date())
    ]);

    res.json({
      success: true,
      data: {
        overview: overview[0] || {
          total: 0,
          completed: 0,
          pending: 0,
          failed: 0,
          refunded: 0,
          disputed: 0,
          totalRevenue: 0,
          totalRefunded: 0,
          avgTransactionValue: 0,
          totalProcessingFees: 0
        },
        byStatus,
        byType,
        byPaymentMethod,
        byProvider,
        revenueByDate,
        pendingReviewsCount: pendingReviews.length,
        unreconciledCount: unreconciledTransactions.length
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
 * @route   GET /api/admin/transactions/today
 * @desc    Get today's transactions
 * @access  Private (Admin, Editor)
 */
router.get('/today', requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const transactions = await Transaction.getTodayTransactions(filter)
      .populate('booking', 'bookingNumber')
      .populate('customer.userId', 'profile');

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    console.error('Error fetching today\'s transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s transactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/transactions/pending-reviews
 * @desc    Get transactions pending fraud review
 * @access  Private (Admin)
 */
router.get('/pending-reviews', requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const transactions = await Transaction.getPendingReviews()
      .populate('booking', 'bookingNumber')
      .populate('customer.userId', 'profile');

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending reviews',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/transactions/unreconciled
 * @desc    Get unreconciled transactions
 * @access  Private (Admin)
 */
router.get('/unreconciled', requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const beforeDate = req.query.beforeDate
      ? new Date(req.query.beforeDate)
      : new Date();

    const transactions = await Transaction.getUnreconciledTransactions(beforeDate)
      .populate('booking', 'bookingNumber');

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    console.error('Error fetching unreconciled transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unreconciled transactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/transactions/:id
 * @desc    Get single transaction by ID
 * @access  Private (Admin, Editor)
 */
router.get('/:id', requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('booking', 'bookingNumber customer items pricing')
      .populate('ticket', 'ticketNumber holder')
      .populate('reservation', 'reservationNumber guest')
      .populate('customer.userId', 'profile email phone')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .populate('updatedBy', 'profile.firstName profile.lastName')
      .populate('refund.initiatedBy', 'profile.firstName profile.lastName')
      .populate('fraudCheck.reviewedBy', 'profile.firstName profile.lastName')
      .populate('notes.createdBy', 'profile.firstName profile.lastName');

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
router.post('/', requirePermission('transactions', 'create'), async (req, res) => {
  try {
    const transactionData = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        source: 'admin'
      },
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    };

    const transaction = new Transaction(transactionData);
    await transaction.save();

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
router.post('/:id/refund', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { amount, reason, refundMethod } = req.body;

    const transaction = await Transaction.findById(req.params.id);

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

    await transaction.refundTransaction(
      {
        amount: amount || transaction.amount.total,
        reason,
        refundMethod,
        refundTransactionId: `REF-${transaction.transactionNumber}`
      },
      req.admin._id
    );

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
 * @route   POST /api/admin/transactions/:id/dispute
 * @desc    Initiate dispute for transaction
 * @access  Private (Admin)
 */
router.post('/:id/dispute', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { reason, evidence } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.initiateDispute(
      { reason, evidence },
      req.admin._id
    );

    res.json({
      success: true,
      message: 'Dispute initiated successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error initiating dispute:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to initiate dispute',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/dispute/resolve
 * @desc    Resolve dispute
 * @access  Private (Admin)
 */
router.post('/:id/dispute/resolve', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { resolution, won } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (!transaction.dispute?.isDisputed) {
      return res.status(400).json({
        success: false,
        message: 'No active dispute found'
      });
    }

    await transaction.resolveDispute(resolution, won, req.admin._id);

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to resolve dispute',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/flag-review
 * @desc    Flag transaction for fraud review
 * @access  Private (Admin)
 */
router.post('/:id/flag-review', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { reason } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.flagForReview(reason, req.admin._id);

    res.json({
      success: true,
      message: 'Transaction flagged for review',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error flagging transaction:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to flag transaction',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/approve-review
 * @desc    Approve transaction after fraud review
 * @access  Private (Admin)
 */
router.post('/:id/approve-review', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { notes } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.approveAfterReview(notes, req.admin._id);

    res.json({
      success: true,
      message: 'Transaction approved',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error approving transaction:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to approve transaction',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/reconcile
 * @desc    Reconcile transaction
 * @access  Private (Admin)
 */
router.post('/:id/reconcile', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { batchId, settlementDate } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.reconcile(
      { batchId, settlementDate: new Date(settlementDate) },
      req.admin._id
    );

    res.json({
      success: true,
      message: 'Transaction reconciled successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Error reconciling transaction:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to reconcile transaction',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/notes
 * @desc    Add note to transaction
 * @access  Private (Admin, Editor)
 */
router.post('/:id/notes', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { note, isInternal } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.addNote(note, req.admin._id, isInternal !== false);

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

/**
 * @route   POST /api/admin/transactions/bulk-reconcile
 * @desc    Bulk reconcile transactions
 * @access  Private (Admin)
 */
router.post('/bulk-reconcile', requirePermission('transactions', 'edit'), async (req, res) => {
  try {
    const { transactionIds, batchId, settlementDate } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction IDs array is required'
      });
    }

    const transactions = await Transaction.find({
      _id: { $in: transactionIds },
      status: 'completed',
      'reconciliation.isReconciled': false
    });

    const reconcilePromises = transactions.map(transaction =>
      transaction.reconcile(
        { batchId, settlementDate: new Date(settlementDate) },
        req.admin._id
      )
    );

    await Promise.all(reconcilePromises);

    res.json({
      success: true,
      message: `${transactions.length} transactions reconciled successfully`,
      data: { reconciledCount: transactions.length }
    });
  } catch (error) {
    console.error('Error bulk reconciling transactions:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to reconcile transactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/transactions/export
 * @desc    Export transactions to CSV
 * @access  Private (Admin)
 */
router.get('/export', requirePermission('transactions', 'view'), async (req, res) => {
  try {
    const { startDate, endDate, status, type } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // TODO: Implement CSV export logic
    // For now, return JSON

    res.json({
      success: true,
      data: { transactions },
      message: 'CSV export will be implemented'
    });
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: error.message
    });
  }
});

export default router;
