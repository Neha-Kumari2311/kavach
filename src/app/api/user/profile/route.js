import { apiJson, handleApiError, requireSession } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

/**
 * GET /api/user/profile
 * Get the current authenticated user's profile
 */
export async function GET() {
  try {
    const session = await requireSession('Please log in to view your profile');

    await connectDB();

    const user = await User.findById(session.user.id).select('name email phone role createdAt').lean();

    if (!user) {
      return apiJson({ error: 'User not found' }, 404);
    }

    return apiJson({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return handleApiError(error, 'Failed to load profile', 500);
  }
}

/**
 * PUT /api/user/profile
 * Update the current authenticated user's profile
 * 
 * Body:
 * - name: string (required)
 * - phone: string (required, 10-digit)
 * - email: string (optional, valid format)
 */
export async function PUT(request) {
  try {
    const session = await requireSession('Please log in to update your profile');

    const body = await request.json();
    const { name, phone, email } = body;

    // Validation
    if (!name || !name.trim()) {
      return apiJson({ error: 'Name is required' }, 400);
    }

    if (name.trim().length < 2) {
      return apiJson({ error: 'Name must be at least 2 characters' }, 400);
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      return apiJson({ error: 'Please provide a valid 10-digit phone number' }, 400);
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return apiJson({ error: 'Please provide a valid email address' }, 400);
    }

    await connectDB();

    // Check phone uniqueness (excluding current user)
    if (phone) {
      const existingPhone = await User.findOne({ phone, _id: { $ne: session.user.id } });
      if (existingPhone) {
        return apiJson({ error: 'This phone number is already taken by another user' }, 409);
      }
    }

    // Check email uniqueness (excluding current user) if provided
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: session.user.id } });
      if (existingEmail) {
        return apiJson({ error: 'This email is already taken by another user' }, 409);
      }
    }

    // Update user
    const updateData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : null,
    };

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('name email phone role');

    if (!updatedUser) {
      return apiJson({ error: 'User not found' }, 404);
    }

    console.log(`[Profile] Updated profile for user ${session.user.id}`);

    return apiJson({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return apiJson({ error: `This ${field || 'value'} is already in use` }, 409);
    }
    return handleApiError(error, 'Failed to update profile', 500);
  }
}
