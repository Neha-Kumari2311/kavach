import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from './mongodb';
import User from '@/models/User';

/**
 * NextAuth configuration for Kavach platform
 * Using JWT session strategy with Credentials Provider
 * Users are stored in MongoDB
 * Supports login via email OR phone number
 */
export const authOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          throw new Error('Please provide email/phone and password');
        }

        try {
          // Connect to database
          await connectDB();

          const login = credentials.login.trim().toLowerCase();

          // Determine if input is email or phone
          const isEmail = /^\S+@\S+\.\S+$/.test(login);
          const isPhone = /^\d{10}$/.test(login);

          if (!isEmail && !isPhone) {
            throw new Error('Please enter a valid email or 10-digit phone number');
          }

          // Find user by email or phone and include password field
          const query = isEmail ? { email: login } : { phone: login };
          const user = await User.findOne(query).select('+password');

          if (!user) {
            throw new Error('Invalid credentials');
          }

          // Compare password
          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            throw new Error('Invalid credentials');
          }

          // Return user object (password will not be included)
          return {
            id: user._id.toString(),
            email: user.email || '',
            phone: user.phone || '',
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error(error.message || 'Authentication failed');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.phone = user.phone;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Add token data to session
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.phone = token.phone;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    // Custom pages can be configured here
    // signIn: '/auth/signin',
    // signOut: '/auth/signout',
    // error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};

// NextAuth handler is created in the API route file, not here.
// This file only exports authOptions for use in API routes and middleware.
