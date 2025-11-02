const Delivery = require('../models/DeliveryModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');

// Get all deliveries with filtering and pagination
exports.getAllDeliveries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      client,
      deliveryPerson,
      product,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (client) filter.client = client;
    if (deliveryPerson) filter.deliveryPerson = deliveryPerson;
    if (product) filter.product = product;
    if (priority) filter.priority = priority;

    // Search functionality
    let searchFilter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      
      // Find users matching search term
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');

      // Find products matching search term
      const matchingProducts = await Product.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      }).select('_id');

      searchFilter = {
        $or: [
          { trackingNumber: searchRegex },
          { notes: searchRegex },
          { 'deliveryAddress.street': searchRegex },
          { 'deliveryAddress.city': searchRegex },
          { client: { $in: matchingUsers.map(u => u._id) } },
          { deliveryPerson: { $in: matchingUsers.map(u => u._id) } },
          { product: { $in: matchingProducts.map(p => p._id) } }
        ]
      };
    }

    // Combine filters
    const finalFilter = search ? { ...filter, ...searchFilter } : filter;

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get deliveries with populated fields
    const deliveries = await Delivery.find(finalFilter)
      .populate('product', 'name description category price qrCode')
      .populate('client', 'name email role')
      .populate('deliveryPerson', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Delivery.countDocuments(finalFilter);

    res.json({
      deliveries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch deliveries', 
      error: error.message 
    });
  }
};

// Get delivery by ID
exports.getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id)
      .populate('product', 'name description category price qrCode imageUrl')
      .populate('client', 'name email phone role')
      .populate('deliveryPerson', 'name email phone role')
      .populate('createdBy', 'name email');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    res.json(delivery);
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch delivery', 
      error: error.message 
    });
  }
};

// Create new delivery
exports.createDelivery = async (req, res) => {
  try {
    const {
      productId,
      clientId,
      deliveryPersonId,
      deliveryAddress,
      notes,
      priority = 'medium',
      estimatedDeliveryTime,
      deliveryFee = 0
    } = req.body;

    // Validate required fields
    if (!productId || !clientId || !deliveryAddress) {
      return res.status(400).json({
        message: 'Product ID, client ID, and delivery address are required'
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Verify client exists and has client role
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Verify delivery person if provided
    if (deliveryPersonId) {
      const deliveryPerson = await User.findById(deliveryPersonId);
      if (!deliveryPerson || deliveryPerson.role !== 'delivery') {
        return res.status(404).json({ message: 'Delivery person not found' });
      }
    }

    // Create delivery
    const delivery = new Delivery({
      product: productId,
      client: clientId,
      deliveryPerson: deliveryPersonId || null,
      deliveryAddress,
      notes,
      priority,
      estimatedDeliveryTime,
      deliveryFee,
      createdBy: req.user.id,
      status: deliveryPersonId ? 'assigned' : 'pending',
      assignedAt: deliveryPersonId ? new Date() : null
    });

    await delivery.save();

    // Populate the response
    await delivery.populate('product', 'name description category price');
    await delivery.populate('client', 'name email');
    await delivery.populate('deliveryPerson', 'name email');

    res.status(201).json({
      message: 'Delivery created successfully',
      delivery
    });

  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ 
      message: 'Failed to create delivery', 
      error: error.message 
    });
  }
};

// Update delivery
exports.updateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating certain fields directly
    delete updates.trackingNumber;
    delete updates.createdBy;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Handle status changes with timestamps
    if (updates.status && updates.status !== delivery.status) {
      switch (updates.status) {
        case 'assigned':
          updates.assignedAt = new Date();
          break;
        case 'in_transit':
          updates.startedAt = new Date();
          break;
        case 'delivered':
          updates.deliveredAt = new Date();
          updates.actualDeliveryTime = new Date();
          break;
      }
    }

    // Update delivery person assignment
    if (updates.deliveryPerson && updates.deliveryPerson !== delivery.deliveryPerson?.toString()) {
      const deliveryPerson = await User.findById(updates.deliveryPerson);
      if (!deliveryPerson || deliveryPerson.role !== 'delivery') {
        return res.status(404).json({ message: 'Invalid delivery person' });
      }
      updates.assignedAt = new Date();
      if (delivery.status === 'pending') {
        updates.status = 'assigned';
      }
    }

    const updatedDelivery = await Delivery.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('product', 'name description category price')
    .populate('client', 'name email')
    .populate('deliveryPerson', 'name email');

    res.json({
      message: 'Delivery updated successfully',
      delivery: updatedDelivery
    });

  } catch (error) {
    console.error('Update delivery error:', error);
    res.status(500).json({ 
      message: 'Failed to update delivery', 
      error: error.message 
    });
  }
};

