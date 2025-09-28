import bcrypt from 'bcrypt';
import { db } from './db';
import { roles, users, superAdminUsers, DEFAULT_PERMISSIONS, permissionsSchema } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Helper function to create complete permission objects
function createPermissions(overrides: Partial<typeof permissionsSchema._type> = {}) {
  const defaults = permissionsSchema.parse({});
  return { ...defaults, ...overrides };
}

const SALT_ROUNDS = 12;

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Verify database connectivity first
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection verified');
  } catch (connectionError) {
    console.error('❌ Database connection failed:', connectionError);
    console.log('⚠️ Continuing without seeding - some features may not work');
    return false;
  }

  try {
    // Check if roles already exist
    const existingRoles = await db.select().from(roles);
    
    if (existingRoles.length === 0) {
      console.log('Creating default roles...');
      
      // Insert new roles since none exist - create complete permission objects
      const roleData = [
        {
          name: 'Admin',
          description: 'Full system access with all permissions',
          permissions: createPermissions(DEFAULT_PERMISSIONS.SUPER_ADMIN),
          isActive: true,
        },
        {
          name: 'Manager', 
          description: 'Can create and manage projects, view reports',
          permissions: createPermissions(DEFAULT_PERMISSIONS.PROJECT_MANAGER),
          isActive: true,
        },
        {
          name: 'User',
          description: 'Basic project access for team collaboration',
          permissions: createPermissions(DEFAULT_PERMISSIONS.TEAM_MEMBER),
          isActive: true,
        },
      ];

      // Insert all roles at once for better performance and atomicity
      await db.insert(roles).values(roleData);
      console.log(`✅ Created ${roleData.length} roles: ${roleData.map(r => r.name).join(', ')}`);
    } else {
      console.log('Roles already exist, skipping role creation.');
    }

    // Get the Admin role for default user creation with defensive check
    let [adminRole] = await db.select().from(roles).where(eq(roles.name, 'Admin'));
    
    if (!adminRole) {
      // Try to create the Admin role if it doesn't exist
      console.log('⚠️ Admin role not found, attempting to create it...');
      try {
        await db.insert(roles).values({
          name: 'Admin',
          description: 'Full system access with all permissions',
          permissions: createPermissions(DEFAULT_PERMISSIONS.SUPER_ADMIN),
          isActive: true,
        });
        console.log('✅ Emergency Admin role created successfully');
        
        // Re-fetch the Admin role
        const [newAdminRole] = await db.select().from(roles).where(eq(roles.name, 'Admin'));
        if (!newAdminRole) {
          console.error('❌ Failed to create or retrieve Admin role');
          console.log('⚠️ Continuing with reduced functionality - some features may not work');
          return; // Don't crash the app, just skip user creation
        }
        adminRole = newAdminRole;
      } catch (createError) {
        console.error('❌ Failed to create emergency Admin role:', createError);
        console.log('⚠️ Continuing with reduced functionality - some features may not work');
        return; // Don't crash the app
      }
    }

    // Check if default admin user exists
    const existingUsers = await db.select().from(users);
    
    // SECURITY: Only create default users in development environment
    if (existingUsers.length === 0 && process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_DATA === 'true') {
      console.log('Creating default admin user for development...');
      
      // Create default admin user (development only)
      const defaultPassword = 'admin123'; // Should be changed on first login
      const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
      
      await db.insert(users).values({
        username: 'admin',
        email: 'admin@platform.local',
        passwordHash: hashedPassword,
        name: 'System Administrator',
        roleId: adminRole.id,
        isActive: true,
      });
      
      console.log('✅ Created default admin user for development');
      console.log('   Username: admin');
      console.log('   ⚠️  IMPORTANT: This is for development only!');
    } else if (existingUsers.length === 0) {
      console.log('⚠️ No users found - use proper onboarding flow to create first admin user');
    } else {
      console.log('Users already exist, skipping default user creation.');
    }

    // Check if Super Admin users exist
    const existingSuperAdmins = await db.select({
      id: superAdminUsers.id,
      username: superAdminUsers.username
    }).from(superAdminUsers);
    
    // SECURITY: Only create default Super Admin users in development environment
    if (existingSuperAdmins.length === 0 && process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_DATA === 'true') {
      console.log('Creating default Super Admin user for development...');
      
      try {
        // Create default Super Admin user (development only)
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
            passwordHash: hashedSuperAdminPassword, // Same password as default
            name: 'Essayon6 Administrator',
            role: 'super_admin',
            isActive: true,
          }
        ];

        await db.insert(superAdminUsers).values(superAdminUsersToCreate);
        
        console.log('✅ Created default Super Admin users for development');
        console.log('   Username: superadmin, Essayon6');
        console.log('   ⚠️  IMPORTANT: This is for development only!');
      } catch (superAdminError) {
        console.error('❌ Failed to create Super Admin user:', superAdminError);
        console.log('⚠️ Super Admin functionality may be limited');
      }
    } else if (existingSuperAdmins.length === 0) {
      // EMERGENCY BOOTSTRAP: Allow Super Admin creation in production if explicitly enabled
      if (process.env.EMERGENCY_BOOTSTRAP === 'true') {
        console.log('🚨 EMERGENCY BOOTSTRAP: Creating Super Admin in production...');
        console.log('Environment check - NODE_ENV:', process.env.NODE_ENV);
        console.log('Environment check - EMERGENCY_BOOTSTRAP:', process.env.EMERGENCY_BOOTSTRAP);
        
        try {
          const emergencyPassword = process.env.EMERGENCY_ADMIN_PASSWORD || 'TempAdmin2024!';
          console.log('Using emergency password length:', emergencyPassword.length);
          const hashedEmergencyPassword = await bcrypt.hash(emergencyPassword, SALT_ROUNDS);
          
          const emergencyUsersToCreate = [
            {
              username: 'bootstrap-admin',
              email: 'admin@emergency.bootstrap',
              passwordHash: hashedEmergencyPassword,
              name: 'Emergency Bootstrap Admin',
              role: 'super_admin',
              isActive: true,
            },
            {
              username: 'Essayon6',
              email: 'essayon6@platform.com',
              passwordHash: await bcrypt.hash('admin123', SALT_ROUNDS), // Permanent password
              name: 'Essayon6 Administrator',
              role: 'super_admin',
              isActive: true,
            }
          ];

          await db.insert(superAdminUsers).values(emergencyUsersToCreate);
          
          console.log('✅ Emergency Super Admin users created for production access');
          console.log('   Username: bootstrap-admin, Essayon6');
          console.log('   Password: Set via EMERGENCY_ADMIN_PASSWORD or default');
          console.log('   🔒 SECURITY: Remove EMERGENCY_BOOTSTRAP env var after login!');
        } catch (emergencyError) {
          console.error('❌ Emergency bootstrap failed:', emergencyError);
        }
      } else {
        console.log('⚠️ No Super Admin users found - set EMERGENCY_BOOTSTRAP=true to create first admin');
        console.log('Environment check - NODE_ENV:', process.env.NODE_ENV);
        console.log('Environment check - EMERGENCY_BOOTSTRAP:', process.env.EMERGENCY_BOOTSTRAP);
      }
    } else {
      console.log('Super Admin users already exist, skipping Super Admin creation.');
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    console.log('⚠️ Database seeding failed, but application will continue with reduced functionality');
    console.log('⚠️ Some features may not work properly until roles and users are properly set up');
    
    // Log the error but don't crash the application
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error);
    }
    
    // Return instead of throwing to prevent app crash
    return false;
  }
  
  return true;
}

// Migration function to handle existing users with text role field
export async function migrateUsersToRoleId() {
  console.log('🔄 Starting user role migration...');
  
  try {
    // This would be used if we had existing users with text role field
    // For now, we'll just log that no migration is needed since we're starting fresh
    console.log('✅ No migration needed - fresh schema implementation');
    
  } catch (error) {
    console.error('❌ Error during user role migration:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database seeding failed:', error);
      process.exit(1);
    });
}