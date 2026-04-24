import { apiJson, handleApiError } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { isValidEmail } from '@/lib/utils';

/**
 * POST /api/auth/register
 * Register a new user
 * 
 * Body:
 * - name: string (required)
 * - phone: string (required, 10-digit)
 * - email: string (optional, must be valid email if provided)
 * - password: string (required, min 6 characters)
 * - accountType: string (required, 'individual' or 'company')
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, email, password, accountType } = body;

    // Map accountType to role
    let role = 'user';
    if (accountType === 'company') {
      role = 'company';
    } else if (accountType === 'individual') {
      role = 'user';
    }

    // Validation
    if (!name || !phone || !password || !accountType) {
      return apiJson(
        { error: 'Name, phone, password, and account type are required' },
        400
      );
    }

    // Validate phone
    if (!/^\d{10}$/.test(phone)) {
      return apiJson(
        { error: 'Please provide a valid 10-digit phone number' },
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

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return apiJson({ error: 'Please provide a valid email address' }, 400);
    }

    if (password.length < 6) {
      return apiJson({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Connect to database
    await connectDB();

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return apiJson({ error: 'User with this phone number already exists' }, 409);
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return apiJson({ error: 'User with this email already exists' }, 409);
      }
    }

    // Create new user
    // Password will be automatically hashed by the pre-save hook
    const user = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : null,
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
          phone: user.phone,
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
      const field = Object.keys(error.keyPattern || {})[0];
      return apiJson({ error: `User with this ${field || 'credential'} already exists` }, 409);
    }
    return handleApiError(error, 'Registration failed. Please try again.', 500);
  }
}
