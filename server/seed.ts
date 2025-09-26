import bcrypt from 'bcrypt';
import { db } from './db';
import { roles, users, superAdminUsers, DEFAULT_PERMISSIONS } from '@shared/schema';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Check if roles already exist
    const existingRoles = await db.select().from(roles);
    
    if (existingRoles.length === 0) {
      console.log('Creating default roles...');
      
      // Update existing roles with proper permissions structure
      const roleUpdates = [
        {
          name: 'Admin',
          description: 'Full system access with all permissions',
          permissions: DEFAULT_PERMISSIONS.SUPER_ADMIN,
          isActive: true,
        },
        {
          name: 'Manager', 
          description: 'Can create and manage projects, view reports',
          permissions: DEFAULT_PERMISSIONS.PROJECT_MANAGER,
          isActive: true,
        },
        {
          name: 'User',
          description: 'Basic project access for team collaboration',
          permissions: DEFAULT_PERMISSIONS.TEAM_MEMBER,
          isActive: true,
        },
      ];

      for (const roleData of roleUpdates) {
        await db.update(roles)
          .set({
            description: roleData.description,
            permissions: roleData.permissions,
            updatedAt: new Date(),
          })
          .where(eq(roles.name, roleData.name));
        console.log(`✅ Updated role: ${roleData.name}`);
      }
    } else {
      console.log('Roles already exist, skipping role creation.');
    }

    // Get the Admin role for default user creation (use existing Admin role)
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'Admin'));
    
    if (!adminRole) {
      throw new Error('Admin role not found - database may need proper seeding');
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
    const existingSuperAdmins = await db.select().from(superAdminUsers);
    
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
    throw error;
  }
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