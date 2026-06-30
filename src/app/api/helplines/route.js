import { apiJson, handleApiError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listPublicHelplines } from '@/lib/services/helpline-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/helplines
 * Get helplines filtered by state (Public/User access)
 * Query params:
 * - state: filter by state (optional, if not provided returns all)
 * - category: filter by category (optional)
 */
export async function GET(request) {
  try {
    // Optional: Validate session (can be public or authenticated)
    await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const helplines = await listPublicHelplines({ state, category });

    return apiJson({
      helplines: helplines.map((helpline) => ({
        id: helpline._id.toString(),
        state: helpline.state,
        category: helpline.category,
        phoneNumber: helpline.phoneNumber,
        description: helpline.description,
      })),
    });
  } catch (error) {
    console.error('Helplines fetch error:', error);
    return handleApiError(error, 'Failed to fetch helplines', 500);
  }
}