// Delete delivery
exports.deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Only allow deletion if delivery is pending or cancelled
    if (!['pending', 'cancelled'].includes(delivery.status)) {
      return res.status(400).json({
        message: 'Cannot delete delivery that is in progress or completed'
      });
    }

    await Delivery.findByIdAndDelete(id);

    res.json({ message: 'Delivery deleted successfully' });
  } catch (error) {
    console.error('Delete delivery error:', error);
    res.status(500).json({ 
      message: 'Failed to delete delivery', 
      error: error.message 
    });
  }
};

// Get delivery statistics
exports.getDeliveryStats = async (req, res) => {
  try {
    // Get basic counts
    const totalDeliveries = await Delivery.countDocuments();
    const pendingDeliveries = await Delivery.countDocuments({ status: 'pending' });
    const assignedDeliveries = await Delivery.countDocuments({ status: 'assigned' });
    const inTransitDeliveries = await Delivery.countDocuments({ status: 'in_transit' });
    const deliveredDeliveries = await Delivery.countDocuments({ status: 'delivered' });
    const cancelledDeliveries = await Delivery.countDocuments({ status: 'cancelled' });
    const failedDeliveries = await Delivery.countDocuments({ status: 'failed' });
    
    // Get priority counts
    const highPriorityDeliveries = await Delivery.countDocuments({ priority: 'high' });
    const urgentDeliveries = await Delivery.countDocuments({ priority: 'urgent' });
    
    // Get revenue statistics
    const revenueStats = await Delivery.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$deliveryFee' }, averageDeliveryFee: { $avg: '$deliveryFee' } } }
    ]);
    
    // Get delivery person statistics
    const User = require('../models/UserModel');
    const deliveryPersonCount = await User.countDocuments({ role: 'delivery' });
    
    // Get active delivery persons (those with assigned/in-transit deliveries)
    const activeDeliveryPersonsData = await Delivery.distinct('deliveryPerson', { 
      status: { $in: ['assigned', 'in_transit'] },
      deliveryPerson: { $ne: null }
    });
    
    res.json({
      totalDeliveries,
      pendingDeliveries,
      assignedDeliveries,
      inTransitDeliveries,
      deliveredDeliveries,
      cancelledDeliveries,
      failedDeliveries,
      highPriorityDeliveries,
      urgentDeliveries,
      totalRevenue: revenueStats[0]?.totalRevenue || 0,
      averageDeliveryFee: revenueStats[0]?.averageDeliveryFee || 0,
      deliveryPersonCount,
      activeDeliveryPersons: activeDeliveryPersonsData.length || 0
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch delivery statistics', 
      error: error.message 
    });
  }
};

// Get deliveries for specific user (client or delivery person)
exports.getUserDeliveries = async (req, res) => {
  try {
    const { userId, role } = req.params;
    const { status, limit = 10, page = 1 } = req.query;

    let filter = {};
    
    if (role === 'client') {
      filter.client = userId;
    } else if (role === 'delivery') {
      filter.deliveryPerson = userId;
    } else {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const deliveries = await Delivery.find(filter)
      .populate('product', 'name description category price qrCode')
      .populate('client', 'name email')
      .populate('deliveryPerson', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Delivery.countDocuments(filter);

    res.json({
      deliveries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Get user deliveries error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user deliveries', 
      error: error.message 
    });
  }
};