import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Incident from '@/models/Incident';

// POST — Create a new incident (triggered from dashcam SOS)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { vehicleId, companyId, latitude, longitude, gestureDetected, locationName } = body;

    if (!vehicleId || !companyId) {
      return NextResponse.json({ error: 'vehicleId and companyId are required' }, { status: 400 });
    }

    await connectDB();

    const incident = await Incident.create({
      vehicleId,
      companyId,
      userId: session?.user?.id || null,
      userName: session?.user?.name || 'Anonymous Passenger',
      gestureDetected: gestureDetected || 'SOS',
      location: {
        latitude: latitude || 0,
        longitude: longitude || 0,
      },
      locationName: locationName || '',
      status: 'active',
      severity: 'critical',
    });

    return NextResponse.json({
      success: true,
      incident: {
        id: incident._id,
        vehicleId: incident.vehicleId,
        companyId: incident.companyId,
        status: incident.status,
        createdAt: incident.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create incident error:', error);
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
  }
}

// PATCH — Update incident status (acknowledge/resolve)
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'company' && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized — company or admin role required' }, { status: 401 });
    }

    const body = await request.json();
    const { incidentId, status, notes } = body;

    if (!incidentId || !status) {
      return NextResponse.json({ error: 'incidentId and status are required' }, { status: 400 });
    }

    if (!['acknowledged', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Status must be acknowledged or resolved' }, { status: 400 });
    }

    await connectDB();

    const update = { status };
    if (status === 'resolved') {
      update.resolvedAt = new Date();
    }
    if (notes) {
      update.notes = notes;
    }

    const incident = await Incident.findByIdAndUpdate(incidentId, update, { new: true });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      incident: {
        id: incident._id.toString(),
        status: incident.status,
        resolvedAt: incident.resolvedAt,
      },
    });
  } catch (error) {
    console.error('Update incident error:', error);
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}

// GET — Fetch incidents (company dashboard uses this with ?companyId=xxx)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');

    await connectDB();

    const query = {};
    if (companyId) query.companyId = companyId;
    if (status) query.status = status;

    // If user is a company, show their incidents
    if (session.user.role === 'company') {
      query.companyId = session.user.companyId || session.user.id;
    }

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      incidents: incidents.map((inc) => ({
        id: inc._id.toString(),
        vehicleId: inc.vehicleId,
        companyId: inc.companyId,
        userName: inc.userName,
        gestureDetected: inc.gestureDetected,
        location: inc.location,
        locationName: inc.locationName,
        status: inc.status,
        severity: inc.severity,
        createdAt: inc.createdAt,
        resolvedAt: inc.resolvedAt,
      })),
    });
  } catch (error) {
    console.error('Fetch incidents error:', error);
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}
