# WATI WhatsApp Integration Guide

WATI (WhatsApp API for Teams/Individuals) provides a seamless way to send and receive WhatsApp messages programmatically.

## 🚀 Getting Started with WATI

### Step 1: Create a WATI Account

1. Visit [https://www.wati.io](https://www.wati.io)
2. Sign up with your business email
3. Complete the verification process
4. Set up your WhatsApp Business Account

### Step 2: Get API Credentials

1. Log in to your WATI Dashboard
2. Navigate to **Settings** → **Integrations** → **API**
3. Copy your:
   - **API URL** (typically `https://api.wati.io`)
   - **API Token** (Bearer token for authentication)

### Step 3: Add WhatsApp Phone Number

1. Go to **Settings** → **Phone Numbers**
2. Add and verify your WhatsApp Business phone number
3. The phone number should be in format: **+91XXXXXXXXXX** (for India)

### Step 4: Configure Environment Variables

Add the following to your `.env` file:

```bash
# WATI Configuration
WATI_API_URL=https://api.wati.io
WATI_API_TOKEN=your_api_token_here
WATI_WHATSAPP_NUMBER=+91XXXXXXXXXX
```

## 📱 API Methods

### 1. Send Plain Text Message

Send a simple text message during the active chat window (24-hour window after customer message).

```javascript
const { sendMessage } = require('./providers/wati');

await sendMessage('919876543210', 'Hello! This is a test message');
```

**Parameters:**
- `phone` (string): Customer phone number (10 or 12 digits, country code optional)
- `message` (string): Message text

**Returns:**
- Message ID on success
- Throws error on failure

### 2. Send Template Message

Send a pre-approved template for notifications outside the 24-hour window.

```javascript
const { sendTemplate } = require('./providers/wati');

await sendTemplate('919876543210', 'payment_receipt', ['₹50000', '2026-04-15']);
```

**Parameters:**
- `phone` (string): Customer phone number
- `templateName` (string): Approved template name
- `parameters` (array): Template variables

**Returns:**
- Message ID on success

### 3. Get Message Status

Check the delivery and read status of a sent message.

```javascript
const { getMessageStatus } = require('./providers/wati');

const status = await getMessageStatus('message_id_123');
```

**Returns:**
```json
{
  "status": "sent",
  "deliveredAt": "2026-04-15T10:30:00Z",
  "readAt": "2026-04-15T10:31:00Z"
}
```

### 4. Get Contact Details

Retrieve contact information from WATI.

```javascript
const { getContact } = require('./providers/wati');

const contact = await getContact('919876543210');
```

**Returns:**
```json
{
  "phone": "919876543210",
  "name": "John Doe",
  "lastMessageAt": "2026-04-15T10:30:00Z",
  "tags": ["customer", "premium"]
}
```

## 🎯 Integration with Notifications Module

### Payment Receipt Notification

```javascript
const { sendMessage } = require('./providers/wati');
const { whatsapp } = require('./providers/notification.templates');

const ctx = {
  customer_name: 'John Doe',
  project_name: 'Nivara Heights',
  flat_number: '501',
  configuration: '3BHK',
  total_paid: 500000,
  balance_due: 1500000,
};

const payment = {
  amount: 250000,
  payment_mode: 'NEFT',
  payment_date: new Date(),
  reference_no: 'NEFT123456',
};

const message = whatsapp.paymentReceipt(ctx, payment);
await sendMessage(customerPhone, message);
```

### Payment Reminder

```javascript
const { sendMessage } = require('./providers/wati');
const { whatsapp } = require('./providers/notification.templates');

const schedule = {
  milestone: 'Final Payment',
  amount_due: 750000,
  due_date: '2026-05-15',
};

const message = whatsapp.paymentReminder(ctx, schedule);
await sendMessage(customerPhone, message);
```

## 📋 Approved Template Examples

Before sending template messages, you need to create and get approval for templates in WATI.

### Example Templates to Create:

1. **payment_receipt** - For payment confirmations
2. **payment_reminder** - For payment due notifications
3. **booking_confirmed** - For booking confirmations
4. **overdue_alert** - For overdue payment alerts

### Creating Templates:

1. Go to **Messages** → **Templates** in WATI Dashboard
2. Click **Create Template**
3. Select **Transactional** category
4. Add template content with variables (e.g., `{{1}}`, `{{2}}`)
5. Submit for approval (usually takes 24-48 hours)

## 🔄 Webhook Setup (For Incoming Messages)

To receive customer replies:

1. Go to **Settings** → **Webhooks**
2. Add your webhook URL: `https://yourdomain.com/api/notifications/webhook`
3. Subscribe to events: `message_received`, `message_status_changed`
4. Verify the webhook signature

**Webhook Handler Example:**

```javascript
app.post('/api/notifications/webhook', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'message_received') {
    const { phone, text, timestamp } = data;
    // Process incoming message
    logger.info(`Message from ${phone}: ${text}`);
  }
  
  res.json({ success: true });
});
```

## ⚠️ Important Notes

### Phone Number Format
WATI automatically handles phone number formatting. You can send:
- 10-digit number: `9876543210` → converts to `919876543210`
- 12-digit number: `919876543210` → uses as-is
- Full international: `+919876543210` → strips `+`

### Message Window (24-Hour Rule)
- **Within 24 hours of customer message**: Use `sendMessage()` (unlimited)
- **Outside 24-hour window**: Use `sendTemplate()` (pre-approved templates only)

### Rate Limiting
- WATI typically allows 100 messages/second
- Implement queue system for bulk notifications
- Add retry logic for failed messages

### Cost
- Template messages: Generally cheaper (₹0.5-2 per message)
- Session messages: More expensive (₹2-5 per message)
- Check current pricing in WATI dashboard

## 🛠️ Troubleshooting

### Common Errors

**401 Unauthorized**
- Check API token is correct
- Verify token hasn't expired
- Ensure token is passed in Authorization header

**400 Bad Request**
- Verify phone number format
- Check message text encoding (UTF-8)
- Ensure template variables match template definition

**429 Rate Limited**
- Implement exponential backoff
- Add message queue
- Contact WATI support for higher limits

### Testing

Use the provided test utility:

```bash
curl -X POST https://api.wati.io/api/v1/sendSessionMessage/919876543210 \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messageText":"Hello from WATI!"}'
```

## 📚 Resources

- [WATI API Documentation](https://docs.wati.io)
- [WhatsApp Business API Guide](https://www.whatsapp.com/business/api)
- [Message Templates Best Practices](https://docs.wati.io/templates)

## 🔐 Security Best Practices

1. **Never commit credentials** - Use `.env` file with `.gitignore`
2. **Rotate tokens regularly** - Change API tokens every 90 days
3. **Use HTTPS only** - Ensure all communications are encrypted
4. **Validate webhook signatures** - Verify incoming webhooks are from WATI
5. **Log sensitive data carefully** - Don't log customer phone numbers in plain text

## Support

For WATI-specific issues:
- Email: support@wati.io
- Dashboard Help: Built-in chat support
- Knowledge Base: docs.wati.io

For integration issues:
- Check logs in `logs/app.log`
- Enable DEBUG logging: `LOG_LEVEL=debug` in `.env`
- Contact development team
