import { apiJson, handleApiError, requireSession } from '@/lib/api-helpers';
import { createSosEvent, listSosEventsForUser, resolveSosEvent } from '@/lib/services/sos-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sos
 * Create a new SOS emergency event
 * 
 * Body:
 * - latitude: number (required, -90 to 90)
 * - longitude: number (required, -180 to 180)
 */
export async function POST(request) {
  try {
    const session = await requireSession('Unauthorized. Please log in to continue.');

    const body = await request.json();
    const { latitude, longitude } = body;

    // Validation
    if (latitude === undefined || longitude === undefined) {
      return apiJson({ error: 'Latitude and longitude are required' }, 400);
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return apiJson({ error: 'Latitude and longitude must be numbers' }, 400);
    }

    if (latitude < -90 || latitude > 90) {
      return apiJson({ error: 'Latitude must be between -90 and 90' }, 400);
    }

    if (longitude < -180 || longitude > 180) {
      return apiJson({ error: 'Longitude must be between -180 and 180' }, 400);
    }

    const sosEvent = await createSosEvent({
      userId: session.user.id,
      latitude,
      longitude,
    });

    // TODO: Send notifications to trusted contacts
    // TODO: Alert local authorities
    // TODO: Send SMS/Email notifications

    return apiJson(
      {
        message: 'SOS alert has been sent successfully',
        sos: {
          id: sosEvent._id.toString(),
          latitude: sosEvent.latitude,
          longitude: sosEvent.longitude,
          status: sosEvent.status,
          createdAt: sosEvent.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('SOS creation error:', error);
    return handleApiError(
      error,
      'Failed to create SOS alert. Please try again.',
      500
    );
  }
}

/**
 * GET /api/sos
 * Get SOS events:
 * - Admin: returns ALL SOS events (for admin dashboard)
 * - Regular user: returns only their own SOS events
 */
export async function GET(request) {
  try {
    const session = await requireSession('Unauthorized');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Optional filter: 'active' or 'resolved'

    // Admin sees all SOS events; regular users see only their own
    const isAdmin = session.user.role === 'admin';
    const sosEvents = await listSosEventsForUser({
      userId: isAdmin ? null : session.user.id,
      status,
    });

    return apiJson({
      sosEvents: sosEvents.map((event) => ({
        id: event._id.toString(),
        userId: event.userId?.toString() || null,
        userName: event.userName || null,
        latitude: event.latitude,
        longitude: event.longitude,
        status: event.status,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    console.error('SOS fetch error:', error);
    return handleApiError(error, 'Failed to fetch SOS events', 500);
  }
}

/**
 * PATCH /api/sos
 * Update SOS event status (Admin only — resolve an active SOS)
 * 
 * Body:
 * - sosId: string (required, the SOS event ID)
 * - status: string (required, 'resolved')
 */
export async function PATCH(request) {
  try {
    const session = await requireSession('Unauthorized');

    // Admin or company (official) can resolve SOS events
    if (session.user.role !== 'admin' && session.user.role !== 'company') {
      return apiJson({ error: 'Admin or company access required to resolve SOS events' }, 403);
    }

    const body = await request.json();
    const { sosId, status } = body;

    if (!sosId || !status) {
      return apiJson({ error: 'sosId and status are required' }, 400);
    }

    if (status !== 'resolved') {
      return apiJson({ error: 'Status can only be changed to "resolved"' }, 400);
    }

    const updatedEvent = await resolveSosEvent(sosId);

    if (!updatedEvent) {
      return apiJson({ error: 'SOS event not found' }, 404);
    }

    return apiJson({
      message: 'SOS event resolved successfully',
      sos: {
        id: updatedEvent._id.toString(),
        status: updatedEvent.status,
        resolvedAt: updatedEvent.updatedAt,
      },
    });
  } catch (error) {
    console.error('SOS resolve error:', error);
    return handleApiError(error, 'Failed to resolve SOS event', 500);
  }
}
