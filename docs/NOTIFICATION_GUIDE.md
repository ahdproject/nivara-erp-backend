# Notification System Integration Guide

Complete guide for integrating email, WhatsApp, and SMS notifications in the Nivara ERP backend.

## 📋 Overview

The notification system supports:
- **Email** (Nodemailer via Gmail/custom SMTP)
- **WhatsApp** (WATI integration)
- **SMS** (Twilio - optional)
- **Multi-channel** sending (send to email AND WhatsApp simultaneously)

## 🏗️ Architecture

```
Request
  ↓
Validation (notification.validation.js)
  ↓
Controller (notifications.controller.js)
  ↓
Service (notifications.service.js)
  ↓
Providers (Email/WATI/Twilio)
  ↓
Database (notification_log table)
```

## 🔧 Configuration

### Email Setup (Nodemailer)

```bash
# .env file
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@nivaraventures.com
```

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the generated 16-character password

**For Custom SMTP:**
- Update `EMAIL_HOST` and `EMAIL_PORT` accordingly
- Ensure credentials are correct

### WhatsApp Setup (WATI)

See [WATI_SETUP.md](./WATI_SETUP.md) for detailed instructions.

```bash
# .env file
WATI_API_URL=https://api.wati.io
WATI_API_TOKEN=your_api_token
WATI_WHATSAPP_NUMBER=+91XXXXXXXXXX
```

## 📧 Email Notifications

### Send Payment Receipt

```javascript
POST /api/notifications/payment-receipt
{
  "booking_id": 1,
  "payment_id": 5,
  "channel": "email" // or "whatsapp", "both"
}
```

**Template Used:** `email.paymentReceipt()`

**Response:**
```json
{
  "success": true,
  "data": {
    "notification_id": 42,
    "channel": "email",
    "recipient": "customer@example.com",
    "status": "sent"
  }
}
```

### Send Payment Reminder

```javascript
POST /api/notifications/payment-reminder
{
  "booking_id": 1,
  "schedule_id": 3,
  "channel": "both" // Send to email and WhatsApp
}
```

**Template Used:** `email.paymentReminder()`

### Send Booking Confirmation

```javascript
POST /api/notifications/booking-confirmed
{
  "booking_id": 1,
  "channel": "email"
}
```

**Template Used:** `email.bookingConfirmed()`

## 💬 WhatsApp Notifications

### Send Payment Receipt via WhatsApp

```javascript
POST /api/notifications/payment-receipt
{
  "booking_id": 1,
  "payment_id": 5,
  "channel": "whatsapp"
}
```

**Template Used:** `whatsapp.paymentReceipt()`

**Message Format:**
```
Dear Customer Name,

✅ *Payment Received — Nivara Ventures*

Project  : Nivara Heights
Flat     : 501 (3BHK)
Amount   : ₹250,000
Mode     : NEFT
Date     : 15 Apr 2026

Total Paid    : ₹500,000
Balance Due   : ₹1,500,000

Thank you for your payment.
```

### Send Overdue Alert

```javascript
POST /api/notifications/overdue-alert
{
  "booking_id": 1,
  "channel": "both" // Send email + WhatsApp
}
```

**Template Used:** `whatsapp.overdueAlert()` and `email.overdueAlert()`

## 🎯 Use Cases & Examples

### 1. Payment Received Notification

**Trigger:** After payment is recorded

```javascript
// In payments.controller.js
const payment = await paymentsService.recordPayment(req.body);

// Send notification
await notificationsService.sendPaymentReceipt({
  booking_id: payment.booking_id,
  payment_id: payment.id,
  channel: 'both'
});
```

### 2. Payment Reminder (Automated)

**Trigger:** Scheduled job (2 days before due date)

```javascript
// In a scheduled job file
const overduingSchedules = await db.query(
  `SELECT * FROM payment_schedules 
   WHERE status = 'pending' 
   AND due_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY)`
);

for (const schedule of overduingSchedules) {
  await notificationsService.sendPaymentReminder({
    booking_id: schedule.booking_id,
    schedule_id: schedule.id,
    channel: 'both'
  });
}
```

