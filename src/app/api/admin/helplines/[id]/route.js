import { apiJson, handleApiError, requireRole, requireSession } from '@/lib/api-helpers';
import { deleteHelplineById, updateHelplineById } from '@/lib/services/helpline-service';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/helplines/:id
 * Update a helpline (Admin only)
 */
export async function PUT(request, { params }) {
  try {
    // Validate session and admin role
    const session = await requireSession('Unauthorized. Please log in to continue.');
    requireRole(session, 'admin', 'Forbidden. Admin access required.');

    const { id } = params;

    if (!id) {
      return apiJson({ error: 'Helpline ID is required' }, 400);
    }

    const body = await request.json();
    const { state, category, phoneNumber, description, isActive } = body;

    const helpline = await updateHelplineById(id, {
      state,
      category,
      phoneNumber,
      description,
      isActive,
    });

    if (!helpline) {
      return apiJson({ error: 'Helpline not found' }, 404);
    }

    return apiJson(
      {
        message: 'Helpline updated successfully',
        helpline: {
          id: helpline._id.toString(),
          state: helpline.state,
          category: helpline.category,
          phoneNumber: helpline.phoneNumber,
          description: helpline.description,
          isActive: helpline.isActive,
          updatedAt: helpline.updatedAt,
        },
      },
      200
    );
  } catch (error) {
    console.error('Helpline update error:', error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return apiJson({ error: 'Invalid helpline ID' }, 400);
    }

    return handleApiError(error, 'Failed to update helpline. Please try again.', 500);
  }
}

/**
 * DELETE /api/admin/helplines/:id
 * Delete a helpline (Admin only)
 */
export async function DELETE(request, { params }) {
  try {
    // Validate session and admin role
    const session = await requireSession('Unauthorized. Please log in to continue.');
    requireRole(session, 'admin', 'Forbidden. Admin access required.');

    const { id } = params;

    if (!id) {
      return apiJson({ error: 'Helpline ID is required' }, 400);
    }

    const helpline = await deleteHelplineById(id);

    if (!helpline) {
      return apiJson({ error: 'Helpline not found' }, 404);
    }

    return apiJson(
      {
        message: 'Helpline deleted successfully',
        helplineId: id,
      },
      200
    );
  } catch (error) {
    console.error('Helpline deletion error:', error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return apiJson({ error: 'Invalid helpline ID' }, 400);
    }

    return handleApiError(error, 'Failed to delete helpline. Please try again.', 500);
  }
}
