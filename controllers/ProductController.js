require('dotenv').config();
const Product = require('../models/ProductModel');

// create product (client only)
exports.createProduct = async (req, res) => {
  try {
    const { name, price, buyerName, buyerAddress, buyerPhone } = req.body;
    if (!name || price == null || !buyerAddress || !buyerPhone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // client comes from token payload (req.user)
    const clientId = req.user && req.user.id;

    const product = new Product({
      name,
      price,
      buyerName,
      buyerAddress,
      buyerPhone,
      client: clientId,
    });

    // generate QR payload
    const qrPayload = {
      name: product.name,
      price: product.price,
      buyerAddress: product.buyerAddress,
      buyerPhone: product.buyerPhone,
      status: product.status,
      id: product._id,
    };
    product.qrData = JSON.stringify(qrPayload);

    await product.save();

    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// get products (admin gets all, client gets own)
exports.getProducts = async (req, res) => {
  try {
    const role = req.user && req.user.role;
    let products;
    if (role === 'admin') {
      // allow optional filtering by client id: /api/v1/products?client=clientId
      const filter = {};
      if (req.query.client) filter.client = req.query.client;
      products = await Product.find(filter).populate('client', 'name email role').populate('assignedTo', 'name email');
    } else if (role === 'client') {
      products = await Product.find({ client: req.user.id }).populate('client', 'name email').populate('assignedTo', 'name email');
    } else if (role === 'delivery') {
      // delivery person sees only assigned products
      products = await Product.find({ assignedTo: req.user.id }).populate('client', 'name email').populate('assignedTo', 'name email');
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// admin assigns a delivery person to a product
exports.assignDelivery = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const { deliveryPersonId } = req.body;
    if (!deliveryPersonId) return res.status(400).json({ message: 'deliveryPersonId required' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.assignedTo = deliveryPersonId;
    // update status to Out for Delivery when assigned
    product.status = 'Out for Delivery';

    // update QR data too
    const qrPayload = {
      name: product.name,
      price: product.price,
      buyerAddress: product.buyerAddress,
      buyerPhone: product.buyerPhone,
      status: product.status,
      id: product._id,
      assignedTo: product.assignedTo,
    };
    product.qrData = JSON.stringify(qrPayload);

    await product.save();

    const populated = await Product.findById(id).populate('assignedTo', 'name email').populate('client', 'name email');
    res.json({ message: 'Assigned', product: populated });
  } catch (err) {
    console.error('Assign delivery error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// delivery person updates status of assigned product
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['Picked', 'Out for Delivery', 'Delivered', 'Problem', 'Failed/Returned'];
    if (!status || !allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // only assigned delivery person or admin can update
    const role = req.user && req.user.role;
    if (role === 'delivery' && String(product.assignedTo) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    product.status = status;

    // update QR
    const qrPayload = {
      name: product.name,
      price: product.price,
      buyerAddress: product.buyerAddress,
      buyerPhone: product.buyerPhone,
      status: product.status,
      id: product._id,
      assignedTo: product.assignedTo,
    };
    product.qrData = JSON.stringify(qrPayload);

    await product.save();

    const populated = await Product.findById(id).populate('assignedTo', 'name email').populate('client', 'name email');
    res.json({ message: 'Status updated', product: populated });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('client', 'name email');
    if (!product) return res.status(404).json({ message: 'Not found' });
    // permission: admin sees all, client sees own
    const role = req.user && req.user.role;
    if (role === 'admin' || (role === 'client' && String(product.client?._id) === String(req.user.id))) {
      return res.json({ product });
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
