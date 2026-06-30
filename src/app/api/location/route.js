import { apiJson, handleApiError, requireSession } from '@/lib/api-helpers';
import { createLocationEntry, getLatestLocation } from '@/lib/services/location-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/location
 * Store user's current location
 * 
 * Body:
 * - latitude: number (required, -90 to 90)
 * - longitude: number (required, -180 to 180)
 * - timestamp: number (optional, Unix timestamp in milliseconds)
 */
export async function POST(request) {
  try {
    const session = await requireSession('Unauthorized. Please log in to continue.');

    const body = await request.json();
    const { latitude, longitude, timestamp } = body;

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

    const location = await createLocationEntry({
      userId: session.user.id,
      latitude,
      longitude,
      timestamp,
    });

    return apiJson(
      {
        message: 'Location updated successfully',
        location: {
          id: location._id.toString(),
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
        },
      },
      201
    );
  } catch (error) {
    console.error('Location update error:', error);
    return handleApiError(error, 'Failed to update location. Please try again.', 500);
  }
}

/**
 * GET /api/location
 * Get user's latest location
 */
export async function GET(request) {
  try {
    const session = await requireSession('Unauthorized');

    const latestLocation = await getLatestLocation({ userId: session.user.id });

    if (!latestLocation) {
      return apiJson({ error: 'No location data found' }, 404);
    }

    return apiJson({
      location: {
        id: latestLocation._id.toString(),
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        timestamp: latestLocation.timestamp,
      },
    });
  } catch (error) {
    console.error('Location fetch error:', error);
    return handleApiError(error, 'Failed to fetch location', 500);
  }
}
