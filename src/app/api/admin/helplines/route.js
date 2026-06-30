import { apiJson, handleApiError, requireRole, requireSession } from '@/lib/api-helpers';
import { createHelpline, listHelplines } from '@/lib/services/helpline-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/helplines
 * Create a new helpline (Admin only)
 * 
 * Body:
 * - state: string (required)
 * - category: string (required, enum)
 * - phoneNumber: string (required, valid phone format)
 * - description: string (optional)
 * - isActive: boolean (optional, default: true)
 */
export async function POST(request) {
  try {
    // Validate session and admin role
    const session = await requireSession('Unauthorized. Please log in to continue.');
    requireRole(session, 'admin', 'Forbidden. Admin access required.');

    const body = await request.json();
    const { state, category, phoneNumber, description, isActive = true } = body;

    // Validation
    if (!state || !category || !phoneNumber) {
      return apiJson({ error: 'State, category, and phone number are required' }, 400);
    }

    const helpline = await createHelpline({
      state,
      category,
      phoneNumber,
      description,
      isActive,
    });

    return apiJson(
      {
        message: 'Helpline created successfully',
        helpline: {
          id: helpline._id.toString(),
          state: helpline.state,
          category: helpline.category,
          phoneNumber: helpline.phoneNumber,
          description: helpline.description,
          isActive: helpline.isActive,
          createdAt: helpline.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Helpline creation error:', error);
    return handleApiError(error, 'Failed to create helpline. Please try again.', 500);
  }
}

/**
 * GET /api/admin/helplines
 * Get all helplines (Admin only)
 * Query params:
 * - state: filter by state (optional)
 * - category: filter by category (optional)
 * - isActive: filter by active status (optional)
 */
export async function GET(request) {
  try {
    // Validate session and admin role
    const session = await requireSession('Unauthorized');
    requireRole(session, 'admin', 'Forbidden. Admin access required.');

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const helplines = await listHelplines({
      state,
      category,
      isActive: isActive !== null ? isActive === 'true' : null,
    });

    return apiJson({
      helplines: helplines.map((helpline) => ({
        id: helpline._id.toString(),
        state: helpline.state,
        category: helpline.category,
        phoneNumber: helpline.phoneNumber,
        description: helpline.description,
        isActive: helpline.isActive,
        createdAt: helpline.createdAt,
        updatedAt: helpline.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Helplines fetch error:', error);
    return handleApiError(error, 'Failed to fetch helplines', 500);
  }
}
