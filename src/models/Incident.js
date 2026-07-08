import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    trim: true,
  },
  companyId: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userName: {
    type: String,
    default: 'Anonymous',
  },
  gestureDetected: {
    type: String,
    default: 'SOS',
  },
  location: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
  },
  locationName: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active',
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'critical',
  },
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1296000, // TTL: 15 days (15 * 24 * 60 * 60 = 1,296,000 seconds)
  },
  resolvedAt: {
    type: Date,
  },
});

IncidentSchema.index({ companyId: 1, createdAt: -1 });
IncidentSchema.index({ vehicleId: 1 });
// MongoDB TTL index — automatically deletes documents 15 days after createdAt
IncidentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1296000 });

export default mongoose.models.Incident || mongoose.model('Incident', IncidentSchema);
