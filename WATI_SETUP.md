# WATI WhatsApp API Integration Guide

WATI (WhatsApp Business API) integration for sending WhatsApp messages to customers.

## 📋 Overview

WATI provides a reliable WhatsApp Business API that allows sending both session messages and template-based messages for transactional alerts.

## 🔑 Getting WATI Credentials

### Step 1: Sign Up

1. Visit [WATI Dashboard](https://console.wati.io)
2. Create an account with your email
3. Verify your email address

### Step 2: Create a WhatsApp Business Account

1. Go to **Settings → WhatsApp Business Account**
2. Click **"Connect WhatsApp Business Account"**
3. Follow the WhatsApp verification process:
   - Provide business details
   - Verify business phone number
   - Complete KYC if required

### Step 3: Get API Credentials

1. Go to **Settings → API & Webhook**
2. Copy your **API Token** (Bearer Token)
3. Note your **API URL** (usually `https://live-server-xxxxx.wati.io`)

## ⚙️ Configuration

### 1. Update `.env` File

```env
# WATI Configuration
WATI_API_URL=https://live-server-xxxxx.wati.io
WATI_API_TOKEN=your_bearer_token_here
```

### 2. Verify Environment Variables

```bash
# Check if variables are loaded
node -e "console.log('WATI URL:', process.env.WATI_API_URL); console.log('WATI Token:', process.env.WATI_API_TOKEN ? '✓ Set' : '✗ Not set')"
```

## 🚀 Using WATI Provider

### Basic Usage

```javascript
const wati = require('./src/providers/wati');

// Send a simple text message
await wati.sendMessage('9876543210', 'Hello from Nivara!');

// Send a template message
await wati.sendTemplate('9876543210', 'PAYMENT_RECEIPT', ['INV123', '₹50000', 'Apartment 101']);
```

### Send Payment Receipt

```javascript
const { sendMessage } = require('./src/providers/wati');

await sendMessage(
  '9876543210',
  `Payment Confirmation ✓\n\nBooking ID: BK001\nAmount: ₹50,000\nRemaining: ₹2,50,000\n\nThank you!`
);
```

### Send Payment Reminder

```javascript
const templates = require('./src/providers/notification.templates');

const reminderText = templates.paymentReminder.whatsapp(
  'John Doe',
  '201',
  '2026-05-15',
  '₹25,000'
);

await sendMessage('9876543210', reminderText);
```

## 📨 Message Types

### Session Messages

**Use Case:** Customer initiated a conversation in the last 24 hours

```javascript
// Any message type, any format
await wati.sendMessage('9876543210', 'Your payment has been received!');
```

### Template Messages

**Use Case:** Outside 24-hour window or pre-approved templates

```javascript
// First, create template in WATI Dashboard
// Then use predefined parameters
await wati.sendTemplate(
  '9876543210',
  'PAYMENT_INVOICE',
  ['INV-2026-001', '₹100,000', 'Flat 301']
);
```

## 📝 Creating Templates in WATI

### Step 1: Access Template Builder

1. Go to **Messages → Templates**
2. Click **"Create Template"**

### Step 2: Configure Template

**Example: Payment Receipt Template**

```
Template Name: PAYMENT_RECEIPT
Category: TRANSACTIONAL
Language: English

Body:
Dear {{1}},

Your payment of {{2}} for {{3}} has been received.

Receipt Number: {{4}}
Remaining Balance: {{5}}

Thank you!
Nivara Ventures
```

### Step 3: Get Approval

- WATI reviews templates (usually 30 minutes - 2 hours)
- Status changes to "Approved" when ready
- Only approved templates can be sent

## ✅ Best Practices

### 1. Phone Number Formatting

The provider automatically handles formatting:
- ✅ `9876543210` → `919876543210`
- ✅ `919876543210` → `919876543210`
- ✅ `+919876543210` → `919876543210`
- ✅ `+1-234-567-8900` → `12345678900`

### 2. Message Content

- Keep messages concise (under 1024 characters)
- Use templates for formal notifications
- Use session messages for personalized follow-ups
- Include call-to-action buttons in templates

### 3. Rate Limiting

- WATI allows 10-100 messages per second (based on plan)
- Implement queue for bulk sends:

```javascript
const queue = [];
const BATCH_SIZE = 10;
const DELAY = 100; // ms between batches

async function sendBatch() {
  while (queue.length > 0) {
    const batch = queue.splice(0, BATCH_SIZE);
    await Promise.all(batch.map(msg => wati.sendMessage(msg.phone, msg.text)));
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }
}
```

### 4. Error Handling

```javascript
try {
  await wati.sendMessage('9876543210', 'Hello');
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Invalid token');
  } else if (error.response?.status === 400) {
    console.error('Invalid phone number or message');
  } else {
    console.error('Network error:', error.message);
  }
}
```

## 🧪 Testing

### Test Message Send

```bash
# Create test-wati.js
const wati = require('./src/providers/wati');

(async () => {
  try {
    const result = await wati.sendMessage('9876543210', 'Test message from WATI');
    console.log('✓ Message sent:', result);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
  process.exit();
})();

# Run
node test-wati.js
```

### Webhook Testing

WATI sends webhooks for:
- Message delivery (`WEBHOOK_MESSAGE_STATUS`)
- Message read (`WEBHOOK_MESSAGE_READ`)
- Incoming messages (`WEBHOOK_INCOMING_MESSAGE`)

Configure in WATI Dashboard → Settings → Webhooks

## 🔔 Integration with Notifications Module

### Send Payment Receipt Notification

```javascript
// In notifications.service.js
const { sendMessage } = require('../../providers/wati');
const templates = require('../../providers/notification.templates');

const sendPaymentReceiptWA = async (booking) => {
  const message = templates.paymentReceipt.whatsapp(
    booking.customer_name,
    booking.booking_id,
    booking.payment_amount,
    booking.remaining_balance
  );
  
  return await sendMessage(booking.customer_phone, message);
};
```

### Send Payment Reminder

```javascript
const sendPaymentReminderWA = async (schedule) => {
  const message = templates.paymentReminder.whatsapp(
    schedule.customer_name,
    schedule.flat_number,
    schedule.due_date,
    schedule.amount
  );
  
  return await sendMessage(schedule.customer_phone, message);
};
```

## 📊 Monitoring

### Check Message Status

```javascript
// WATI provides message IDs for tracking
const messageId = await wati.sendMessage('9876543210', 'Your message');

// Use messageId to query delivery status
// (Implement based on WATI webhook)
```

### View Analytics in Dashboard

1. Go to **Analytics → Messages**
2. Filter by date range
3. View delivery, read, and response rates

## 🐛 Troubleshooting

### "Invalid Token" Error

**Solution:**
```bash
# Verify token in WATI Dashboard
# Settings → API & Webhook → Copy fresh token
# Update .env file
# Restart application
npm run dev
```

### "Invalid Phone Number" Error

**Possible Causes:**
- Wrong country code
- Phone number too short/long
- Invalid format

**Solution:**
```javascript
// Ensure 10 or 12 digit format
const formatted = phone.replace(/\D/g, '');
console.log('Formatted:', formatted);
```

### "Rate Limit Exceeded"

**Solution:**
- Implement batch processing with delays
- Check WATI plan limits
- Upgrade plan if needed

### Messages Not Arriving

**Checklist:**
1. ✓ Token is valid
2. ✓ Phone number is correct and verified
3. ✓ Message is under 1024 characters
4. ✓ Account has sufficient credits
5. ✓ No template approval pending

## 💰 Pricing

WATI pricing is based on:
- Monthly contacts
- Message volume
- API features used

Check [WATI Pricing](https://www.wati.io/pricing) for current rates.

## 📚 Additional Resources

- [WATI Official Documentation](https://www.wati.io/documentation)
- [WATI API Reference](https://www.wati.io/api-documentation)
- [WhatsApp Business API Guidelines](https://developers.facebook.com/docs/whatsapp)
- [WATI Support](https://support.wati.io)

## 🚀 Quick Start

```bash
# 1. Sign up at WATI
# 2. Get API credentials
# 3. Update .env
WATI_API_URL=https://live-server-xxxxx.wati.io
WATI_API_TOKEN=your_token

# 4. Test integration
node test-wati.js

# 5. Integrate into notifications
# Update src/modules/notifications/notifications.service.js
```

---

**Last Updated:** April 15, 2026
**WATI API Version:** v1
**Status:** Production Ready
