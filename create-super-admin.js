// Script to create super admin user in production database
// Run this on the production server with: node create-super-admin.js

import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

const createSuperAdmin = async () => {
  // Super admin credentials
  const username = 'Essayon6';
  const email = 'psmith.ccld@gmail.com';
  const name = 'Phil Smith';
  const password = 'Sasquatch!Yeti@Nessie3';
  
  try {
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    
    console.log('🔌 Connecting to database...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    console.log('➕ Inserting super admin user...');
    const result = await pool.query(
      `INSERT INTO super_admin_users 
        (username, email, password_hash, name, role, is_active, mfa_enabled, created_at, updated_at) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, username, email, name, role, is_active`,
      [username, email, passwordHash, name, 'super_admin', true, false]
    );
    
    console.log('✅ Super admin user created successfully!');
    console.log('User details:', result.rows[0]);
    console.log('\nYou can now login at: https://essayons-change.onrender.com/super-admin');
    console.log('Username:', username);
    console.log('Password: [the password you provided]');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin user:', error.message);
    
    if (error.code === '23505') {
      console.error('\n⚠️  Username or email already exists. Try with different credentials or delete the existing user first.');
    }
    
    process.exit(1);
  }
};

createSuperAdmin();
