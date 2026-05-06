// ─── Formatters ───────────────────────────────────────────────────────────────
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const date = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ══════════════════════════════════════════════════════════════
// WHATSAPP — Plain text, concise, works in any chat window
// ══════════════════════════════════════════════════════════════

const whatsapp = {

  paymentReceipt: (ctx, payment) =>
    `Dear ${ctx.customer_name},

✅ *Payment Received — Nivara Ventures*

Project  : ${ctx.project_name}
Flat     : ${ctx.flat_number} (${ctx.configuration})
Amount   : ${inr(payment.amount)}
Mode     : ${payment.payment_mode}
Date     : ${date(payment.payment_date)}
${payment.reference_no ? `Ref No   : ${payment.reference_no}\n` : ''}
Total Paid    : ${inr(ctx.total_paid)}
Balance Due   : ${inr(ctx.balance_due)}

Thank you for your payment. For any queries, please contact us.

*Nivara Ventures*`,

  paymentReminder: (ctx, schedule) =>
    `Dear ${ctx.customer_name},

🔔 *Payment Reminder — Nivara Ventures*

Project  : ${ctx.project_name}
Flat     : ${ctx.flat_number} (${ctx.configuration})
Milestone: ${schedule.milestone}
Due Date : ${date(schedule.due_date)}
Amount   : ${inr(schedule.amount_due)}

Kindly arrange the payment at your earliest convenience to avoid any delays.

For queries, reply to this message or call us.

*Nivara Ventures*`,

  bookingConfirmed: (ctx) =>
    `Dear ${ctx.customer_name},

🎉 *Booking Confirmed — Nivara Ventures*

Congratulations! Your flat has been successfully booked.

Project     : ${ctx.project_name}
Flat        : ${ctx.flat_number} — Floor ${ctx.floor} (${ctx.configuration})
Booking Date: ${date(ctx.booking_date)}
Agreement Value: ${inr(ctx.final_value)}

Our team will reach out shortly with next steps.

*Nivara Ventures*`,

  overdueAlert: (row) =>
    `Dear ${row.customer_name},

⚠️ *Overdue Payment Alert — Nivara Ventures*

Project  : ${row.project_name}
Flat     : ${row.flat_number}
Milestone: ${row.milestone}
Due Date : ${date(row.due_date)}
Overdue  : ${row.days_overdue} day(s)
Amount   : ${inr(row.amount_due)}

Please clear this payment immediately to avoid inconvenience.

*Nivara Ventures*`,
};

// ══════════════════════════════════════════════════════════════
// EMAIL — HTML, branded
// ══════════════════════════════════════════════════════════════

const baseStyle = `
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  color: #2d3748;
`;

const header = `
  <div style="background:#1a365d;padding:24px 32px;">
    <h2 style="color:#fff;margin:0;font-size:20px;">Nivara Ventures</h2>
    <p style="color:#a0aec0;margin:4px 0 0;font-size:13px;">Real Estate Development</p>
  </div>
`;

const footer = `
  <div style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="color:#718096;font-size:12px;margin:0;">
      This is an automated message from Nivara Ventures ERP.<br/>
      Please do not reply to this email. Contact us at <a href="mailto:info@nivaraventures.com" style="color:#1a365d;">info@nivaraventures.com</a>
    </p>
  </div>
`;

const row = (label, value) =>
  `<tr>
    <td style="padding:8px 0;color:#718096;font-size:14px;width:40%;">${label}</td>
    <td style="padding:8px 0;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;

const email = {

  paymentReceipt: (ctx, payment) => `
<div style="${baseStyle}">
  ${header}
  <div style="padding:32px;">
    <h3 style="color:#276749;margin-top:0;">✅ Payment Receipt</h3>
    <p style="color:#4a5568;">Dear ${ctx.customer_name},</p>
    <p style="color:#4a5568;">We have successfully received your payment. Below are the details:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${row('Project', ctx.project_name)}
      ${row('Flat', `${ctx.flat_number} — Floor ${ctx.floor} (${ctx.configuration})`)}
      ${row('Amount Received', `<span style="color:#276749;">${inr(payment.amount)}</span>`)}
      ${row('Payment Mode', payment.payment_mode)}
      ${row('Payment Date', date(payment.payment_date))}
      ${payment.reference_no ? row('Reference No', payment.reference_no) : ''}
      ${row('Total Paid to Date', inr(ctx.total_paid))}
      ${row('Balance Due', `<span style="color:#c53030;">${inr(ctx.balance_due)}</span>`)}
    </table>
    <p style="color:#4a5568;">Thank you for your timely payment.</p>
  </div>
  ${footer}
</div>`,

  paymentReminder: (ctx, schedule) => `
<div style="${baseStyle}">
  ${header}
  <div style="padding:32px;">
    <h3 style="color:#c05621;margin-top:0;">🔔 Payment Reminder</h3>
    <p style="color:#4a5568;">Dear ${ctx.customer_name},</p>
    <p style="color:#4a5568;">This is a gentle reminder for your upcoming payment:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${row('Project', ctx.project_name)}
      ${row('Flat', `${ctx.flat_number} (${ctx.configuration})`)}
      ${row('Milestone', schedule.milestone)}
      ${row('Due Date', date(schedule.due_date))}
      ${row('Amount Due', `<span style="color:#c05621;font-size:16px;">${inr(schedule.amount_due)}</span>`)}
    </table>
    <p style="color:#4a5568;">Please arrange the payment before the due date to ensure smooth processing.</p>
  </div>
  ${footer}
</div>`,

  bookingConfirmed: (ctx) => `
<div style="${baseStyle}">
  ${header}
  <div style="padding:32px;">
    <h3 style="color:#2b6cb0;margin-top:0;">🎉 Booking Confirmed</h3>
    <p style="color:#4a5568;">Dear ${ctx.customer_name},</p>
    <p style="color:#4a5568;">Congratulations! Your flat booking has been confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${row('Project', ctx.project_name)}
      ${row('Flat', `${ctx.flat_number} — Floor ${ctx.floor} (${ctx.configuration})`)}
      ${row('Booking Date', date(ctx.booking_date))}
      ${row('Agreement Value', inr(ctx.final_value))}
      ${row('Booking Status', ctx.booking_status)}
    </table>
    <p style="color:#4a5568;">Our team will contact you shortly to guide you through the next steps.</p>
  </div>
  ${footer}
</div>`,

  overdueAlert: (row_data) => `
<div style="${baseStyle}">
  ${header}
  <div style="padding:32px;">
    <h3 style="color:#c53030;margin-top:0;">⚠️ Overdue Payment Alert</h3>
    <p style="color:#4a5568;">Dear ${row_data.customer_name},</p>
    <p style="color:#4a5568;">Our records indicate that the following payment is overdue:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${row('Project', row_data.project_name)}
      ${row('Flat', row_data.flat_number)}
      ${row('Milestone', row_data.milestone)}
      ${row('Due Date', date(row_data.due_date))}
      ${row('Days Overdue', `<span style="color:#c53030;">${row_data.days_overdue} day(s)</span>`)}
      ${row('Amount Due', `<span style="color:#c53030;font-size:16px;">${inr(row_data.amount_due)}</span>`)}
    </table>
    <p style="color:#4a5568;">Please clear this amount immediately to avoid any inconvenience.</p>
  </div>
  ${footer}
</div>`,
};

module.exports = { whatsapp, email };