### 3. Overdue Alert (Automated)

**Trigger:** Daily job for overdue payments

```javascript
// Scheduled job (runs daily at 9 AM)
const overdueSchedules = await db.query(
  `SELECT * FROM payment_schedules 
   WHERE status = 'pending' 
   AND due_date < CURDATE()`
);

for (const schedule of overdueSchedules) {
  await notificationsService.sendOverdueAlert({
    booking_id: schedule.booking_id,
    channel: 'email' // Use email for formal alerts
  });
}
```

## 📝 Template Context Objects

### Payment Receipt Context

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

### Payment Reminder Context

```javascript
{
  customer_name: "John Doe",
  project_name: "Nivara Heights",
  flat_number: "501",
  configuration: "3BHK",
  amount_due: 250000
}
```

### Schedule Object

```javascript
{
  milestone: "Final Payment",
  amount_due: 750000,
  due_date: "2026-05-15"
}
```

## 🔄 Notification Log

All sent notifications are logged in the `notification_log` table for audit and retry purposes.

```sql
SELECT * FROM notification_log 
WHERE booking_id = 1 
ORDER BY sent_at DESC;
```

### Status Values
- `sent` - Successfully delivered
- `failed` - Failed to send
- `pending` - Queued for sending
- `bounced` - Email bounced
- `replied` - Customer replied (WhatsApp)

## ❌ Error Handling

### Retry Logic

```javascript
// Automatic retry with exponential backoff
const maxRetries = 3;
let retryCount = 0;

async function sendWithRetry(notificationData) {
  try {
    return await notificationsService.send(notificationData);
  } catch (error) {
    if (retryCount < maxRetries) {
      retryCount++;
      const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      setTimeout(() => sendWithRetry(notificationData), delay);
    } else {
      logger.error('Max retries exceeded:', error);
      // Mark as failed in database
    }
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API credentials | Check .env file credentials |
| 429 Rate Limited | Too many requests | Implement queue system |
| 400 Bad Request | Invalid phone format | Use `formatPhone()` utility |
| ECONNREFUSED | Email service down | Check SMTP host/port |
| Invalid email | Wrong recipient | Verify customer email in DB |

## 🧪 Testing

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

### Test Both Channels

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

## 📊 Monitoring

### View Notification Log

```javascript
GET /api/notifications/log?booking_id=1
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
    },
    {
      "id": 43,
      "booking_id": 1,
      "notification_type": "payment_receipt",
      "channel": "whatsapp",
      "recipient": "+919876543210",
      "status": "sent",
      "sent_at": "2026-04-15T10:30:05Z"
    }
  ]
}
```

### Get Notification Statistics

```javascript
// Get sent vs failed counts
SELECT 
  channel,
  status,
  COUNT(*) as count,
  DATE(sent_at) as date
FROM notification_log
GROUP BY channel, status, date
ORDER BY date DESC;
```

## 🔐 Security

1. **Validate phone numbers** before sending WhatsApp
2. **Sanitize email addresses** before sending emails
3. **Never log sensitive data** (full phone numbers, personal info)
4. **Use HTTPS** for all API endpoints
5. **Implement rate limiting** to prevent abuse
6. **Rotate API tokens** regularly

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Email credentials configured in .env
- [ ] WATI API token configured
- [ ] Database notification_log table created
- [ ] Scheduled jobs configured for reminders/alerts
- [ ] Error logging and monitoring set up
- [ ] Notification templates tested
- [ ] Rate limiting implemented
- [ ] Backup plan for notification failures

### Monitoring & Alerts

Set up alerts for:
- Email send failures
- WhatsApp API errors
- High notification queue length
- Customer opt-out requests

## 📚 Additional Resources

- [Email Templates Best Practices](./EMAIL_TEMPLATES.md)
- [WATI Integration Guide](./WATI_SETUP.md)
- [Scheduled Jobs Setup](./SCHEDULED_JOBS.md)
- [SMS Integration (Twilio)](./SMS_SETUP.md)

---

**Version:** 1.0.0  
**Last Updated:** April 15, 2026  
**Status:** Production Ready
