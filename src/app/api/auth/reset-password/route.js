import { apiJson, handleApiError } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/reset-password
 * Reset a user's password (MVP — no OTP required)
 * 
 * Body:
 * - login: string (email or phone number)
 * - newPassword: string (min 6 characters)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { login, newPassword } = body;

    // Validation
    if (!login || !newPassword) {
      return apiJson(
        { error: 'Email/phone and new password are required' },
        400
      );
    }

    if (newPassword.length < 6) {
      return apiJson(
        { error: 'Password must be at least 6 characters' },
        400
      );
    }

    const loginTrimmed = login.trim().toLowerCase();

    // Determine if input is email or phone
    const isEmail = /^\S+@\S+\.\S+$/.test(loginTrimmed);
    const isPhone = /^\d{10}$/.test(loginTrimmed);

    if (!isEmail && !isPhone) {
      return apiJson(
        { error: 'Please enter a valid email or 10-digit phone number' },
        400
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email or phone
    const query = isEmail ? { email: loginTrimmed } : { phone: loginTrimmed };
    const user = await User.findOne(query).select('+password');

    if (!user) {
      return apiJson(
        { error: 'No account found with this email/phone number' },
        404
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password directly (bypass the pre-save hook since we're hashing manually)
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    console.log(`[Reset Password] Password reset for user ${user._id}`);

    return apiJson({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return handleApiError(error, 'Password reset failed. Please try again.', 500);
  }
}
