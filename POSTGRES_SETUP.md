# PostgreSQL Setup Guide

This document provides step-by-step instructions for setting up PostgreSQL for the Nivara ERP Backend.

## 📦 Installation

### macOS (Using Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

### Linux (Ubuntu/Debian)

```bash
# Update package manager
sudo apt update
sudo apt upgrade

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start the service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

1. Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer
3. Follow setup wizard (note the password for `postgres` user)
4. PostgreSQL will start automatically

## 🔐 Initial Configuration

### Connect to PostgreSQL

```bash
# Linux/macOS
psql -U postgres

# Windows (from Command Prompt)
psql -U postgres
```

### Set Password for postgres User

```sql
ALTER USER postgres WITH PASSWORD 'your_secure_password';
\q  -- exit psql
```

## 🗄️ Create Database and User

### Option 1: Using psql

```bash
# Connect as postgres user
psql -U postgres

# Then execute:
CREATE DATABASE nivara_erp;
CREATE USER nivara_user WITH PASSWORD 'secure_password';
ALTER ROLE nivara_user SET client_encoding TO 'utf8';
ALTER ROLE nivara_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE nivara_user SET default_transaction_deferrable TO on;
ALTER ROLE nivara_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE nivara_erp TO nivara_user;
\q
```

### Option 2: Using pgAdmin (GUI)

1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `nivara_erp`
4. Right-click "Login/Group Roles" → Create → Login/Group Role
5. General → Name: `nivara_user`
6. Definition → Password: `secure_password`
7. Privileges → Grant all on database

## 📋 Initialize Schema

### Method 1: Using psql with SQL file

```bash
psql -U nivara_user -d nivara_erp -f database/schema.sql
```

### Method 2: Using Node.js Script

```bash
# First, ensure .env is configured with PostgreSQL credentials
npm run init-db
```

### Method 3: Manual Execution

```bash
# Connect to the database
psql -U nivara_user -d nivara_erp

# Copy and paste contents of database/schema.sql
\i database/schema.sql

# Verify tables were created
\dt
```

## ⚙️ Configure Node.js Application

Update `.env` file:

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=nivara_user
DB_PASSWORD=secure_password
DB_NAME=nivara_erp

# Or for remote database
# DB_HOST=db.example.com
# DB_PORT=5432
# DB_USER=nivara_user
# DB_PASSWORD=secure_password
# DB_NAME=nivara_erp
```

## 🧪 Test Connection

```bash
# From your application directory
node -e "
const pool = require('./src/config/db');
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Connection failed:', err);
  else console.log('Connected! Current time:', res.rows[0]);
  process.exit();
});
"
```

Or use the built-in health check:

```bash
npm run dev
# Then: curl http://localhost:5000/health
```

## 📊 Useful PostgreSQL Commands

### Connect to Database

```bash
psql -U nivara_user -d nivara_erp -h localhost
```

### View Tables

```sql
\dt                    -- List all tables
\d table_name          -- Show table structure
\l                     -- List all databases
\du                    -- List users/roles
```

### Backup Database

```bash
pg_dump -U nivara_user -d nivara_erp > backup.sql
```

### Restore Database

```bash
psql -U nivara_user -d nivara_erp < backup.sql
```

### Check Connections

```sql
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
```

### Reset Database (Caution!)

```sql
DROP DATABASE IF EXISTS nivara_erp;
CREATE DATABASE nivara_erp OWNER nivara_user;
```

## 🐛 Troubleshooting

### "connection refused" Error

**Solution:**
```bash
# Ensure PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Start if not running
brew services start postgresql@15  # macOS
sudo systemctl start postgresql  # Linux
```

### "FATAL: role 'nivara_user' does not exist"

**Solution:**
```bash
psql -U postgres
CREATE USER nivara_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nivara_erp TO nivara_user;
\q
```

### "FATAL: database 'nivara_erp' does not exist"

**Solution:**
```bash
psql -U postgres
CREATE DATABASE nivara_erp OWNER nivara_user;
GRANT ALL PRIVILEGES ON DATABASE nivara_erp TO nivara_user;
\q
```

### Slow Queries

Enable query logging:

```sql
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

View logs (macOS):
```bash
tail -f /usr/local/var/log/postgres.log
```

## 🔄 Migration from MySQL to PostgreSQL

If you need to migrate from MySQL:

```bash
# Install migration tool
npm install mysql-to-postgresql

# Or use native tools
# PgLoader: https://pgloader.readthedocs.io/
pgloader mysql://user:password@localhost/nivara_erp \
         postgresql://nivara_user:password@localhost/nivara_erp
```

## 📈 Performance Optimization

### Create Indexes

```sql
-- Already created in schema.sql, but you can add more:
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_bookings_created_at ON bookings(booking_date);
CREATE INDEX idx_payments_created_at ON payments(payment_date);
```

### Analyze Query Performance

```sql
EXPLAIN ANALYZE SELECT * FROM bookings WHERE status = 'active';
```

### Vacuum (Maintenance)

```bash
# Full vacuum (maintenance only)
vacuumdb -U nivara_user -d nivara_erp --full

# Regular vacuum (online)
vacuumdb -U nivara_user -d nivara_erp --analyze
```

## 🛡️ Security Best Practices

1. **Strong Passwords:**
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

2. **User Permissions:**
   ```sql
   -- Create read-only user
   CREATE USER nivara_readonly WITH PASSWORD 'read_password';
   GRANT USAGE ON SCHEMA public TO nivara_readonly;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO nivara_readonly;
   ```

3. **SSL Connections:**
   Update `.env`:
   ```env
   DB_SSL=require
   # Or for development:
   DB_SSL=prefer
   ```

4. **Connection Pooling:**
   Already configured in `src/config/db.js` with 20 connections max

## 📚 Additional Resources

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Node.js pg Package](https://node-postgres.com/)

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with PostgreSQL credentials
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Initialize database
psql -U nivara_user -d nivara_erp -f database/schema.sql

# 4. Start development server
npm run dev

# 5. Test the API
curl http://localhost:5000/health
```

---

**Last Updated:** April 15, 2026
**PostgreSQL Version:** 12+ (tested with 15)
**Node.js Version:** 14+ (recommended 16+)
