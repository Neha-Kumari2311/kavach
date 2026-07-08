import connectDB from '@/lib/mongodb';
import SOS from '@/models/SOS';
import User from '@/models/User';

export async function createSosEvent({ userId, latitude, longitude }) {
  await connectDB();
  return SOS.create({
    userId,
    latitude,
    longitude,
    status: 'active',
  });
}

export async function listSosEventsForUser({ userId, status }) {
  await connectDB();
  const query = {};

  // If userId is provided, filter by it; otherwise return all (admin view)
  if (userId) {
    query.userId = userId;
  }

  if (status && (status === 'active' || status === 'resolved')) {
    query.status = status;
  }

  const events = await SOS.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('userId', 'name email phone')
    .lean();

  // Map populated user data to a flat userName field
  return events.map((event) => ({
    ...event,
    userName: event.userId?.name || 'Unknown',
    userId: event.userId?._id || event.userId,
  }));
}

export async function resolveSosEvent(sosId) {
  await connectDB();
  return SOS.findByIdAndUpdate(
    sosId,
    { status: 'resolved' },
    { new: true }
  );
}

