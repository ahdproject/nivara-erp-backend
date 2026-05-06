# 📋 Notification System - Complete Implementation

**Status:** ✅ Ready for Integration  
**Version:** 1.0.0  
**Last Updated:** April 15, 2026  

## 🎯 What's New

This update adds comprehensive notification capabilities to Nivara ERP Backend:

### ✨ Features Added

1. **Email Notifications** (via Nodemailer)
   - Professional branded HTML templates
   - Payment receipts, reminders, confirmations
   - Responsive design for all devices

2. **WhatsApp Notifications** (via WATI)
   - Plain text templates with emojis
   - Automatic phone number formatting
   - Session and template message support
   - Message status tracking

3. **Validation & Logging**
   - Comprehensive input validation (Joi)
   - Full audit trail in database
   - Detailed error handling
   - Request/response logging

## 📁 New Files Overview

### Providers (`src/providers/`)

| File | Purpose | Key Features |
|------|---------|--------------|
| `notification.templates.js` | Email & WhatsApp templates | 4 templates × 2 channels = 8 variations |
| `notification.validation.js` | Input validation | Receipt, reminder, custom schemas |
| `wati.js` | WATI API client | Send messages, get status, format phones |
| `mailer.js` | Email service | Nodemailer wrapper with error handling |

### Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `WATI_SETUP.md` | Complete WATI integration guide |
| `NOTIFICATION_GUIDE.md` | System architecture and usage |

## 🔨 Setup Instructions

### 1. Install Dependencies (Already in package.json)
```bash
npm install
```

Dependencies:
- `axios` - HTTP client for WATI
- `joi` - Input validation
- `nodemailer` - Email sending
- `dotenv` - Environment variables

### 2. Configure Environment Variables

Add to `.env` file:

```bash
# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@nivaraventures.com

# WATI Configuration (WhatsApp)
WATI_API_URL=https://api.wati.io
WATI_API_TOKEN=your_api_token_here
WATI_WHATSAPP_NUMBER=+91XXXXXXXXXX

# Optional: SMS (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

### 3. Configure Email Provider

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password in `EMAIL_PASSWORD`

**For Custom SMTP:**
- Update `EMAIL_HOST` and `EMAIL_PORT`
- Use appropriate credentials

### 4. Get WATI API Credentials

Follow [docs/WATI_SETUP.md](./docs/WATI_SETUP.md) for:
1. Creating WATI account
2. Getting API URL and token
3. Verifying WhatsApp number
4. Creating message templates

### 5. Create Scheduled Jobs (Optional but Recommended)

Add to your application:

```javascript
const cron = require('node-cron');
const { sendPaymentReminders, sendOverdueAlerts } = require('./tasks/notifications');

// Send payment reminders daily at 9 AM
cron.schedule('0 9 * * *', sendPaymentReminders);

// Send overdue alerts daily at 6 PM
cron.schedule('0 18 * * *', sendOverdueAlerts);
```

## 📱 API Endpoints

### Payment Receipt Notification
```
POST /api/notifications/payment-receipt
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "booking_id": 1,
  "payment_id": 5,
  "channel": "both"  // "email", "whatsapp", or "both"
}
```

### Payment Reminder
```
POST /api/notifications/payment-reminder
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "booking_id": 1,
  "schedule_id": 3,
  "channel": "both"
}
```

### Booking Confirmation
```
POST /api/notifications/booking-confirmed
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "booking_id": 1,
  "channel": "email"
}
```

### Get Notification Log
```
GET /api/notifications/log?booking_id=1
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "booking_id": 1,
      "notification_type": "payment_receipt",
      "channel": "email",
      "recipient": "customer@example.com",
      "status": "sent",
      "sent_at": "2026-04-15T10:30:00Z"
    }
  ]
}
```

## 📧 Email Templates

### 1. Payment Receipt
- Branded header with company logo area
- Payment details in professional table
- Amount received (green), balance due (red)
- Payment mode and reference number

### 2. Payment Reminder
- Warning header (orange)
- Due date and amount highlighted
- Action-oriented message
- Contact information

### 3. Booking Confirmation
- Celebration emoji in header
- Flat details in styled table
- Next steps section
- Contact information

### 4. Overdue Alert
- Alert header (red)
- Days overdue highlighted
- Urgent action message
- Amount due prominently displayed

## 💬 WhatsApp Templates

Same 4 types but plain text format:
- Short, scannable content
- Emoji for visual clarity
- Works in 24-hour chat window
- Can be extended with approved templates

**Sample Message:**
```
Dear John Doe,

✅ *Payment Received — Nivara Ventures*

Project  : Nivara Heights
Flat     : 501 (3BHK)
Amount   : ₹250,000
Mode     : NEFT
Date     : 15 Apr 2026

Total Paid    : ₹500,000
Balance Due   : ₹1,500,000

