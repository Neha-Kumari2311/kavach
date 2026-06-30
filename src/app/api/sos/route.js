import { apiJson, handleApiError, requireSession } from '@/lib/api-helpers';
import { createSosEvent, listSosEventsForUser } from '@/lib/services/sos-service';

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
 * Get user's SOS events (optional - for history)
 */
export async function GET(request) {
  try {
    const session = await requireSession('Unauthorized');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Optional filter: 'active' or 'resolved'
    const sosEvents = await listSosEventsForUser({
      userId: session.user.id,
      status,
    });

    return apiJson({
      sosEvents: sosEvents.map((event) => ({
        id: event._id.toString(),
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
