import { db } from './db';
import { roles, users, superAdminUsers, DEFAULT_PERMISSIONS, permissionsSchema } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Use bcryptjs for maximum cross-platform compatibility
const { default: bcrypt } = await import('bcryptjs');

const SALT_ROUNDS = 12;

// Helper function to create complete permission objects
function createPermissions(overrides: Partial<typeof permissionsSchema._type> = {}) {
  const defaults = permissionsSchema.parse({});
  return { ...defaults, ...overrides };
}

export async function seedDatabase() {
  // Prevent seeding in production unless emergency bootstrap is enabled
  if (process.env.NODE_ENV === 'production' && process.env.EMERGENCY_BOOTSTRAP !== 'true') {
    console.log('🏭 Production environment detected - skipping seedDatabase()');
    return;
  }

  console.log('🌱 Starting database seeding...');

  // Verify database connectivity first
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection verified');
  } catch (connectionError) {
    console.error('❌ Database connection failed:', connectionError);
    console.log('⚠️ Continuing without seeding - some features may not work');
    return false;
  }

  try {
    // Note: Roles are now organization-scoped and created per-organization via seedNewOrganization
    // Global roles are no longer created here
    // Default platform users are created per-organization by seedNewOrganization
    console.log('ℹ️ Roles and users are organization-scoped - created per organization during onboarding');

    // Check if Super Admin users exist
    const existingSuperAdmins = await db
      .select({ id: superAdminUsers.id, username: superAdminUsers.username })
      .from(superAdminUsers);

    // Only create default Super Admin users in dev environment
    if (
      existingSuperAdmins.length === 0 &&
      process.env.NODE_ENV === 'development' &&
      process.env.SEED_DEMO_DATA === 'true'
    ) {
      console.log('Creating default Super Admin user for development...');
      const superAdminPassword = 'admin123'; // Should be changed on first login
      const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, SALT_ROUNDS);

      const superAdminUsersToCreate = [
        {
          username: 'superadmin',
          email: 'superadmin@platform.com',
          passwordHash: hashedSuperAdminPassword,
          name: 'Super Administrator',
          role: 'super_admin',
          isActive: true,
        },
        {
          username: 'Essayon6',
          email: 'essayon6@platform.com',
          passwordHash: hashedSuperAdminPassword,
          name: 'Essayon6 Administrator',
          role: 'super_admin',
          isActive: true,
        },
      ];

      await db.insert(superAdminUsers).values(superAdminUsersToCreate);

      console.log('✅ Created default Super Admin users for development');
      console.log('   Username: superadmin, Essayon6');
      console.log('   ⚠️  IMPORTANT: This is for development only!');
    } else if (existingSuperAdmins.length === 0) {
      // EMERGENCY BOOTSTRAP: Allow Super Admin creation ONLY if explicitly enabled with strong password
      if (
        process.env.EMERGENCY_BOOTSTRAP === 'true' &&
        process.env.EMERGENCY_ADMIN_PASSWORD &&
        process.env.EMERGENCY_ADMIN_PASSWORD.length >= 12
      ) {
        console.log('🚨 EMERGENCY BOOTSTRAP: Creating Super Admin in production...');
        const emergencyPassword = process.env.EMERGENCY_ADMIN_PASSWORD;
        const hashedEmergencyPassword = await bcrypt.hash(emergencyPassword, SALT_ROUNDS);

        await db.insert(superAdminUsers).values({
          username: 'bootstrap-admin',
          email: 'admin@emergency.bootstrap',
          passwordHash: hashedEmergencyPassword,
          name: 'Emergency Bootstrap Admin',
          role: 'super_admin',
          isActive: true,
        });

        console.log('✅ Emergency Super Admin created for production access');
        console.log('   Username: bootstrap-admin');
        console.log('   🔒 SECURITY: Remove EMERGENCY_BOOTSTRAP env var after login!');
      } else {
        console.log('⚠️ No Super Admin users found - set EMERGENCY_BOOTSTRAP=true to create first admin');
      }
    } else {
      console.log('Super Admin users already exist, skipping Super Admin creation.');
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    console.log('⚠️ Database seeding failed, but application will continue with reduced functionality');
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error);
    }
    return false;
  }

  return true;
}

// Migration function to handle existing users with text role field
export async function migrateUsersToRoleId() {
  console.log('🔄 Starting user role migration...');
  try {
    console.log('✅ No migration needed - fresh schema implementation');
  } catch (error) {
    console.error('❌ Error during user role migration:', error);
    throw error;
  }
}
// ... all other imports and code ...

// DO NOT call seedDatabase and process.exit() automatically if this file is imported or bundled.
// If you want to seed manually, run a dedicated script, like:
//    tsx server/seed.ts

// Example of a safe approach:
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding completed.');
      // DO NOT call process.exit() here!
    })
    .catch((error) => {
      console.error('Database seeding failed:', error);
      // DO NOT call process.exit() here!
    });
}

// Or simply REMOVE the entire block above if you only seed from your main app logic.
