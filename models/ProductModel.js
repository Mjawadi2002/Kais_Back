const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  buyerName: { type: String, trim: true },
  buyerAddress: { type: String, required: true, trim: true },
  buyerPhone: { type: String, required: true, trim: true },
  status: { type: String, enum: ['In Stock','Picked','Out for Delivery','Delivered','Problem','Failed/Returned'], default: 'In Stock' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrData: { type: String },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
