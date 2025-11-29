import express from 'express';
import Ticket from '../models/Ticket.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(adminAuth);

/**
 * @route   GET /api/admin/tickets
 * @desc    Get all tickets with filtering and pagination
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/', requirePermission('tickets', 'view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      eventId,
      poiId,
      purchaseStartDate,
      purchaseEndDate,
      validFrom,
      validUntil,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isDeleted: false };

    // Search in ticket number or holder name
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { 'holder.firstName': { $regex: search, $options: 'i' } },
        { 'holder.lastName': { $regex: search, $options: 'i' } },
        { 'holder.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    if (eventId) {
      filter.event = eventId;
    }

    if (poiId) {
      filter.poi = poiId;
    }

    // Purchase date range
    if (purchaseStartDate || purchaseEndDate) {
      filter.purchaseDate = {};
      if (purchaseStartDate) {
        filter.purchaseDate.$gte = new Date(purchaseStartDate);
      }
      if (purchaseEndDate) {
        filter.purchaseDate.$lte = new Date(purchaseEndDate);
      }
    }

    // Validity range
    if (validFrom) {
      filter['validity.from'] = { $gte: new Date(validFrom) };
    }
    if (validUntil) {
      filter['validity.until'] = { $lte: new Date(validUntil) };
    }

    // POI owner can only see their POIs
    if (req.admin.role === 'poi_owner') {
      filter.poi = { $in: req.admin.ownedPOIs };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('event', 'title startDate location')
        .populate('poi', 'name location')
        .populate('holder.userId', 'profile email')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/tickets/stats
 * @desc    Get ticket statistics
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/stats', requirePermission('tickets', 'view'), async (req, res) => {
  try {
    const { eventId, poiId, startDate, endDate } = req.query;

    const filter = { isDeleted: false };
    if (eventId) filter.event = eventId;
    if (poiId) filter.poi = poiId;
    if (req.admin.role === 'poi_owner') {
      filter.poi = { $in: req.admin.ownedPOIs };
    }

    const dateFilter = { ...filter };
    if (startDate || endDate) {
      dateFilter.purchaseDate = {};
      if (startDate) dateFilter.purchaseDate.$gte = new Date(startDate);
      if (endDate) dateFilter.purchaseDate.$lte = new Date(endDate);
    }

    const [
      overview,
      byStatus,
      byType,
      byEvent,
      recentSales
    ] = await Promise.all([
      // Overview stats
      Ticket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            used: {
              $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
            },
            expired: {
              $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            totalRevenue: { $sum: '$pricing.finalPrice' },
            avgPrice: { $avg: '$pricing.finalPrice' }
          }
        }
      ]),

      // By status
      Ticket.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // By type
      Ticket.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$type', count: { $sum: 1 }, revenue: { $sum: '$pricing.finalPrice' } } },
        { $sort: { count: -1 } }
      ]),

      // By event
      Ticket.aggregate([
        { $match: { ...dateFilter, event: { $exists: true } } },
        { $group: { _id: '$event', count: { $sum: 1 }, revenue: { $sum: '$pricing.finalPrice' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'events',
            localField: '_id',
            foreignField: '_id',
            as: 'eventData'
          }
        }
      ]),

      // Recent ticket sales
      Ticket.find(dateFilter)
        .sort({ purchaseDate: -1 })
        .limit(10)
        .populate('event', 'title')
        .populate('poi', 'name')
        .select('ticketNumber type pricing purchaseDate holder')
    ]);

    res.json({
      success: true,
      data: {
        overview: overview[0] || {
          total: 0,
          active: 0,
          used: 0,
          expired: 0,
          cancelled: 0,
          totalRevenue: 0,
          avgPrice: 0
        },
        byStatus,
        byType,
        byEvent,
        recentSales
      }
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/tickets/:id
 * @desc    Get single ticket by ID
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/:id', requirePermission('tickets', 'view'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate('event', 'title startDate location organizer')
      .populate('poi', 'name location contact')
      .populate('holder.userId', 'profile email')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .populate('updatedBy', 'profile.firstName profile.lastName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // POI owner can only view their own POIs
    if (req.admin.role === 'poi_owner' && !req.admin.ownedPOIs.includes(ticket.poi?._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }

    res.json({
      success: true,
      data: { ticket }
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets
 * @desc    Create new ticket
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/', requirePermission('tickets', 'create'), async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    };

    // POI owner can only create for their POIs
    if (req.admin.role === 'poi_owner' && req.body.poi && !req.admin.ownedPOIs.includes(req.body.poi)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create ticket for this POI'
      });
    }

    const ticket = new Ticket(ticketData);
    await ticket.save();

    await ticket.populate(['event', 'poi']);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create ticket',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/tickets/:id
 * @desc    Update ticket
 * @access  Private (Admin, Editor, POI Owner)
 */
