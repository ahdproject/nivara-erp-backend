# Nivara ERP Backend

A comprehensive Node.js/Express backend for a real estate ERP system. Manages projects, flats, customers, bookings, payments, brokers, expenses, documents, and notifications.

## Project Structure

```
nivara-erp-backend/
├── src/
│   ├── server.js                 # Server entry point
│   ├── app.js                    # Express app configuration
│   ├── routes.js                 # Main router setup
│   ├── config/
│   │   ├── db.js                # MySQL connection pool
│   │   ├── env.js               # Environment variables
│   │   ├── logger.js            # Logging utility
│   │   └── multer.js            # File upload configuration
│   ├── middlewares/
│   │   ├── auth.middleware.js   # JWT authentication
│   │   ├── role.middleware.js   # Role-based access control
│   │   ├── error.middleware.js  # Error handling
│   │   └── processAccess.middleware.js # Request logging
│   └── modules/
│       ├── auth/                # Authentication module
│       ├── users/               # User management
│       ├── projects/            # Project management
│       ├── flats/               # Flat inventory
│       ├── customers/           # Customer master data
│       ├── bookings/            # Booking management
│       ├── payments/            # Payment tracking
│       ├── brokers/             # Broker management
│       ├── expenses/            # Project expenses
│       ├── documents/           # Document storage
│       ├── reports/             # Business reports
│       └── notifications/       # Alert & notification system
├── database/
│   └── schema.sql               # MySQL database schema
├── uploads/                     # File upload directory
├── .env                         # Environment configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## Features

### 1. **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Admin, Manager, Staff, User)
- User registration and login

### 2. **Project Management**
- Create and manage real estate projects
- Define project configurations (1BHK, 2BHK, etc.)
- Track project status

### 3. **Flat Inventory**
- Manage individual flats/units
- Track flat status (available, blocked, sold)
- Support for multiple flats per project

### 4. **Customer Management**
- Maintain customer master data
- Store KYC information (PAN, Aadhaar)
- Contact information management

### 5. **Booking Management**
- Create and manage flat bookings
- Link customers, flats, and brokers
- Auto-update flat status on booking
- Cancel bookings with flat status reset
- Payment schedule management

### 6. **Payment Tracking**
- Record all payments from customers
- Track payment modes (cash, cheque, NEFT, UPI, wire)
- Calculate outstanding balances
- Generate payment ledgers per customer
- Identify overdue payments

### 7. **Broker Management**
- Maintain broker information
- Track commissions per broker
- Commission payment status tracking

### 8. **Expense Management**
- Record project expenses
- Categorize expenses
- Track GST
- Generate expense summaries by category

### 9. **Document Management**
- Upload documents (PDF, Word, Images)
- Link documents to bookings, customers, or projects
- Support for multiple document types (agreement, KYC, receipts)
- Secure file storage

### 10. **Reporting & Analytics**
- Dashboard with key metrics
- Project-wise P&L reports
- Monthly collection reports
- Broker performance analytics
- Real-time inventory status

### 11. **Notifications**
- Email notifications for payments
- Payment reminders
- WhatsApp integration ready (Twilio)
- Notification history tracking

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup Steps

1. **Clone and install dependencies:**
   ```bash
   cd nivara-erp-backend
   npm install
   ```

2. **Create PostgreSQL Database:**
   ```bash
   psql -U postgres -f database/schema.sql
   ```

3. **Configure environment variables:**
   - Copy `.env` file
   - Update database credentials
   - Set JWT secret
   - Configure email credentials (Nodemailer)
   - Add Twilio credentials for WhatsApp (optional)

4. **Start the server:**
   ```bash
   npm run dev        # Development mode with nodemon
   npm start          # Production mode
   ```

   Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/configurations` - Add configuration
- `GET /api/projects/:id/configurations` - Get configurations

### Flats
- `GET /api/flats?project_id=1&status=available` - Get flats with filters
- `POST /api/flats` - Create flat
- `PATCH /api/flats/:id/status` - Update flat status
- `DELETE /api/flats/:id` - Delete flat

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Bookings
- `GET /api/bookings?project_id=1` - Get bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/schedule` - Add payment schedule

### Payments
- `POST /api/payments` - Record payment
- `GET /api/payments/booking/:bookingId` - Get payment ledger
- `GET /api/payments/outstanding` - Get outstanding payments
- `GET /api/payments/overdue` - Get overdue payments

### Brokers
- `GET /api/brokers` - List brokers
- `POST /api/brokers` - Create broker
- `GET /api/brokers/:id/commissions` - Get broker commissions
- `PATCH /api/brokers/commissions/:id/pay` - Mark commission paid

### Expenses
- `GET /api/expenses?project_id=1&category=Construction` - Get expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/summary?project_id=1` - Get expense summary
- `POST /api/expenses/categories` - Add expense category

### Documents
- `POST /api/documents` - Upload document
- `GET /api/documents?booking_id=5` - Get documents
- `DELETE /api/documents/:id` - Delete document

### Reports
- `GET /api/reports/dashboard` - Dashboard report
- `GET /api/reports/project/:id` - Project P&L report
- `GET /api/reports/collections?month=3&year=2025` - Collections report
- `GET /api/reports/broker-performance` - Broker performance report

### Notifications
- `POST /api/notifications/payment-receipt` - Send payment receipt
- `POST /api/notifications/payment-reminder` - Send payment reminder
- `GET /api/notifications/log?booking_id=5` - Get notification log

## Environment Variables

```
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=nivara_erp

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@nivara.com

# Twilio (Optional - for WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+1234567890

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Logger
LOG_LEVEL=debug
```

## Database Schema

The database includes the following tables:
- `users` - Internal staff accounts
- `projects` - Real estate projects
- `project_configurations` - Flat types per project
- `flats` - Individual units
- `customers` - Buyer information
- `bookings` - Flat reservations
- `payment_schedules` - Payment milestones
- `payments` - Recorded payments
- `brokers` - Broker directory
- `broker_commissions` - Commission tracking
- `expense_categories` - Expense types
- `project_expenses` - Project expenditures
- `documents` - File storage metadata
- `notification_log` - Alert history

## Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL 12+
- **Authentication:** JWT
- **File Upload:** Multer
- **Validation:** Joi
- **Email:** Nodemailer
- **Messaging:** Twilio (WhatsApp)
- **Password Hashing:** bcryptjs
- **Logging:** Custom file-based logger

## Development

### Run in Development Mode
```bash
npm run dev
```

This uses nodemon to auto-restart the server on file changes.

### Health Check
```bash
curl http://localhost:5000/health
```

## Error Handling

The API returns errors in a consistent format:
```json
{
  "success": false,
  "message": "Error description",
  "error": {}
}
```

HTTP Status Codes:
- `200 OK` - Successful request
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## License

Proprietary - Nivara ERP System

## Support

For support or issues, contact the development team.
