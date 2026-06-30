import { apiJson, handleApiError, requireSession } from '@/lib/api-helpers';
import { createTrustedContact, listTrustedContacts } from '@/lib/services/trusted-contacts-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trusted-contacts
 * Add a new trusted contact
 * 
 * Body:
 * - name: string (required)
 * - phone: string (required, valid phone format)
 * - relation: string (required)
 */
export async function POST(request) {
  try {
    const session = await requireSession('Unauthorized. Please log in to continue.');

    const body = await request.json();
    const { name, phone, email, relation } = body;

    // Validation
    if (!name || !phone || !relation) {
      return apiJson({ error: 'Name, phone, and relation are required' }, 400);
    }

    // Connect to database
    const contact = await createTrustedContact({
      userId: session.user.id,
      name,
      phone,
      email,
      relation,
    });

    return apiJson(
      {
        message: 'Trusted contact added successfully',
        contact: {
          id: contact._id.toString(),
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          relation: contact.relation,
          createdAt: contact.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Trusted contact creation error:', error);
    return handleApiError(
      error,
      error?.code === 11000
        ? 'A contact with this phone number already exists'
        : 'Failed to add trusted contact. Please try again.',
      500
    );
  }
}

/**
 * GET /api/trusted-contacts
 * Get all trusted contacts for the authenticated user
 */
export async function GET(request) {
  try {
    const session = await requireSession('Unauthorized');

    const contacts = await listTrustedContacts({ userId: session.user.id });

    return apiJson({
      contacts: contacts.map((contact) => ({
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        relation: contact.relation,
        createdAt: contact.createdAt,
      })),
    });
  } catch (error) {
    console.error('Trusted contacts fetch error:', error);
    return handleApiError(error, 'Failed to fetch trusted contacts', 500);
  }
}
