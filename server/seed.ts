import bcrypt from 'bcrypt';
import { db } from './db';
import { roles, users, superAdminUsers, DEFAULT_PERMISSIONS, permissionsSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Helper function to create complete permission objects
function createPermissions(overrides: Partial<typeof permissionsSchema._type> = {}) {
  const defaults = permissionsSchema.parse({});
  return { ...defaults, ...overrides };
}

const SALT_ROUNDS = 12;

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
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
    
    if (existingUsers.length === 0) {
      console.log('Creating default admin user...');
      
      // Create default admin user
      const defaultPassword = 'admin123'; // Should be changed on first login
      const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
      
      await db.insert(users).values({
        username: 'admin',
        passwordHash: hashedPassword,
        name: 'System Administrator',
        roleId: adminRole.id,
        isActive: true,
      });
      
      console.log('✅ Created default admin user');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  IMPORTANT: Change this password on first login!');
    } else {
      console.log('Users already exist, skipping default user creation.');
    }

    // Check if Super Admin users exist
    const existingSuperAdmins = await db.select({
      id: superAdminUsers.id,
      username: superAdminUsers.username
    }).from(superAdminUsers);
    
    if (existingSuperAdmins.length === 0) {
      console.log('Creating default Super Admin user...');
      
      // Create default Super Admin user
      const superAdminPassword = 'admin123'; // Should be changed on first login
      const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, SALT_ROUNDS);
      
      await db.insert(superAdminUsers).values({
        username: 'superadmin',
        email: 'superadmin@platform.com',
        passwordHash: hashedSuperAdminPassword,
        name: 'Super Administrator',
        role: 'super_admin',
        isActive: true,
      });
      
      console.log('✅ Created default Super Admin user');
      console.log('   Username: superadmin');
      console.log('   Email: superadmin@platform.com');
      console.log('   Password: admin123');
      console.log('   ⚠️  IMPORTANT: Change this password on first login!');
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