*Nivara Ventures*
```

## 🔍 Template Context

When sending notifications, you need to provide context data.

### For Payment Receipt:
```javascript
{
  customer_name: "John Doe",
  project_name: "Nivara Heights",
  flat_number: "501",
  floor: 5,
  configuration: "3BHK",
  total_paid: 500000,
  balance_due: 1500000
}
```

### For Payment Reminder:
```javascript
{
  customer_name: "John Doe",
  project_name: "Nivara Heights",
  flat_number: "501",
  configuration: "3BHK"
}
```

Schedule object:
```javascript
{
  milestone: "Final Payment",
  amount_due: 750000,
  due_date: "2026-05-15"
}
```

## ✅ Testing

### Test Email Notification
```bash
curl -X POST http://localhost:5000/api/notifications/payment-receipt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "payment_id": 5,
    "channel": "email"
  }'
```

### Test WhatsApp Notification
```bash
curl -X POST http://localhost:5000/api/notifications/payment-receipt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "payment_id": 5,
    "channel": "whatsapp"
  }'
```

### Test Both
```bash
curl -X POST http://localhost:5000/api/notifications/payment-receipt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "payment_id": 5,
    "channel": "both"
  }'
```

## 🗄️ Database

Notifications are logged in the `notification_log` table:

```sql
CREATE TABLE notification_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT,
  notification_type VARCHAR(50),  -- payment_receipt, reminder, etc
  channel ENUM('email', 'whatsapp', 'sms'),
  recipient VARCHAR(255),          -- email or phone
  status ENUM('sent', 'failed', 'pending'),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

### View Sent Notifications
```sql
SELECT * FROM notification_log 
WHERE booking_id = 1 
ORDER BY sent_at DESC;
```

### Get Statistics
```sql
SELECT 
  channel,
  status,
  COUNT(*) as count,
  DATE(sent_at) as date
FROM notification_log
GROUP BY channel, status, date
ORDER BY date DESC;
```

## 🚨 Error Handling

### Common Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized (WATI) | Invalid token | Check WATI_API_TOKEN in .env |
| 400 Bad Request (Email) | Invalid recipient | Verify customer email in database |
| 429 Rate Limited | Too many requests | Implement queue, add delays |
| ECONNREFUSED (Email) | SMTP server unreachable | Check EMAIL_HOST and port |
| Invalid phone format | Wrong number format | Use formatPhone() utility |

### Retry Logic

The system automatically retries failed notifications with exponential backoff:
- 1st attempt: Immediate
- 2nd attempt: 2 seconds delay
- 3rd attempt: 4 seconds delay
- 4th attempt: 8 seconds delay

## 📊 Monitoring

### Check Notification Status
```javascript
GET /api/notifications/log?booking_id=1
```

### View Error Logs
```bash
tail -f logs/app.log | grep "notification"
```

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm start
```

## 🔐 Security Best Practices

1. **Never commit credentials** - Always use .env file
2. **Validate phone numbers** - Use formatPhone() helper
3. **Sanitize email addresses** - Check validity before sending
4. **Use HTTPS** - All API calls must be secure
5. **Rotate tokens** - Change WATI token every 90 days
6. **Log carefully** - Don't log customer PII
7. **Rate limit** - Prevent abuse/spam

## 📚 Documentation Files

- [WATI_SETUP.md](docs/WATI_SETUP.md) - Complete WATI guide
- [NOTIFICATION_GUIDE.md](docs/NOTIFICATION_GUIDE.md) - System architecture
- [NOTIFICATION_ADDITIONS.md](NOTIFICATION_ADDITIONS.md) - What's new summary
- [README.md](README.md) - Main project documentation

## 🎯 Next Steps

1. ✅ Review this file
2. ✅ Configure .env with credentials
3. ✅ Read WATI_SETUP.md for WhatsApp
4. ✅ Test email notification
5. ✅ Test WhatsApp notification
6. ✅ Set up scheduled jobs (optional)
7. ✅ Deploy to production
8. ✅ Monitor notification logs

## 💡 Usage Examples

### In payments.controller.js (Send after recording payment)
```javascript
const payment = await paymentsService.recordPayment(req.body);

try {
  await notificationsService.sendPaymentReceipt({
    booking_id: req.body.booking_id,
    payment_id: payment.id,
    channel: 'both'
  });
} catch (error) {
  logger.error('Notification failed:', error);
  // Continue even if notification fails
}
```

### In bookings.controller.js (Send after creating booking)
```javascript
const booking = await bookingsService.createBooking(req.body);

await notificationsService.sendBookingConfirmed({
  booking_id: booking.id,
  channel: 'whatsapp'
});
```

### Scheduled reminder job
```javascript
// runs daily at 9 AM
const reminders = await db.query(
  `SELECT * FROM payment_schedules 
   WHERE status = 'pending' 
   AND due_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY)`
);

for (const reminder of reminders) {
  await notificationsService.sendPaymentReminder({
    booking_id: reminder.booking_id,
    schedule_id: reminder.id,
    channel: 'both'
  });
}
```

## 📞 Support

For questions or issues:
1. Check relevant documentation file
2. Review test examples
3. Check logs for error details
4. Contact development team

---

**Ready to integrate?** Start with [WATI_SETUP.md](docs/WATI_SETUP.md) 🚀
