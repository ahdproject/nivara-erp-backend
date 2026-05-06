/* Seed script to create or update an admin user.

Usage (zsh):
  cd /Users/devanshu/Desktop/nv-backend/nivara-erp-backend
  npm install       # ensure dependencies (pg, bcryptjs) are installed
  SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=YourPass node scripts/seedAdmin.js

Defaults if env vars not provided:
  email: admin@nivaraventures.com
  password: Admin@1234

The script will create the user if it doesn't exist, or update the password/name/role if it does.
*/

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

const email = process.env.SEED_ADMIN_EMAIL || 'admin@nivaraventures.com';
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
const name = process.env.SEED_ADMIN_NAME || 'Admin';

async function run() {
  try {
    const hashed = await bcrypt.hash(password, 10);

    // Ensure DB connection works
    await db.query('SELECT 1');

    const res = await db.query('SELECT id FROM users WHERE email = $1', [email]);

    if (res.rows.length) {
      await db.query(
        'UPDATE users SET password = $1, name = $2, role = $3, updated_at = NOW() WHERE email = $4',
        [hashed, name, 'admin', email]
      );
      console.log('Admin user updated:', email);
    } else {
      await db.query(
        'INSERT INTO users (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [email, hashed, name, 'admin']
      );
      console.log('Admin user created:', email);
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message || err);
    process.exit(1);
  }
}

run();
