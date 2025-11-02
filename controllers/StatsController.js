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
