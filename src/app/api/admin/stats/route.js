import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import SOS from '@/models/SOS';
import Incident from '@/models/Incident';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Get real counts from MongoDB
    // SOS Events card shows dashcam-triggered incidents (same as what officials receive)
    const [totalUsers, totalCompanies, totalIncidents, activeIncidents] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'company' }),
      Incident.countDocuments(),
      Incident.countDocuments({ status: 'active' }),
    ]);

    // Today's counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const incidentsToday = await Incident.countDocuments({ createdAt: { $gte: today } });

    return NextResponse.json({
      totalUsers,
      totalCompanies,
      totalSOS: totalIncidents,       // SOS Events = incidents reported to officials
      totalIncidents,
      activeSOS: activeIncidents,
      activeIncidents,
      sosToday: incidentsToday,
      incidentsToday,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
