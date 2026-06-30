import { apiJson, handleApiError, requireSession } from '@/lib/api-helpers';
import { deleteTrustedContact } from '@/lib/services/trusted-contacts-service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/trusted-contacts/:id
 * Delete a trusted contact
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireSession('Unauthorized. Please log in to continue.');

    const { id } = params;

    if (!id) {
      return apiJson({ error: 'Contact ID is required' }, 400);
    }

    const { deleted } = await deleteTrustedContact({
      userId: session.user.id,
      contactId: id,
    });

    if (!deleted) {
      return apiJson(
        { error: 'Contact not found or you do not have permission to delete it' },
        404
      );
    }

    return apiJson(
      {
        message: 'Trusted contact deleted successfully',
        contactId: id,
      },
      200
    );
  } catch (error) {
    console.error('Trusted contact deletion error:', error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return apiJson({ error: 'Invalid contact ID' }, 400);
    }

    return handleApiError(
      error,
      'Failed to delete trusted contact. Please try again.',
      500
    );
  }
}