router.put('/:id', requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // POI owner can only edit their own POIs
    if (req.admin.role === 'poi_owner' && ticket.poi && !req.admin.ownedPOIs.includes(ticket.poi.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this ticket'
      });
    }

    // Update fields
    const allowedUpdates = [
      'holder', 'validity', 'pricing', 'addOns',
      'specialFeatures', 'notes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        ticket[field] = req.body[field];
      }
    });

    ticket.updatedBy = req.admin._id;
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/:id/use
 * @desc    Mark ticket as used (scan/validate)
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/use', requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const { scanInfo } = req.body;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used'
      });
    }

    if (ticket.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Ticket cannot be used. Current status: ${ticket.status}`
      });
    }

    await ticket.use(req.admin._id, scanInfo);

    res.json({
      success: true,
      message: 'Ticket validated successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error using ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to validate ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/:id/cancel
 * @desc    Cancel ticket
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/cancel', requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const { reason, cancelledBy, refund } = req.body;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.cancel(reason, cancelledBy || 'admin', refund, req.admin._id);

    res.json({
      success: true,
      message: 'Ticket cancelled successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to cancel ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/:id/transfer
 * @desc    Transfer ticket to new holder
 * @access  Private (Admin, Editor)
 */
router.post('/:id/transfer', requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const { newHolder, reason } = req.body;

    if (!newHolder || !newHolder.email || !newHolder.firstName || !newHolder.lastName) {
      return res.status(400).json({
        success: false,
        message: 'New holder information (email, firstName, lastName) is required'
      });
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.transfer(newHolder, 'admin', reason, req.admin._id);

    res.json({
      success: true,
      message: 'Ticket transferred successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error transferring ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to transfer ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/:id/resend
 * @desc    Resend ticket delivery
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/resend', requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const { method } = req.body;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Update delivery info
    if (method) {
      ticket.delivery.method = method;
    }
    ticket.delivery.sentAt = new Date();
    ticket.delivery.status = 'sent';
    ticket.updatedBy = req.admin._id;

    await ticket.save();

    // TODO: Trigger actual email/SMS sending

    res.json({
      success: true,
      message: 'Ticket resent successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Error resending ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to resend ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/:id/notes
 * @desc    Add note to ticket
 * @access  Private (Admin, Editor, POI Owner)
 */
router.post('/:id/notes', requirePermission('tickets', 'edit'), async (req, res) => {
  try {
    const { note } = req.body;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (!ticket.adminNotes) {
      ticket.adminNotes = [];
    }

    ticket.adminNotes.push({
      note,
      createdBy: req.admin._id,
      createdAt: new Date()
    });

    ticket.updatedBy = req.admin._id;
    await ticket.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { ticket }
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
 * @route   GET /api/admin/tickets/validate/:ticketNumber
 * @desc    Validate ticket by number or QR code
 * @access  Private (Admin, Editor, POI Owner)
 */
router.get('/validate/:ticketNumber', requirePermission('tickets', 'view'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      $or: [
        { ticketNumber: req.params.ticketNumber },
        { qrCode: req.params.ticketNumber }
      ],
      isDeleted: false
    })
      .populate('event', 'title startDate')
      .populate('poi', 'name');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check validity
    const isValid = ticket.isValid;
    const now = new Date();
    const isInValidityPeriod =
      (!ticket.validity.from || now >= ticket.validity.from) &&
      (!ticket.validity.until || now <= ticket.validity.until);

    res.json({
      success: true,
      data: {
        ticket,
        validation: {
          isValid,
          isInValidityPeriod,
          canBeUsed: isValid && isInValidityPeriod && ticket.status === 'active',
          message: ticket.status === 'used'
            ? 'Ticket already used'
            : !isValid
              ? 'Ticket is not valid'
              : !isInValidityPeriod
                ? 'Ticket is outside validity period'
                : 'Ticket is valid'
        }
      }
    });
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate ticket',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/tickets/:id
 * @desc    Soft delete ticket
 * @access  Private (Admin)
 */
router.delete('/:id', requirePermission('tickets', 'delete'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.softDelete(req.admin._id);

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete ticket',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/tickets/bulk-cancel
 * @desc    Bulk cancel tickets
 * @access  Private (Admin)
 */
router.post('/bulk-cancel', requirePermission('tickets', 'delete'), async (req, res) => {
  try {
    const { ticketIds, reason } = req.body;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ticket IDs array is required'
      });
    }

    const tickets = await Ticket.find({
      _id: { $in: ticketIds },
      isDeleted: false
    });

    const cancelPromises = tickets.map(ticket =>
      ticket.cancel(reason, 'admin', { refund: false }, req.admin._id)
    );

    await Promise.all(cancelPromises);

    res.json({
      success: true,
      message: `${tickets.length} tickets cancelled successfully`,
      data: { cancelledCount: tickets.length }
    });
  } catch (error) {
    console.error('Error bulk cancelling tickets:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to cancel tickets',
      error: error.message
    });
  }
});

export default router;
