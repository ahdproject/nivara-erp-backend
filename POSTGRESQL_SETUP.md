# PostgreSQL Setup Guide

This guide helps you set up PostgreSQL for the Nivara ERP Backend.

## Installation

### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create a user (if not exists)
createuser -P postgres
```

### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Access PostgreSQL
sudo -u postgres psql
```

### Windows
- Download from https://www.postgresql.org/download/windows/
- Run the installer
- Remember the password you set for the postgres user
- Add PostgreSQL to PATH (optional but recommended)

## Database Setup

### Method 1: Using SQL Script (Recommended)

```bash
# Navigate to the project directory
cd nivara-erp-backend

# Run the schema file
psql -U postgres -f database/schema.sql

# If prompted for password, enter the postgres user password
```

### Method 2: Manual Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# In PostgreSQL prompt:
CREATE DATABASE nivara_erp;
\c nivara_erp;

# Then copy and paste all contents from database/schema.sql
# Or use:
\i database/schema.sql
```

## Configuration

### Update .env file

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=nivara_erp
```

## Verify Installation

```bash
# Connect to the database
psql -U postgres -d nivara_erp

# List all tables
\dt

# Check specific table
SELECT * FROM users;

# Exit
\q
```

## Common PostgreSQL Commands

```bash
# Create a new database
createdb database_name

# Drop a database
dropdb database_name

# Connect to a database
psql -U postgres -d database_name

# Backup database
pg_dump -U postgres -d nivara_erp > backup.sql

# Restore database
psql -U postgres -d nivara_erp < backup.sql

# List all databases
psql -U postgres -l

# Start PostgreSQL service
brew services start postgresql@14    # macOS
sudo service postgresql start         # Linux
pg_ctl -D /usr/local/var/postgres start  # Manual

# Stop PostgreSQL service
brew services stop postgresql@14     # macOS
sudo service postgresql stop          # Linux
pg_ctl -D /usr/local/var/postgres stop   # Manual
```

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL service is running
- Check port 5432 is available
- Verify .env file credentials

### Authentication Failed
- Verify DB_USER and DB_PASSWORD in .env
- Ensure postgres user exists
- Check pg_hba.conf for authentication method

### Database Already Exists
```bash
# Drop existing database
dropdb -U postgres nivara_erp

# Then re-run schema setup
```

### Port Already in Use
```bash
# Change port in .env to 5433 or another available port
# Or kill the process using port 5432

# macOS
lsof -ti:5432 | xargs kill -9

# Linux
sudo lsof -ti:5432 | xargs sudo kill -9
```

## Performance Optimization

### Add Connection Parameters
In .env file, you can add:
```env
DB_CONNECTION_TIMEOUT=2000
DB_IDLE_TIMEOUT=30000
DB_MAX_CONNECTIONS=20
```

### Create Additional Indexes
```sql
-- Login to PostgreSQL
psql -U postgres -d nivara_erp

-- Add indexes as needed
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_amount ON payments(amount);
```

## Backup & Restore

### Backup
```bash
# Full backup
pg_dump -U postgres -d nivara_erp > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -U postgres -d nivara_erp | gzip > backup.sql.gz
```

### Restore
```bash
# From SQL file
psql -U postgres -d nivara_erp < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql -U postgres -d nivara_erp
```

## Monitoring

### Check Database Size
```bash
psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database ORDER BY pg_database_size(pg_database.datname) DESC;"
```

### Check Active Connections
```bash
psql -U postgres -c "SELECT datname, usename, application_name, client_addr FROM pg_stat_activity;"
```

### Kill Idle Connections
```bash
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';"
```

## Docker Setup (Optional)

### Run PostgreSQL in Docker
```bash
# Pull PostgreSQL image
docker pull postgres:14

# Run container
docker run --name nivara-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=nivara_erp \
  -p 5432:5432 \
  -v pg_data:/var/lib/postgresql/data \
  -d postgres:14

# Connect to database
psql -U postgres -h localhost -d nivara_erp

# Stop container
docker stop nivara-postgres

# Start container
docker start nivara-postgres
```

## Additional Resources

- PostgreSQL Official Docs: https://www.postgresql.org/docs/
- Node pg Library: https://node-postgres.com/
- PostgreSQL Cheatsheet: https://www.postgresqltutorial.com/
