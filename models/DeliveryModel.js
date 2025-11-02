const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    deliveryPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Can be null if not assigned yet
    },

    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled', 'failed'],
      default: 'pending',
      required: true,
    },

    assignedAt: {
      type: Date,
      required: false,
    },

    startedAt: {
      type: Date,
      required: false,
    },

    deliveredAt: {
      type: Date,
      required: false,
    },

    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: 'Tunisia' },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      }
    },

    notes: {
      type: String,
      required: false,
    },

    trackingNumber: {
      type: String,
      unique: true,
      required: true,
    },

    estimatedDeliveryTime: {
      type: Date,
      required: false,
    },

    actualDeliveryTime: {
      type: Date,
      required: false,
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    deliveryFee: {
      type: Number,
      required: false,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate tracking number before saving
DeliverySchema.pre('save', function(next) {
  if (!this.trackingNumber) {
    this.trackingNumber = 'KD' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

// Virtual for delivery duration
DeliverySchema.virtual('deliveryDuration').get(function() {
  if (this.startedAt && this.deliveredAt) {
    return Math.round((this.deliveredAt - this.startedAt) / (1000 * 60 * 60)); // Hours
  }
  return null;
});

// Index for better query performance
DeliverySchema.index({ status: 1, createdAt: -1 });
DeliverySchema.index({ client: 1, status: 1 });
DeliverySchema.index({ deliveryPerson: 1, status: 1 });
DeliverySchema.index({ trackingNumber: 1 });

module.exports = mongoose.model('Delivery', DeliverySchema);