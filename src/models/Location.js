import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Index for efficient queries
LocationSchema.index({ userId: 1, timestamp: -1 });
LocationSchema.index({ timestamp: -1 });

// TTL index to automatically delete old location data after 30 days
LocationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Prevent re-compilation during development
const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);

export default Location;
