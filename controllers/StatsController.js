const Product = require('../models/ProductModel');
const User = require('../models/UserModel');

// GET /api/v1/stats - admin
exports.getStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    // deliveries considered as products that have been assigned or status not 'In Stock'
    const totalDeliveries = await Product.countDocuments({ status: { $ne: 'In Stock' } });
    const totalClients = await User.countDocuments({ role: 'client' });
    const deliveryPersons = await User.countDocuments({ role: 'delivery' });

    // breakdown
    const picked = await Product.countDocuments({ status: 'Picked' });
    const outForDelivery = await Product.countDocuments({ status: 'Out for Delivery' });
    const delivered = await Product.countDocuments({ status: 'Delivered' });
    const problem = await Product.countDocuments({ status: 'Problem' });

    res.json({
      totalProducts,
      totalDeliveries,
      totalClients,
      deliveryPersons,
      breakdown: { picked, outForDelivery, delivered, problem }
    });
  } catch (err) {
    console.error('Stats error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/v1/stats/client - client stats
exports.getClientStats = async (req, res) => {
  try {
    const clientId = req.user.id;
    const now = new Date();

    // Date ranges for timeline analysis
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get client's products statistics
    const totalProducts = await Product.countDocuments({ client: clientId });
    const inStock = await Product.countDocuments({ client: clientId, status: 'In Stock' });
    const picked = await Product.countDocuments({ client: clientId, status: 'Picked' });
    const inTransit = await Product.countDocuments({ 
      client: clientId, 
      status: { $in: ['Out for Delivery', 'Picked'] } 
    });
    const delivered = await Product.countDocuments({ client: clientId, status: 'Delivered' });
    const problem = await Product.countDocuments({ 
      client: clientId, 
      status: { $in: ['Problem', 'Failed/Returned'] } 
    });
    const failed = await Product.countDocuments({ client: clientId, status: 'Failed/Returned' });

    // Timeline analytics - delivered products over time
    const deliveredLast7Days = await Product.countDocuments({
      client: clientId,
      status: 'Delivered',
      updatedAt: { $gte: last7Days }
    });

    const deliveredLast14Days = await Product.countDocuments({
      client: clientId,
      status: 'Delivered',
      updatedAt: { $gte: last14Days }
    });

    const deliveredLast30Days = await Product.countDocuments({
      client: clientId,
      status: 'Delivered',
      updatedAt: { $gte: last30Days }
    });

    // Timeline analytics - problem products over time
    const problemsLast7Days = await Product.countDocuments({
      client: clientId,
      status: { $in: ['Problem', 'Failed/Returned'] },
      updatedAt: { $gte: last7Days }
    });

    const problemsLast14Days = await Product.countDocuments({
      client: clientId,
      status: { $in: ['Problem', 'Failed/Returned'] },
      updatedAt: { $gte: last14Days }
    });

    const problemsLast30Days = await Product.countDocuments({
      client: clientId,
      status: { $in: ['Problem', 'Failed/Returned'] },
      updatedAt: { $gte: last30Days }
    });

    // Monthly trend data - last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthlyProducts = await Product.countDocuments({
        client: clientId,
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });
      
      monthlyData.push(monthlyProducts);
    }

    // Get recent products with more details
    const recentProducts = await Product.find({ client: clientId })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('assignedTo', 'username email')
      .populate('client', 'username email')
      .select('name status createdAt assignedTo buyerName price client');

    // Calculate performance metrics
    const deliveryRate = totalProducts > 0 ? (delivered / totalProducts) * 100 : 0;
    const successRate = totalProducts > 0 ? ((delivered + inTransit) / totalProducts) * 100 : 0;
    const problemRate = totalProducts > 0 ? (problem / totalProducts) * 100 : 0;

    res.json({
      totalProducts,
      inStock,
      picked,
      inTransit,
      delivered,
      problem,
      failed,
      recentProducts,
      timeline: {
        last7Days: deliveredLast7Days,
        last14Days: deliveredLast14Days,
        last30Days: deliveredLast30Days,
        problems7Days: problemsLast7Days,
        problems14Days: problemsLast14Days,
        problems30Days: problemsLast30Days
      },
      monthlyData,
      metrics: {
        deliveryRate: Number(deliveryRate.toFixed(2)),
        successRate: Number(successRate.toFixed(2)),
        problemRate: Number(problemRate.toFixed(2))
      }
    });
  } catch (err) {
    console.error('Client stats error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
