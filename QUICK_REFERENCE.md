# Nivara ERP Backend - Quick Reference

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup PostgreSQL (see POSTGRES_SETUP.md)
psql -U nivara_user -d nivara_erp -f database/schema.sql

# 3. Configure environment
# Edit .env with PostgreSQL and WATI credentials

# 4. Start server
npm run dev    # Development with auto-reload
npm start      # Production mode

# 5. Test API
curl http://localhost:5000/health
```

## 🗄️ Database: PostgreSQL

**Current Version:** PostgreSQL 12+

**Connection Details (from .env):**
- Host: `localhost`
- Port: `5432` (default)
- User: `postgres` or `nivara_user`
- Database: `nivara_erp`

**Key Features:**
- Connection pooling (20 connections max)
- Parametrized queries ($1, $2, etc.)
- RETURNING clause for quick inserts
- UUID support for advanced features

**Common Operations:**
```javascript
// Query single row
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
const user = result.rows[0];

// Query all rows
const result = await db.query('SELECT * FROM projects');
const projects = result.rows;

// Insert and return
const result = await db.query(
  'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
  [email, name]
);
const newId = result.rows[0].id;

// Update
await db.query(
  'UPDATE users SET name = $1 WHERE id = $2',
  [newName, userId]
);
```

## 📱 WhatsApp: WATI Integration

**Credentials (from .env):**
```env
WATI_API_URL=https://live-server-xxxxx.wati.io
WATI_API_TOKEN=your_bearer_token
```

**Basic Usage:**
```javascript
const wati = require('./src/providers/wati');

// Send message
await wati.sendMessage('9876543210', 'Hello!');

// Send template
await wati.sendTemplate('9876543210', 'TEMPLATE_NAME', ['param1', 'param2']);
```

**Message Templates:**
- `paymentReceipt` - Payment confirmation
- `paymentReminder` - Due date reminder
- `bookingConfirmation` - Booking confirmation
- `otp` - OTP verification

## 📧 Email: Nodemailer

**Credentials (from .env):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@nivara.com
```

**Usage:**
```javascript
const mailer = require('./src/providers/mailer');

await mailer.sendMail({
  to: 'customer@example.com',
  subject: 'Payment Receipt',
  html: '<h1>Thank you!</h1>'
});
```

## 🏗️ Project Structure

```
src/
├── config/          # Database, logger, environment
├── middlewares/     # Authentication, authorization, error handling
├── modules/         # 12 feature modules (each with routes, controller, service)
├── providers/       # WATI, Mailer, Notification templates
└── utils/           # Database helpers, utilities
```

## 🔐 Authentication

**JWT Implementation:**
```javascript
// Generate token (login/register)
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRY || '7d' }
);

// Verify token (auth middleware)
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
```

**Using Protected Routes:**
```bash
# Include Bearer token in header
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/projects
```

## 📊 Database Schema

**14 Tables:**
1. `users` - Internal staff
2. `projects` - Real estate projects
3. `project_configurations` - Unit types (1BHK, 2BHK, etc.)
4. `flats` - Individual units
5. `customers` - Buyers
6. `bookings` - Reservations
7. `payment_schedules` - Payment milestones
8. `payments` - Payment records
9. `brokers` - Broker directory
10. `broker_commissions` - Commission tracking
11. `expense_categories` - Expense types
12. `project_expenses` - Project costs
13. `documents` - File metadata
14. `notification_log` - Alert history

## 🔌 API Endpoints (65+)

### Core Modules
- **Auth:** `/api/auth/login`, `/api/auth/register`
- **Users:** `/api/users` (GET, POST, PUT, DELETE)
- **Projects:** `/api/projects` (GET, POST, PUT, DELETE, configurations)
- **Flats:** `/api/flats` (GET, POST, PATCH status)
- **Customers:** `/api/customers` (CRUD)
- **Bookings:** `/api/bookings` (CRUD, cancel, schedule)
- **Payments:** `/api/payments` (record, ledger, outstanding, overdue)
- **Brokers:** `/api/brokers` (CRUD, commissions)
- **Expenses:** `/api/expenses` (CRUD, summary, categories)
- **Documents:** `/api/documents` (upload, GET, DELETE)
- **Reports:** `/api/reports` (dashboard, project, collections, broker-performance)
- **Notifications:** `/api/notifications` (payment-receipt, payment-reminder, log)

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get projects (with token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/projects
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Check errors
npm run dev  # Errors shown in terminal

# Debug specific module
# Add console.log() and restart server
```

## 📁 New Providers Directory

**Location:** `src/providers/`

**Files:**
- `wati.js` - WhatsApp messaging
- `mailer.js` - Email sending
- `notification.templates.js` - Message templates

## 🔄 Migrations from MySQL to PostgreSQL

**Key Differences:**
| Feature | MySQL | PostgreSQL |
|---------|-------|-----------|
| Parameter placeholders | `?` | `$1`, `$2` |
| Last insert ID | `LAST_INSERT_ID()` | `RETURNING id` |
| Auto increment | `AUTO_INCREMENT` | `SERIAL` or `BIGSERIAL` |
| Boolean type | `TINYINT(1)` | `BOOLEAN` |
| String max length | `VARCHAR(255)` | `VARCHAR` (no limit) |

**Updated in all service files:**
- All queries use `$1`, `$2` parameters
- INSERT statements use `RETURNING` clause
- Connection uses `pg` library's Pool

## 🚨 Common Issues

**Connection refused**
```bash
# Start PostgreSQL
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux
```

**Invalid token**
```bash
# Regenerate WATI token from dashboard
# Update .env and restart
npm run dev
```

**Email not sending**
```bash
# Verify SMTP credentials in .env
# Check Gmail app password (not account password)
# Enable "Less secure apps" if using Gmail
```

## 📞 Support

- PostgreSQL Issues → See `POSTGRES_SETUP.md`
- WATI Issues → See `WATI_SETUP.md`
- General Issues → See `README.md`

## 🎯 Next Steps

1. ✅ PostgreSQL installed and running
2. ✅ Database schema initialized
3. ✅ WATI credentials configured
4. ✅ Email credentials configured
5. ⬜ Start building features!

---

**Version:** 1.0.0
**Last Updated:** April 15, 2026
**Stack:** Node.js + Express + PostgreSQL + WATI
