import { apiJson, handleApiError } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { isValidEmail } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register
 * Register a new user
 * 
 * Body:
 * - name: string (required)
 * - email: string (required, must be valid email)
 * - password: string (required, min 6 characters)
 * - accountType: string (required, 'individual' or 'company')
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, accountType } = body;

    // Map accountType to role
    let role = 'user';
    if (accountType === 'company') {
      role = 'company';
    } else if (accountType === 'individual') {
      role = 'user';
    }

    // Validation
    if (!name || !email || !password || !accountType) {
      return apiJson(
        { error: 'Name, email, password, and account type are required' },
        400
      );
    }

    // Validate accountType
    if (accountType !== 'individual' && accountType !== 'company') {
      return apiJson(
        { error: 'Account type must be either "individual" or "company"' },
        400
      );
    }

    if (!isValidEmail(email)) {
      return apiJson({ error: 'Please provide a valid email address' }, 400);
    }

    if (password.length < 6) {
      return apiJson({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return apiJson({ error: 'User with this email already exists' }, 409);
    }

    // Create new user
    // Password will be automatically hashed by the pre-save hook
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
    });

    // Return user data (password is excluded by default)
    return apiJson(
      {
        message: 'User registered successfully',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    // Preserve prior semantics (409 for duplicates, 400 for validation, 500 otherwise)
    if (error?.code === 11000) {
      return apiJson({ error: 'User with this email already exists' }, 409);
    }
    return handleApiError(error, 'Registration failed. Please try again.', 500);
  }
}
