# Nivara ERP Backend - Project Structure Summary

## 📁 Complete Directory Structure

```
nivara-erp-backend/
├── 📄 .env                              # Environment configuration
├── 📄 .gitignore                        # Git ignore rules
├── 📄 package.json                      # NPM dependencies
├── 📄 README.md                         # Project documentation
│
├── 📂 src/
│   ├── 📄 server.js                    # Entry point - server initialization
│   ├── 📄 app.js                       # Express app setup
│   ├── 📄 routes.js                    # Main API router
│   │
│   ├── 📂 config/                      # Configuration files
│   │   ├── 📄 db.js                   # MySQL connection pool
│   │   ├── 📄 env.js                  # Environment variables loader
│   │   ├── 📄 logger.js               # Logging utility
│   │   └── 📄 multer.js               # File upload middleware
│   │
│   ├── 📂 middlewares/                 # Express middlewares
│   │   ├── 📄 auth.middleware.js      # JWT authentication
│   │   ├── 📄 role.middleware.js      # Role-based access control
│   │   ├── 📄 error.middleware.js     # Global error handler
│   │   └── 📄 processAccess.middleware.js # Request logging
│   │
│   └── 📂 modules/                     # Feature modules (MVC pattern)
│       ├── 📂 auth/                    # Authentication
│       │   ├── 📄 auth.routes.js
│       │   ├── 📄 auth.controller.js
│       │   └── 📄 auth.service.js
│       │
│       ├── 📂 users/                   # User management
│       │   ├── 📄 users.routes.js
│       │   ├── 📄 users.controller.js
│       │   └── 📄 users.service.js
│       │
│       ├── 📂 projects/                # Real estate projects
│       │   ├── 📄 projects.routes.js
│       │   ├── 📄 projects.controller.js
│       │   ├── 📄 projects.service.js
│       │   └── 📄 projects.validation.js
│       │
│       ├── 📂 flats/                   # Flat inventory
│       │   ├── 📄 flats.routes.js
│       │   ├── 📄 flats.controller.js
│       │   ├── 📄 flats.service.js
│       │   └── 📄 flats.validation.js
│       │
│       ├── 📂 customers/               # Customer master data
│       │   ├── 📄 customers.routes.js
│       │   ├── 📄 customers.controller.js
│       │   ├── 📄 customers.service.js
│       │   └── 📄 customers.validation.js
│       │
│       ├── 📂 bookings/                # Booking management
│       │   ├── 📄 bookings.routes.js
│       │   ├── 📄 bookings.controller.js
│       │   ├── 📄 bookings.service.js
│       │   └── 📄 bookings.validation.js
│       │
│       ├── 📂 payments/                # Payment tracking
│       │   ├── 📄 payments.routes.js
│       │   ├── 📄 payments.controller.js
│       │   ├── 📄 payments.service.js
│       │   └── 📄 payments.validation.js
│       │
│       ├── 📂 brokers/                 # Broker management
│       │   ├── 📄 brokers.routes.js
│       │   ├── 📄 brokers.controller.js
│       │   ├── 📄 brokers.service.js
│       │   └── 📄 brokers.validation.js
│       │
│       ├── 📂 expenses/                # Project expenses
│       │   ├── 📄 expenses.routes.js
│       │   ├── 📄 expenses.controller.js
│       │   ├── 📄 expenses.service.js
│       │   └── 📄 expenses.validation.js
│       │
│       ├── 📂 documents/               # Document management
│       │   ├── 📄 documents.routes.js
│       │   ├── 📄 documents.controller.js
│       │   └── 📄 documents.service.js
│       │
│       ├── 📂 reports/                 # Analytics & reports
│       │   ├── 📄 reports.routes.js
│       │   ├── 📄 reports.controller.js
│       │   └── 📄 reports.service.js
│       │
│       └── 📂 notifications/           # Alert system
│           ├── 📄 notifications.routes.js
│           ├── 📄 notifications.controller.js
│           └── 📄 notifications.service.js
│
├── 📂 database/
│   └── 📄 schema.sql                   # MySQL database schema
│
└── 📂 uploads/                         # Document storage
    └── 📄 .gitkeep                     # Directory placeholder
```

## 🗂️ File Count Summary

- **Total JavaScript Files:** 54
- **Total Modules:** 12 (auth, users, projects, flats, customers, bookings, payments, brokers, expenses, documents, reports, notifications)
- **Routes Files:** 12
- **Controller Files:** 12
- **Service Files:** 12
- **Validation Files:** 8
- **Configuration Files:** 4
- **Middleware Files:** 4

## 🏗️ Architecture Pattern

Each module follows the **MVC + Service Layer** pattern:

```
Route (Express Router)
    ↓
Controller (Request handling)
    ↓
Service (Business logic)
    ↓
Database (MySQL queries)
```

## 📦 Key Dependencies

```json
{
  "express": "REST API framework",
  "mysql2": "MySQL client",
  "bcryptjs": "Password hashing",
  "jsonwebtoken": "JWT authentication",
  "joi": "Input validation",
  "multer": "File uploads",
  "nodemailer": "Email sending",
  "twilio": "WhatsApp messaging",
  "cors": "Cross-origin support",
  "helmet": "Security headers",
  "morgan": "HTTP logging",
  "compression": "Response compression",
  "dotenv": "Environment variables"
}
```

## 🗄️ Database Tables (14 Total)

1. **users** - Staff accounts
2. **projects** - Real estate projects
3. **project_configurations** - Unit types
4. **flats** - Individual units
5. **customers** - Buyer data
6. **bookings** - Reservations
7. **payment_schedules** - Payment milestones
8. **payments** - Payment records
9. **brokers** - Broker directory
10. **broker_commissions** - Commission tracking
11. **expense_categories** - Expense types
12. **project_expenses** - Project costs
13. **documents** - File metadata
14. **notification_log** - Alert history

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Setup database
mysql -u root -p < database/schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Health check
curl http://localhost:5000/health
```

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Password hashing with bcrypt
- ✅ Input validation with Joi
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ File upload validation
- ✅ SQL injection prevention

## 📊 API Statistics

- **Total Endpoints:** 65+
- **GET Endpoints:** 25+
- **POST Endpoints:** 20+
- **PUT/PATCH Endpoints:** 15+
- **DELETE Endpoints:** 12+

## 🎯 Core Features

- ✅ Real estate project management
- ✅ Flat/unit inventory tracking
- ✅ Customer relationship management
- ✅ Booking and reservation system
- ✅ Payment collection tracking
- ✅ Broker commission management
- ✅ Expense tracking and budgeting
- ✅ Document management system
- ✅ Email and SMS notifications
- ✅ Comprehensive reporting
- ✅ User authentication & authorization
- ✅ Logging and audit trails

## 📝 Configuration Files

**`.env`** - Environment variables
- Database credentials
- JWT secrets
- Email configuration
- Twilio API keys
- Server port

**`package.json`** - NPM metadata and dependencies

**`database/schema.sql`** - Complete database schema with indexes

## 📚 Documentation

Full API documentation available in `README.md` with:
- Installation instructions
- Environment setup
- Complete API endpoint reference
- Database schema documentation
- Error handling guidelines
- Technology stack details

---

**Created:** April 15, 2026
**Status:** Ready for development
**Next Steps:** 
1. Set up MySQL database
2. Configure .env file
3. Run npm install
4. Start development server
