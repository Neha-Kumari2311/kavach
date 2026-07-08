#!/usr/bin/env node

/**
 * Seed Admin User Script
 * ══════════════════════════════════════════════════════
 * Creates a default admin user in the MongoDB database.
 * Run once during initial setup or deployment.
 *
 * Usage:
 *   node scripts/seed-admin.js
 *
 * Environment variables (from .env.local):
 *   MONGODB_URI          — MongoDB connection string (required)
 *   ADMIN_NAME           — Admin display name (default: "Kavach Admin")
 *   ADMIN_EMAIL          — Admin email (default: "admin@kavach.com")
 *   ADMIN_PHONE          — Admin phone, 10 digits (default: "9999999999")
 *   ADMIN_PASSWORD       — Admin password (default: "admin123456")
 *
 * ⚠️  Change the default credentials before deploying to production!
 * ══════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

// ─── Configuration ───────────────────────────────────────────────────────────
const ADMIN_NAME = process.env.ADMIN_NAME || 'Kavach Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@kavach.com';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '9999999999';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const MONGODB_URI = process.env.MONGODB_URI;

// ─── User Schema (inline to avoid ESM/Next.js import issues) ─────────────────
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: null },
    phone: { type: String, unique: true, sparse: true, trim: true, default: null },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'company', 'admin'], default: 'user', required: true },
    companyId: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// ─── Main ────────────────────────────────────────────────────────────────────
async function seedAdmin() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Kavach — Admin Seed Script');
  console.log('══════════════════════════════════════════════════\n');

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    console.log('✅ Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { email: ADMIN_EMAIL.toLowerCase() },
        { phone: ADMIN_PHONE },
      ],
    });

    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('ℹ️  Admin user already exists:');
        console.log(`   Name:  ${existingAdmin.name}`);
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Phone: ${existingAdmin.phone}`);
        console.log(`   Role:  ${existingAdmin.role}`);
        console.log('\n✅ No action needed. Admin is already set up.');
      } else {
        // Promote existing user to admin
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('⬆️  Existing user promoted to admin:');
        console.log(`   Name:  ${existingAdmin.name}`);
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Role:  admin`);
      }
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

      // Create admin user
      const admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL.toLowerCase(),
        phone: ADMIN_PHONE,
        password: hashedPassword,
        role: 'admin',
      });

      console.log('🎉 Admin user created successfully!\n');
      console.log('   ┌──────────────────────────────────────┐');
      console.log(`   │  Name:     ${admin.name.padEnd(26)}│`);
      console.log(`   │  Email:    ${admin.email.padEnd(26)}│`);
      console.log(`   │  Phone:    ${admin.phone.padEnd(26)}│`);
      console.log(`   │  Password: ${ADMIN_PASSWORD.padEnd(26)}│`);
      console.log(`   │  Role:     admin${' '.repeat(21)}│`);
      console.log('   └──────────────────────────────────────┘');
      console.log('\n⚠️  Change the default password in production!');
    }
  } catch (error) {
    if (error.code === 11000) {
      console.error('❌ A user with this email or phone already exists.');
    } else {
      console.error('❌ Error seeding admin:', error.message);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('══════════════════════════════════════════════════\n');
  }
}

seedAdmin();
